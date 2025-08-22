// functions/api/place-order.js - Customer order placement API
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    const { env, request } = context;
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Database not configured'
      }), { status: 500, headers: corsHeaders });
    }

    const body = await request.json();
    const { customer, items, total } = body;

    if (!customer || !items || typeof total !== 'number') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing order data'
      }), { status: 400, headers: corsHeaders });
    }

    const customerFields = ['name', 'email', 'phone', 'address'];
    const missingCustomerFields = customerFields.filter(f => !customer[f]);
    if (missingCustomerFields.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required customer fields',
        missing: missingCustomerFields
      }), { status: 400, headers: corsHeaders });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Order must contain at least one item'
      }), { status: 400, headers: corsHeaders });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid email format'
      }), { status: 400, headers: corsHeaders });
    }

    const totalAmountCents = Math.round(total * 1000);
    const now = new Date().toISOString();

    const orderData = {
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      delivery_address: customer.address,
      preferred_delivery_time: customer.deliveryTime || null,
      special_instructions: customer.instructions || null,
      total_amount_cents: totalAmountCents,
      status: 'pending',
      created_at: now,
      updated_at: now
    };

    const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(orderData)
    });

    if (!orderRes.ok) {
      const errorText = await orderRes.text();
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create order',
        details: errorText
      }), { status: 500, headers: corsHeaders });
    }

    const [{ id: orderId }] = await orderRes.json();

    const orderItemsData = items.map(item => ({
      order_id: orderId,
      variant_id: item.variantId,
      quantity: item.quantity,
      price_cents: Math.round(item.variantPrice * 1000),
      created_at: now
    }));

    const itemsRes = await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(orderItemsData)
    });

    if (!itemsRes.ok) {
      const errorText = await itemsRes.text();
      await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create order items',
        details: errorText
      }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Order placed successfully!',
      orderId,
      total,
      itemCount: items.length,
      status: 'pending'
    }), { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('Error creating order:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message
    }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
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

export async function onRequestGet(context) {
  return new Response(JSON.stringify({
    message: 'Place Order API is working',
    hasUrl: !!context.env.SUPABASE_URL,
    hasServiceKey: !!context.env.SUPABASE_SERVICE_ROLE_KEY
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
