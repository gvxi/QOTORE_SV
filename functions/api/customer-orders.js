// functions/api/customer-orders.js - Get customer order history
export async function onRequestGet(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    // Get customer IP from query parameters
    const url = new URL(context.request.url);
    const customerIP = url.searchParams.get('ip');
    const customerPhone = url.searchParams.get('phone'); // Optional
    const limit = url.searchParams.get('limit') || '10';

    if (!customerIP) {
      return new Response(JSON.stringify({
        error: 'Missing required parameter: ip',
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

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

    console.log('Fetching order history for IP:', customerIP);

    // First try the customer_order_status view
    let query = `${SUPABASE_URL}/rest/v1/customer_order_status?customer_ip=eq.${customerIP}&order=created_at.desc&limit=${limit}`;
    
    // Add phone filter if provided
    if (customerPhone) {
      query += `&customer_phone=eq.${customerPhone}`;
    }

    let response = await fetch(query, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    // If view doesn't exist, fallback to direct orders table query
    if (!response.ok) {
      console.log('customer_order_status view not available, using orders table directly');
      
      let fallbackQuery = `${SUPABASE_URL}/rest/v1/orders?customer_ip=eq.${customerIP}&order=created_at.desc&limit=${limit}`;
      if (customerPhone) {
        fallbackQuery += `&customer_phone=eq.${customerPhone}`;
      }
      
      response = await fetch(fallbackQuery, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fallback query also failed:', errorText);
        return new Response(JSON.stringify({
          error: 'Database query failed',
          details: errorText,
          success: false
        }), {
          status: 500,
          headers: corsHeaders
        });
      }
      
      const orders = await response.json();
      
      // Transform basic orders data
      const transformedOrders = orders.map(order => ({
        id: order.id,
        order_number: order.order_number || `ORD-${String(order.id).padStart(5, '0')}`,
        status: order.status,
        status_display: getStatusDisplay(order.status, order.reviewed),
        total_amount: order.total_amount,
        created_at: order.created_at,
        can_cancel: order.status === 'pending' && !order.reviewed && 
                   (!order.review_deadline || new Date() < new Date(order.review_deadline)),
        reviewed: order.reviewed,
        review_deadline: order.review_deadline
      }));
      
      return new Response(JSON.stringify({
        success: true,
        orders: transformedOrders,
        count: transformedOrders.length,
        customer_ip: customerIP,
        source: 'orders_table'
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    const orders = await response.json();
    
    console.log(`Found ${orders.length} orders for customer IP: ${customerIP}`);

    // Transform orders for frontend (from view)
    const transformedOrders = orders.map(order => ({
      id: order.id,
      order_number: order.order_number || `ORD-${String(order.id).padStart(5, '0')}`,
      status: order.status,
      status_display: order.status_display,
      total_amount: order.total_amount,
      created_at: order.created_at,
      can_cancel: order.can_cancel,
      reviewed: order.reviewed,
      review_deadline: order.review_deadline
    }));

    return new Response(JSON.stringify({
      success: true,
      orders: transformedOrders,
      count: transformedOrders.length,
      customer_ip: customerIP,
      source: 'customer_order_status_view'
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Customer orders error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch customer orders: ' + error.message,
      success: false
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Helper function to get status display
function getStatusDisplay(status, reviewed) {
  if (status === 'pending' && !reviewed) {
    return 'Waiting for review';
  } else if (status === 'reviewed') {
    return 'Under preparation';
  } else if (status === 'completed') {
    return 'Order completed';
  } else if (status === 'cancelled') {
    return 'Order cancelled';
  }
  return status;
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}