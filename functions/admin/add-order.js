// functions/admin/add-order.js - Save customer orders
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
        required: ['customer.firstName', 'customer.phone', 'delivery.address', 'delivery.city', 'items', 'total']
      }), { status: 400, headers: corsHeaders });
    }

    // Defensive: filter out items with missing required fields
    const validItems = items.filter(item =>
      item.fragranceId !== undefined &&
      item.variantId !== undefined &&
      item.variantSize &&
      item.variantPrice !== undefined &&
      item.quantity > 0
    );
    if (validItems.length === 0) {
      return new Response(JSON.stringify({
        error: 'No valid items in order',
        details: items
      }), { status: 400, headers: corsHeaders });
    }

    console.log('Saving order to Supabase:', {
      customerName: `${customer.firstName} ${customer.lastName || ''}`.trim(),
      itemCount: items.length,
      total
    });

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
      total_amount: Math.round(total * 1000), // store in baisa (1 OMR = 1000 baisa)
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

    const createdOrder = await orderResponse.json(); // Supabase returns an array
    const orderId = createdOrder?.[0]?.id;
    const createdAt = createdOrder?.[0]?.created_at;
    if (!orderId) {
      console.error('Order created but no ID returned:', createdOrder);
      return new Response(JSON.stringify({ error: 'Order creation failed: missing ID' }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log('Created order with ID:', orderId);

    // Prepare order_items rows
    const nowIso = new Date().toISOString();
    const orderItemsPayload = validItems.map((item) => {
      const price = Number(item.variantPrice || 0);
      const qty = Number(item.quantity || 0);
      const perBaisa = Math.round(price * 1000);
      return {
        order_id: orderId,
        fragrance_id: item.fragranceId ?? null,
        variant_id: item.variantId ?? null,
        fragrance_name: item.fragranceName ?? '',
        fragrance_brand: item.fragranceBrand || '',
        variant_size: item.variantSize ?? '',
        variant_price_cents: perBaisa,
        quantity: qty,
        unit_price_cents: perBaisa,
        total_price_cents: Math.round(price * qty * 1000),
        is_whole_bottle: item.variantSize === 'Whole Bottle',
        created_at: nowIso
      };
    });

    console.log('Creating order items:', orderItemsPayload.length);

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

      // Best-effort cleanup of the orphan order
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          }
        });
      } catch (cleanupErr) {
        console.error('Cleanup (delete order) failed:', cleanupErr);
      }

      return new Response(JSON.stringify({
        error: 'Failed to save order items',
        details: `HTTP ${orderItemsResponse.status}: ${errorText}`
      }), { status: 500, headers: corsHeaders });
    }

    // Success
    return new Response(JSON.stringify({
      success: true,
      message: 'Order placed successfully!',
      data: {
        id: orderId,
        orderNumber: `ORD-${orderId}`,
        customer: `${customer.firstName} ${customer.lastName || ''}`.trim(),
        itemCount: items.length,
        total,
        status: 'pending',
        created_at: createdAt
      }
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Add order error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to place order',
      details: error.message
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

// Simple test endpoint
export async function onRequestGet(context) {
  return new Response(JSON.stringify({
    message: 'Add order endpoint is working!',
    method: 'POST /admin/add-order to place a new order',
    requiredFields: ['customer', 'delivery', 'items', 'total'],
    customerFields: ['firstName', 'lastName', 'phone', 'email'],
    deliveryFields: ['address', 'city', 'region'],
    supabaseConfig: {
      hasUrl: !!context.env.SUPABASE_URL,
      hasServiceKey: !!context.env.SUPABASE_SERVICE_ROLE_KEY
    },
    note: 'No authentication required for placing orders'
  }), { headers: { 'Content-Type': 'application/json' } });
}
