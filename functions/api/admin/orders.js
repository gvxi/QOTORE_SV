// functions/api/admin/orders.js - Admin orders management API
export async function onRequestGet(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Admin orders API called');
    
    // Check authentication
    const request = context.request;
    const cookies = request.headers.get('Cookie') || '';
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('admin_session='));
    
    if (!sessionCookie) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required',
        redirectUrl: '/admin/login.html'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const { env } = context;
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({
        success: false,
        error: 'Database not configured for admin operations'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log('Fetching orders from Supabase...');

    // Fetch orders from database
    const ordersResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text();
      console.error('Orders fetch failed:', ordersResponse.status, errorText);
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch orders from database',
        details: `HTTP ${ordersResponse.status}: ${errorText}`
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const ordersData = await ordersResponse.json();
    console.log('Fetched orders:', ordersData.length);

    // If no orders, return empty success
    if (!ordersData || ordersData.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        data: [],
        count: 0,
        source: 'supabase',
        message: 'No orders found'
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Fetch order items for each order
    const orderIds = ordersData.map(o => o.id);
    console.log('Fetching order items for order IDs:', orderIds);

    const orderItemsResponse = await fetch(`${SUPABASE_URL}/rest/v1/order_items?select=*,variants(*)&order_id=in.(${orderIds.join(',')})`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    let orderItemsData = [];
    if (orderItemsResponse.ok) {
      orderItemsData = await orderItemsResponse.json();
      console.log('Fetched order items:', orderItemsData.length);
    } else {
      console.warn('Order items fetch failed, continuing without items');
    }

    // Get fragrance details for the items
    const variantIds = orderItemsData.map(item => item.variant_id).filter(Boolean);
    let fragrancesData = [];
    
    if (variantIds.length > 0) {
      const fragrancesResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?select=*,variants!inner(*)&variants.id=in.(${variantIds.join(',')})`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (fragrancesResponse.ok) {
        fragrancesData = await fragrancesResponse.json();
        console.log('Fetched fragrances for orders:', fragrancesData.length);
      }
    }

    // Combine orders with their items and fragrance details
    const orders = ordersData.map(order => {
      const orderItems = orderItemsData.filter(item => item.order_id === order.id);
      
      const items = orderItems.map(item => {
        // Find the fragrance that has this variant
        const fragrance = fragrancesData.find(f => 
          f.variants && f.variants.some(v => v.id === item.variant_id)
        );
        
        const variant = item.variants || {};
        
        return {
          id: item.id,
          fragrance: fragrance ? fragrance.name : 'Unknown Fragrance',
          brand: fragrance ? fragrance.brand : '',
          size: variant.is_whole_bottle ? 'Whole Bottle' : `${variant.size_ml}ml`,
          quantity: item.quantity,
          price: item.price_cents,
          total: item.price_cents * item.quantity
        };
      });

      return {
        id: order.id,
        customer: {
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone,
          address: order.delivery_address
        },
        items: items,
        subtotal: order.total_amount_cents,
        total: order.total_amount_cents,
        status: order.status,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        preferredTime: order.preferred_delivery_time,
        specialInstructions: order.special_instructions
      };
    });

    console.log(`Successfully processed ${orders.length} orders`);

    return new Response(JSON.stringify({
      success: true,
      data: orders,
      count: orders.length,
      source: 'supabase'
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    
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

// Update order status
export async function onRequestPatch(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Admin order status update called');
    
    // Check authentication
    const request = context.request;
    const cookies = request.headers.get('Cookie') || '';
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('admin_session='));
    
    if (!sessionCookie) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required',
        redirectUrl: '/admin/login.html'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Parse request body
    const body = await request.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return new Response(JSON.stringify({
        error: 'Order ID and status are required'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    if (!['pending', 'completed', 'canceled'].includes(status)) {
      return new Response(JSON.stringify({
        error: 'Invalid status. Must be: pending, completed, or canceled'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const { env } = context;
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({
        error: 'Database not configured for admin operations'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log(`Updating order ${orderId} status to ${status}`);

    // Update order status in database
    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        status: status,
        updated_at: new Date().toISOString()
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Order status update failed:', updateResponse.status, errorText);
      
      return new Response(JSON.stringify({
        error: 'Failed to update order status',
        details: `HTTP ${updateResponse.status}: ${errorText}`
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const updatedOrder = await updateResponse.json();
    console.log('Order status updated successfully:', updatedOrder);

    return new Response(JSON.stringify({
      success: true,
      message: `Order ${orderId} status updated to ${status}`,
      data: updatedOrder[0]
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    
    return new Response(JSON.stringify({
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
      'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}