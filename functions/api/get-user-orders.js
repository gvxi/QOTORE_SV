// functions/api/get-user-orders.js - Get and manage user's order history
export async function onRequest(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  };

  // Handle preflight OPTIONS request
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
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

    const method = context.request.method;
    
    if (method === 'GET') {
      return await handleGetOrders(context, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, corsHeaders);
    } else if (method === 'DELETE') {
      return await handleDeleteOrder(context, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, corsHeaders);
    } else {
      return new Response(JSON.stringify({
        error: 'Method not allowed',
        success: false
      }), {
        status: 405,
        headers: corsHeaders
      });
    }

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      success: false,
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle GET requests - Retrieve user orders
async function handleGetOrders(context, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, corsHeaders) {
  try {
    // Get query parameters
    const url = new URL(context.request.url);
    const userEmail = url.searchParams.get('email');
    const userId = url.searchParams.get('user_id');
    const statusFilter = url.searchParams.get('status') || 'all';
    const limit = parseInt(url.searchParams.get('limit')) || 50;

    if (!userEmail && !userId) {
      return new Response(JSON.stringify({
        error: 'Missing required parameter: email or user_id',
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Fetching orders for user:', userEmail || userId);

    // Build the query to get orders with order items
    let ordersQuery = `${SUPABASE_URL}/rest/v1/orders?select=*,order_items(*)`;
    
    // Add user filter (email-based approach for better user experience)
    if (userId && userEmail) {
      ordersQuery += `&or=(user_id.eq.${userId},customer_email.eq.${encodeURIComponent(userEmail)})`;
    } else if (userId) {
      ordersQuery += `&user_id=eq.${userId}`;
    } else if (userEmail) {
      ordersQuery += `&customer_email=eq.${encodeURIComponent(userEmail)}`;
    }
    
    // Add status filter if specified
    if (statusFilter !== 'all') {
      ordersQuery += `&status=eq.${statusFilter}`;
    }
    
    // Add ordering and limit
    ordersQuery += `&order=created_at.desc&limit=${limit}`;

    const ordersResponse = await fetch(ordersQuery, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text();
      console.error('Orders query failed:', errorText);
      return new Response(JSON.stringify({
        error: 'Failed to fetch orders from database',
        details: errorText,
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const orders = await ordersResponse.json();
    
    console.log(`Found ${orders.length} orders for user`);

    // Transform orders to include formatted data
    const transformedOrders = orders.map(order => ({
      ...order,
      // Add computed fields for frontend convenience
      formatted_total: (order.total_amount / 1000).toFixed(3), // Convert fils to OMR
      formatted_date: new Date(order.created_at).toISOString(),
      item_count: order.order_items?.length || 0,
      can_delete: ['pending', 'cancelled'].includes(order.status), // Only allow deletion of pending/cancelled orders
      // Ensure order_items is always an array
      order_items: order.order_items || []
    }));

    return new Response(JSON.stringify({
      success: true,
      data: transformedOrders,
      count: transformedOrders.length,
      source: 'user-orders-api',
      user_identifier: userEmail || userId,
      status_filter: statusFilter
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error in handleGetOrders:', error);
    return new Response(JSON.stringify({
      error: 'Failed to retrieve orders',
      success: false,
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle DELETE requests - Delete a specific order
async function handleDeleteOrder(context, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, corsHeaders) {
  try {
    const url = new URL(context.request.url);
    const orderId = url.searchParams.get('order_id');
    const userEmail = url.searchParams.get('email');
    const userId = url.searchParams.get('user_id');

    if (!orderId) {
      return new Response(JSON.stringify({
        error: 'Missing required parameter: order_id',
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    if (!userEmail && !userId) {
      return new Response(JSON.stringify({
        error: 'Missing required parameter: email or user_id for authorization',
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Attempting to delete order:', orderId, 'for user:', userEmail || userId);

    // First, verify the order belongs to the user and can be deleted
    const verifyQuery = `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=id,status,customer_email,user_id`;
    const verifyResponse = await fetch(verifyQuery, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      console.error('Order verification failed:', errorText);
      return new Response(JSON.stringify({
        error: 'Failed to verify order ownership',
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const orderData = await verifyResponse.json();
    
    if (!orderData || orderData.length === 0) {
      return new Response(JSON.stringify({
        error: 'Order not found',
        success: false
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const order = orderData[0];

    // Verify ownership
    const ownsOrder = (userId && order.user_id === userId) || 
                     (userEmail && order.customer_email === userEmail);
    
    if (!ownsOrder) {
      return new Response(JSON.stringify({
        error: 'Unauthorized: Order does not belong to this user',
        success: false
      }), {
        status: 403,
        headers: corsHeaders
      });
    }

    // Check if order can be deleted (only pending and cancelled orders)
    if (!['pending', 'cancelled'].includes(order.status)) {
      return new Response(JSON.stringify({
        error: `Cannot delete order with status: ${order.status}. Only pending and cancelled orders can be deleted.`,
        success: false,
        current_status: order.status
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Delete the order (order_items will be cascade deleted due to foreign key constraint)
    const deleteQuery = `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`;
    const deleteResponse = await fetch(deleteQuery, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error('Order deletion failed:', errorText);
      return new Response(JSON.stringify({
        error: 'Failed to delete order',
        details: errorText,
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log('Order deleted successfully:', orderId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Order deleted successfully',
      deleted_order_id: orderId,
      order_status: order.status
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error in handleDeleteOrder:', error);
    return new Response(JSON.stringify({
      error: 'Failed to delete order',
      success: false,
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}