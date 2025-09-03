// functions/admin/place-order.js - Place new order (moved to admin path for env vars)
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Place order request received');

    // Get Supabase credentials from admin path
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
      if (!text || text.trim() === '') {
        return new Response(JSON.stringify({ 
          error: 'No order data provided',
          success: false
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      orderData = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid order data format',
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Validate required fields
    const requiredFields = [
      'customer_ip', 'customer_first_name', 'customer_phone', 
      'delivery_address', 'delivery_city', 'items'
    ];
    
    for (const field of requiredFields) {
      if (!orderData[field]) {
        return new Response(JSON.stringify({
          error: `Missing required field: ${field}`,
          success: false
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
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

    console.log('Placing order for IP:', orderData.customer_ip);

    // Step 1: Check if customer already has an active order
    const activeOrderCheck = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?customer_ip=eq.${orderData.customer_ip}&status=in.(pending,reviewed)&select=id,order_number,status&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    if (activeOrderCheck.ok) {
      const existingOrders = await activeOrderCheck.json();
      if (existingOrders.length > 0) {
        return new Response(JSON.stringify({
          error: 'You already have an active order. Please complete or cancel it before placing a new order.',
          existing_order: existingOrders[0].order_number,
          success: false
        }), {
          status: 409, // Conflict
          headers: corsHeaders
        });
      }
    }

    // Step 2: Fetch variant details and calculate totals
    const variantIds = orderData.items.map(item => item.variant_id);
    const variantsQuery = `${SUPABASE_URL}/rest/v1/variants?id=in.(${variantIds.join(',')})&select=*,fragrances(name,brand)`;
    
    const variantsResponse = await fetch(variantsQuery, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!variantsResponse.ok) {
      const errorText = await variantsResponse.text();
      console.error('Failed to fetch variants:', errorText);
      return new Response(JSON.stringify({
        error: 'Failed to validate order items',
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const variants = await variantsResponse.json();
    
    // Validate all variants exist and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of orderData.items) {
      const variant = variants.find(v => v.id === item.variant_id);
      
      if (!variant) {
        console.error('Variant not found:', item.variant_id, 'Available variants:', variants.map(v => v.id));
        return new Response(JSON.stringify({
          error: `Invalid variant ID: ${item.variant_id}. This variant may have been removed or doesn't exist.`,
          available_variants: variants.map(v => ({ id: v.id, size: `${v.size_ml}ml`, fragrance: v.fragrances?.name })),
          success: false
        }), {
          status: 400,
          headers: corsHeaders
        });
      }

      if (variant.is_whole_bottle) {
        return new Response(JSON.stringify({
          error: 'Whole bottle variants cannot be ordered online. Please contact us directly.',
          success: false
        }), {
          status: 400,
          headers: corsHeaders
        });
      }

      if (!variant.in_stock) {
        return new Response(JSON.stringify({
          error: `Item is out of stock: ${variant.fragrances?.name} ${variant.size_ml}ml`,
          success: false
        }), {
          status: 400,
          headers: corsHeaders
        });
      }

      // Validate quantity
      const quantity = parseInt(item.quantity);
      if (quantity < 1 || quantity > (variant.max_quantity || 50)) {
        return new Response(JSON.stringify({
          error: `Invalid quantity for ${variant.fragrances?.name}: must be between 1 and ${variant.max_quantity || 50}`,
          success: false
        }), {
          status: 400,
          headers: corsHeaders
        });
      }

      const itemTotal = variant.price_cents * quantity;
      totalAmount += itemTotal;

      orderItems.push({
        fragrance_id: variant.fragrance_id,
        variant_id: variant.id,
        fragrance_name: variant.fragrances?.name || 'Unknown',
        fragrance_brand: variant.fragrances?.brand || '',
        variant_size: `${variant.size_ml}ml`,
        variant_price_cents: variant.price_cents,
        quantity: quantity,
        unit_price_cents: variant.price_cents,
        total_price_cents: itemTotal,
        is_whole_bottle: false
      });
    }

    // Step 3: Create order record
    const newOrder = {
      customer_ip: orderData.customer_ip,
      customer_first_name: orderData.customer_first_name,
      customer_last_name: orderData.customer_last_name || '',
      customer_phone: orderData.customer_phone,
      customer_email: orderData.customer_email || '',
      delivery_address: orderData.delivery_address,
      delivery_city: orderData.delivery_city,
      delivery_region: orderData.delivery_region || '',
      notes: orderData.notes || '',
      total_amount: totalAmount,
      status: 'pending',
      reviewed: false
      // review_deadline will be set by database trigger
    };

    console.log('Creating order with total:', totalAmount, 'fils');

    const orderResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(newOrder)
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

    console.log('Order created with ID:', createdOrder.id);

    // Step 4: Create order items
    const itemsWithOrderId = orderItems.map(item => ({
      ...item,
      order_id: createdOrder.id
    }));

    const itemsResponse = await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(itemsWithOrderId)
    });

    if (!itemsResponse.ok) {
      const errorText = await itemsResponse.text();
      console.error('Failed to create order items:', errorText);
      
      // Rollback: delete the order
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

    const createdItems = await itemsResponse.json();
    
    console.log(`✅ Order ${createdOrder.order_number} placed successfully with ${createdItems.length} items`);

    // Success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Order placed successfully!',
      data: {
        order_id: createdOrder.id,
        order_number: createdOrder.order_number,
        total_amount: totalAmount,
        total_amount_omr: (totalAmount / 1000).toFixed(3),
        status: createdOrder.status,
        reviewed: createdOrder.reviewed,
        review_deadline: createdOrder.review_deadline,
        created_at: createdOrder.created_at,
        items_count: createdItems.length
      }
    }), {
      status: 201,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Place order error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to place order: ' + error.message,
      success: false
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}