// functions/admin/add-order.js - Save customer orders with proper variant handling
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Add order request received');

    // Get Supabase credentials
    const { env } = context;
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({
        error: 'Database not configured for orders',
        debug: {
          hasUrl: !!SUPABASE_URL,
          hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY
        }
      }), { status: 500, headers: corsHeaders });
    }

    // Parse order data
    let orderData;
    try {
      const text = await context.request.text();
      if (!text || text.trim() === '') {
        return new Response(JSON.stringify({ error: 'No order data provided' }), {
          status: 400,
          headers: corsHeaders
        });
      }
      orderData = JSON.parse(text);
      console.log('Received order data:', JSON.stringify(orderData, null, 2));
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid order data format' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Validate required fields
    const { customer, delivery, items, total } = orderData;
    if (
      !customer || !customer.firstName || !customer.phone ||
      !delivery || !delivery.address || !delivery.city ||
      !items || !Array.isArray(items) || items.length === 0 ||
      typeof total !== 'number'
    ) {
      return new Response(JSON.stringify({
        error: 'Missing required order fields',
        required: ['customer.firstName', 'customer.phone', 'delivery.address', 'delivery.city', 'items', 'total'],
        received: {
          hasCustomer: !!customer,
          hasDelivery: !!delivery,
          itemsCount: Array.isArray(items) ? items.length : 0,
          totalType: typeof total
        }
      }), { status: 400, headers: corsHeaders });
    }

    // Validate and filter items
    const validItems = items.filter(item => {
      const hasRequiredFields = (
        typeof item.fragranceId === 'number' &&
        typeof item.variantId === 'number' &&
        item.variantSize &&
        typeof item.quantity === 'number' &&
        item.quantity > 0
      );
      
      if (!hasRequiredFields) {
        console.warn('Invalid item filtered out:', item);
      }
      
      return hasRequiredFields;
    });

    if (validItems.length === 0) {
      return new Response(JSON.stringify({
        error: 'No valid items in order',
        details: 'All items missing required fields (fragranceId, variantId, variantSize, quantity)',
        receivedItems: items
      }), { status: 400, headers: corsHeaders });
    }

    console.log(`Validated ${validItems.length} out of ${items.length} items`);

    // Verify that all variant IDs exist in the database
    const variantIds = [...new Set(validItems.map(item => item.variantId))];
    console.log('Checking variant IDs:', variantIds);

    const variantCheckResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/variants?id=in.(${variantIds.join(',')})&select=id,fragrance_id,size_ml,is_whole_bottle`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    if (!variantCheckResponse.ok) {
      const errorText = await variantCheckResponse.text();
      console.error('Variant validation failed:', errorText);
      return new Response(JSON.stringify({
        error: 'Failed to validate variants',
        details: errorText
      }), { status: 500, headers: corsHeaders });
    }

    const foundVariants = await variantCheckResponse.json();
    console.log('Found variants:', foundVariants);
    
    const foundVariantIds = foundVariants.map(v => v.id);
    const missingVariantIds = variantIds.filter(id => !foundVariantIds.includes(id));
    
    if (missingVariantIds.length > 0) {
      return new Response(JSON.stringify({
        error: 'Invalid variant(s) in order',
        details: { missingVariantIds, requestedIds: variantIds, foundIds: foundVariantIds }
      }), { status: 400, headers: corsHeaders });
    }

    console.log('All variants validated successfully');

    // Create order in orders table
    const orderPayload = {
      customer_first_name: customer.firstName.trim(),
      customer_last_name: customer.lastName?.trim() || '',
      customer_phone: customer.phone.trim(),
      customer_email: customer.email?.trim() || null,
      delivery_address: delivery.address.trim(),
      delivery_city: delivery.city.trim(),
      delivery_region: delivery.region?.trim() || null,
      notes: orderData.notes?.trim() || null,
      total_amount: Math.round(total * 1000), // Convert to baisa (fils)
      status: 'pending',
      created_at: new Date().toISOString()
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
        error: 'Failed to save order to database',
        details: `HTTP ${orderResponse.status}: ${errorText}`
      }), { status: 500, headers: corsHeaders });
    }

    const createdOrder = await orderResponse.json();
    const orderId = createdOrder?.[0]?.id;
    const createdAt = createdOrder?.[0]?.created_at;
    
    if (!orderId) {
      console.error('Order created but no ID returned:', createdOrder);
      return new Response(JSON.stringify({ 
        error: 'Order creation failed: missing ID',
        response: createdOrder 
      }), { status: 500, headers: corsHeaders });
    }

    console.log('Created order with ID:', orderId);

    // Create order items
    const nowIso = new Date().toISOString();
    const orderItemsPayload = validItems.map(item => {
      const variantPrice = item.isWholeBottle ? 0 : parseFloat(item.variantPrice || 0);
      const quantity = parseInt(item.quantity);
      const unitPriceCents = Math.round(variantPrice * 1000); // Convert to baisa
      const totalPriceCents = Math.round(variantPrice * quantity * 1000);

      return {
        order_id: orderId,
        fragrance_id: parseInt(item.fragranceId),
        variant_id: parseInt(item.variantId),
        fragrance_name: item.fragranceName || '',
        fragrance_brand: item.fragranceBrand || '',
        variant_size: String(item.variantSize),
        variant_price_cents: unitPriceCents,
        quantity: quantity,
        unit_price_cents: unitPriceCents,
        total_price_cents: totalPriceCents,
        is_whole_bottle: Boolean(item.isWholeBottle),
        created_at: nowIso
      };
    });

    console.log('Creating order items:', JSON.stringify(orderItemsPayload, null, 2));

    const orderItemsResponse = await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(orderItemsPayload)
    });

    if (!orderItemsResponse.ok) {
      const errorText = await orderItemsResponse.text();
      console.error('Failed to create order items:', errorText);

      // Try to parse error for better debugging
      let errorDetail = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson;
      } catch {
        // Keep original text if not JSON
      }

      // Clean up orphaned order
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          }
        });
        console.log('Cleaned up orphaned order:', orderId);
      } catch (cleanupError) {
        console.error('Failed to cleanup orphaned order:', cleanupError);
      }

      return new Response(JSON.stringify({
        error: 'Failed to save order items',
        details: errorDetail,
        orderData: orderItemsPayload // Include for debugging
      }), { status: 500, headers: corsHeaders });
    }

    const createdItems = await orderItemsResponse.json();
    console.log(`Successfully created ${createdItems.length} order items`);

    // Success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Order placed successfully!',
      data: {
        id: orderId,
        orderNumber: `ORD-${String(orderId).padStart(5, '0')}`,
        customer: `${customer.firstName} ${customer.lastName || ''}`.trim(),
        itemCount: validItems.length,
        total: total,
        status: 'pending',
        created_at: createdAt
      }
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Add order error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to place order',
      details: error.message,
      stack: error.stack
    }), { status: 500, headers: corsHeaders });
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

// Test endpoint
export async function onRequestGet(context) {
  return new Response(JSON.stringify({
    message: 'Add order endpoint is working!',
    method: 'POST /admin/add-order to place a new order',
    requiredFields: ['customer', 'delivery', 'items', 'total'],
    customerFields: ['firstName', 'lastName', 'phone', 'email'],
    deliveryFields: ['address', 'city', 'region'],
    itemFields: ['fragranceId (number)', 'variantId (number)', 'fragranceName', 'variantSize', 'variantPrice (number)', 'quantity (number)', 'isWholeBottle (boolean)'],
    supabaseConfig: {
      hasUrl: !!context.env.SUPABASE_URL,
      hasServiceKey: !!context.env.SUPABASE_SERVICE_ROLE_KEY
    },
    note: 'No authentication required for placing orders'
  }), { headers: { 'Content-Type': 'application/json' } });
}