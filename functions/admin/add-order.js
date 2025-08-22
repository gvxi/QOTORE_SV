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
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    
    // Parse order data
    let orderData;
    try {
      const text = await context.request.text();
      if (!text || text.trim() === '') {
        return new Response(JSON.stringify({ 
          error: 'No order data provided' 
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      orderData = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid order data format' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Validate required fields
    const { customer, delivery, items, total } = orderData;
    
    if (!customer || !customer.firstName || !customer.phone || 
        !delivery || !delivery.address || !delivery.city ||
        !items || !Array.isArray(items) || items.length === 0 ||
        typeof total !== 'number') {
      return new Response(JSON.stringify({ 
        error: 'Missing required order fields',
        required: ['customer.firstName', 'customer.phone', 'delivery.address', 'delivery.city', 'items', 'total']
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Saving order to Supabase:', { customerName: `${customer.firstName} ${customer.lastName}`, itemCount: items.length, total });

    // Prepare order payload for database
    const orderPayload = {
      customer_first_name: customer.firstName.trim(),
      customer_last_name: customer.lastName?.trim() || '',
      customer_phone: customer.phone.trim(),
      customer_email: customer.email?.trim() || null,
      delivery_address: delivery.address.trim(),
      delivery_city: delivery.city.trim(),
      delivery_region: delivery.region?.trim() || null,
      notes: orderData.notes?.trim() || null,
      items: JSON.stringify(items), // Store items as JSON
      total_amount: Math.round(total * 1000), // Convert to fils (smallest currency unit)
      status: 'pending',
      created_at: new Date().toISOString()
    };

    console.log('Creating order with payload:', orderPayload);

    // Save order to database
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
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const createdOrder = await orderResponse.json();
    const orderId = createdOrder[0].id;
    console.log('Created order with ID:', orderId);

    // Success response
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Order placed successfully!',
      data: {
        id: orderId,
        orderNumber: `ORD-${orderId}`,
        customer: `${customer.firstName} ${customer.lastName}`,
        itemCount: items.length,
        total: total,
        status: 'pending',
        created_at: createdOrder[0].created_at
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Add order error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to place order',
      details: error.message
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

// Test endpoint
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
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}