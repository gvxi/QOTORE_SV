// functions/api/place-order.js - Place new order with customer_sessions integration
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Place order request received');

    // Get Supabase credentials
    const { env } = context;
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({
        error: 'Database not configured',
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    
    // Parse request data
    let orderData;
    try {
      const text = await context.request.text();
      orderData = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({
        error: 'Invalid request data format',
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Validate required fields
    const required = ['customer_ip', 'customer_first_name', 'customer_phone', 'delivery_city', 'delivery_region', 'total_amount', 'items'];
    const missing = required.filter(field => !orderData[field]);
    
    if (missing.length > 0) {
      return new Response(JSON.stringify({
        error: `Missing required fields: ${missing.join(', ')}`,
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      return new Response(JSON.stringify({
        error: 'Order must contain at least one item',
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    console.log('Creating order for customer:', orderData.customer_ip);
    
    // Step 1: Check if customer already has an active order
    const activeOrderCheck = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?customer_ip=eq.${orderData.customer_ip}&status=in.(pending,reviewed)&select=id,order_number,status`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );
    
    if (activeOrderCheck.ok) {
      const activeOrders = await activeOrderCheck.json();
      if (activeOrders.length > 0) {
        return new Response(JSON.stringify({
          error: 'You already have an active order. Please complete or cancel it before placing a new order.',
          active_order: activeOrders[0],
          success: false
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
    }
    
    // Step 2: Create the order
    const now = new Date().toISOString();
    const reviewDeadline = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
    
    const orderPayload = {
      customer_ip: orderData.customer_ip,
      customer_first_name: orderData.customer_first_name,
      customer_last_name: orderData.customer_last_name || '',
      customer_phone: orderData.customer_phone,
      customer_email: orderData.customer_email || null,
      delivery_address: orderData.delivery_address,
      delivery_city: orderData.delivery_city,
      delivery_region: orderData.delivery_region,
      notes: orderData.notes || null,
      total_amount: orderData.total_amount,
      status: 'pending',
      reviewed: false,
      review_deadline: reviewDeadline,
      created_at: now,
      updated_at: now
    };
    
    console.log('Creating order with payload:', orderPayload);
    
    const orderResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(orderPayload)
    });
    
    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('Failed to create order:', errorText);
      return new Response(JSON.stringify({
        error: 'Failed to create order',
        details: errorText,
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    
    const createdOrders = await orderResponse.json();
    const createdOrder = createdOrders[0];
    console.log('Order created:', createdOrder.id);
    
    // Step 3: Create order items
    const orderItems = orderData.items.map(item => ({
      order_id: createdOrder.id,
      fragrance_id: item.fragrance_id,
      variant_id: item.variant_id,
      fragrance_name: item.fragrance_name,
      fragrance_brand: item.fragrance_brand || null,
      variant_size: item.variant_size,
      variant_price_cents: item.variant_price_cents,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      total_price_cents: item.total_price_cents,
      is_whole_bottle: item.is_whole_bottle || false,
      created_at: now
    }));
    
    console.log('Creating order items:', orderItems.length);
    
    const itemsResponse = await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify(orderItems)
    });
    
    if (!itemsResponse.ok) {
      const errorText = await itemsResponse.text();
      console.error('Failed to create order items:', errorText);
      
      // Try to clean up the order since items failed
      await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${createdOrder.id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      
      return new Response(JSON.stringify({
        error: 'Failed to create order items',
        details: errorText,
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    
    // Step 4: Update or create customer session
    const sessionPayload = {
      customer_ip: orderData.customer_ip,
      customer_phone: orderData.customer_phone,
      customer_email: orderData.customer_email || null,
      active_order_id: createdOrder.id,
      last_order_at: now,
      updated_at: now
    };
    
    // Try to update existing session first
    const updateSessionResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/customer_sessions?customer_ip=eq.${orderData.customer_ip}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(sessionPayload)
      }
    );
    
    if (!updateSessionResponse.ok || (await updateSessionResponse.clone().json()).length === 0) {
      // Create new session if update failed or no existing session
      sessionPayload.created_at = now;
      await fetch(`${SUPABASE_URL}/rest/v1/customer_sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify(sessionPayload)
      });
    }
    
    console.log('Customer session updated/created');
    
    // Step 5: Send admin notification
    try {
      const notificationResponse = await fetch(`${context.request.url.split('/api')[0]}/api/send-admin-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'new_order',
          order: {
            id: createdOrder.id,
            order_number: orderNumber,
            customer_name: `${orderData.customer_first_name} ${orderData.customer_last_name || ''}`.trim(),
            customer_phone: orderData.customer_phone,
            customer_email: orderData.customer_email,
            total_amount: orderData.total_amount,
            items: orderData.items
          }
        })
      });
      
      if (notificationResponse.ok) {
        console.log('Admin notification sent successfully');
      } else {
        console.warn('Failed to send admin notification');
      }
    } catch (notificationError) {
      console.warn('Error sending admin notification:', notificationError);
      // Don't fail the order if notification fails
    }
    
    // Step 6: Return success response
    return new Response(JSON.stringify({
      success: true,
      order: {
        id: createdOrder.id,
        order_number: createdOrder.order_number || `ORD-${String(createdOrder.id).padStart(5, '0')}`,
        status: 'pending',
        total_amount: orderData.total_amount,
        created_at: createdOrder.created_at,
        review_deadline: reviewDeadline
      },
      message: 'Order placed successfully! You will receive admin notification soon.'
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Error placing order:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error while placing order',
      details: error.message,
      success: false
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle OPTIONS requests for CORS
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}