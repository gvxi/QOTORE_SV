// functions/api/place-order.js - Customer order placement API
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    console.log('Place order API called');
    
    const { env } = context;
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({
        success: false,
        error: 'Database not configured',
        debug: {
          hasUrl: !!SUPABASE_URL,
          hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY
        }
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // Parse request body
    const body = await context.request.json();
    console.log('Order data received:', body);

    // Validate required fields
    const requiredFields = ['customer', 'items', 'total'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingCustomerFields.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required customer fields',
        missing: missingCustomerFields
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Order must contain at least one item'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid email format'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Creating order in database...');

    // Calculate total amount in cents
    const totalAmountCents = Math.round(total * 1000); // Convert OMR to fils

    // Create order record
    const orderData = {
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      delivery_address: customer.address,
      preferred_delivery_time: customer.preferredTime || null,
      special_instructions: customer.specialInstructions || null,
      total_amount_cents: totalAmountCents,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Order data to insert:', orderData);

    const createOrderResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(orderData)
    });

    if (!createOrderResponse.ok) {
      const errorText = await createOrderResponse.text();
      console.error('Failed to create order:', createOrderResponse.status, errorText);
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create order',
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const createdOrder = await createOrderResponse.json();
    const orderId = createdOrder[0].id;
    console.log('Created order with ID:', orderId);

    // Create order items
    const orderItemsData = items.map(item => ({
      order_id: orderId,
      variant_id: item.variantId,
      quantity: item.quantity,
      price_cents: Math.round(item.price * 1000), // Convert OMR to fils
      created_at: new Date().toISOString()
    }));

    console.log('Order items to insert:', orderItemsData);

    const createItemsResponse = await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(orderItemsData)
    });

    if (!createItemsResponse.ok) {
      const errorText = await createItemsResponse.text();
      console.error('Failed to create order items:', createItemsResponse.status, errorText);
      
      // Try to delete the order since items failed
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
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const createdItems = await createItemsResponse.json();
    console.log('Created order items:', createdItems.length);

    // Return success response
    const response = {
      success: true,
      message: 'Order placed successfully!',
      orderId: orderId,
      orderNumber: `ORD${orderId.toString().padStart(6, '0')}`,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone
      },
      total: total,
      itemCount: items.length,
      status: 'pending',
      estimatedDelivery: '24-48 hours'
    };

    console.log('Order created successfully:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error creating order:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
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
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Test endpoint
export async function onRequestGet(context) {
  return new Response(JSON.stringify({
    message: 'Place Order API is working!',
    endpoint: 'POST /api/place-order',
    requiredFields: {
      customer: ['name', 'email', 'phone', 'address'],
      items: ['variantId', 'quantity', 'price'],
      total: 'number (in OMR)'
    },
    optionalFields: {
      customer: ['preferredTime', 'specialInstructions']
    },
    example: {
      customer: {
        name: 'Ahmed Al-Rashid',
        email: 'ahmed@example.com',
        phone: '+968 9123 4567',
        address: 'Muscat, Oman',
        preferredTime: 'Evening (6 PM - 9 PM)',
        specialInstructions: 'Please call before delivery'
      },
      items: [
        {
          variantId: 1,
          quantity: 1,
          price: 25.000
        }
      ],
      total: 25.000
    },
    supabaseConfig: {
      hasUrl: !!context.env.SUPABASE_URL,
      hasServiceKey: !!context.env.SUPABASE_SERVICE_ROLE_KEY
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

    // Validate customer data
    const { customer, items, total } = body;
    const customerFields = ['name', 'email', 'phone', 'address'];
    const missingCustomerFields = customerFields.filter(field => !customer[field]);
    
    if (missingCustomerFields.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required customer fields',
        missing: missingCustomerFields
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Order must contain at least one item'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid email format'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Creating order in database...');

    // Calculate total amount in cents
    const totalAmountCents = Math.round(total * 1000); // Convert OMR to fils

    // Create order record
    const orderData = {
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      delivery_address: customer.address,
      preferred_delivery_time: customer.preferredTime || null,
      special_instructions: customer.specialInstructions || null,
      total_amount_cents: totalAmountCents,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Order data to insert:', orderData);

    const createOrderResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(orderData)
    });

    if (!createOrderResponse.ok) {
      const errorText = await createOrderResponse.text();
      console.error('Failed to create order:', createOrderResponse.status, errorText);
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create order',
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const createdOrder = await createOrderResponse.json();
    const orderId = createdOrder[0].id;
    console.log('Created order with ID:', orderId);

    // Create order items
    const orderItemsData = items.map(item => ({
      order_id: orderId,
      variant_id: item.variantId,
      quantity: item.quantity,
      price_cents: Math.round(item.price * 1000), // Convert OMR to fils
      created_at: new Date().toISOString()
    }));

    console.log('Order items to insert:', orderItemsData);

    const createItemsResponse = await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(orderItemsData)
    });

    if (!createItemsResponse.ok) {
      const errorText = await createItemsResponse.text();
      console.error('Failed to create order items:', createItemsResponse.status, errorText);
      
      // Try to delete the order since items failed
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
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const createdItems = await createItemsResponse.json();
    console.log('Created order items:', createdItems.length);

    // Return success response
    const response = {
      success: true,
      message: 'Order placed successfully!',
      orderId: orderId,
      orderNumber: `ORD${orderId.toString().padStart(6, '0')}`,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone
      },
      total: total,
      itemCount: items.length,
      status: 'pending',
      estimatedDelivery: '24-48 hours'
    };

    console.log('Order created successfully:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: corsHeaders
    })}
