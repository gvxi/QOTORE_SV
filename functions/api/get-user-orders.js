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
    const url = new URL(context.request.url);
    const user_id = url.searchParams.get('user_id');
    const email = url.searchParams.get('email');
    const status = url.searchParams.get('status');
    
    if (!user_id || !email) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters: user_id and email',
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    console.log('Fetching orders for user:', user_id, 'email:', email);
    
    // Build query based on status filter
    let orderQuery = `${SUPABASE_URL}/rest/v1/orders?select=*&or=(user_id.eq.${user_id},customer_email.eq.${encodeURIComponent(email)})&order=created_at.desc`;
    
    // Add status filter
    if (status === 'active') {
      orderQuery += '&status=in.(pending,reviewed)';
    } else if (status && status !== 'all') {
      orderQuery += `&status=eq.${status}`;
    }
    
    console.log('Order query:', orderQuery);
    
    // Fetch orders
    const orderResponse = await fetch(orderQuery, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('Failed to fetch orders:', errorText);
      return new Response(JSON.stringify({
        error: 'Failed to fetch orders',
        details: errorText,
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const ordersData = await orderResponse.json();
    console.log('Found orders:', ordersData.length);

    if (ordersData.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        orders: [],
        message: 'No orders found'
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Get order IDs for fetching items
    const orderIds = ordersData.map(order => order.id);
    
    // Fetch order items for all orders
    const itemsQuery = `${SUPABASE_URL}/rest/v1/order_items?order_id=in.(${orderIds.join(',')})&select=*`;
    
    const itemsResponse = await fetch(itemsQuery, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    let orderItemsData = [];
    if (itemsResponse.ok) {
      orderItemsData = await itemsResponse.json();
      console.log('Fetched order items:', orderItemsData.length);
    } else {
      console.warn('Order items fetch failed, proceeding with empty items');
    }

    // Transform orders to include items and formatted data
    const ordersWithItems = ordersData.map(order => {
      // Get items for this order
      const orderItems = orderItemsData.filter(item => item.order_id === order.id);
      
      // Transform items to expected format
      const items = orderItems.map(item => ({
        id: item.id,
        fragrance_name: item.fragrance_name || 'Unknown Item',
        fragrance_brand: item.fragrance_brand || 'Unknown Brand',
        variant_size: item.variant_size || 'Unknown Size',
        quantity: item.quantity || 1,
        unit_price_cents: item.unit_price_cents || 0,
        total_price_cents: item.total_price_cents || 0,
        is_whole_bottle: item.is_whole_bottle || false
      }));
      
      // Add computed fields
      return {
        ...order,
        order_items: items,
        // Ensure order_number exists
        order_number: order.order_number || `ORD-${String(order.id).padStart(5, '0')}`,
        // Add formatted dates
        created_at_formatted: new Date(order.created_at).toLocaleDateString('en-GB'),
        created_at_time: new Date(order.created_at).toLocaleTimeString('en-GB'),
        // Add computed totals
        items_count: items.length,
        total_amount_omr: (order.total_amount / 1000).toFixed(3)
      };
    });

    return new Response(JSON.stringify({
      success: true,
      orders: ordersWithItems,
      total_count: ordersWithItems.length
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
    const order_id = url.searchParams.get('order_id');
    const user_id = url.searchParams.get('user_id');
    const email = url.searchParams.get('email');
    
    if (!order_id || !user_id || !email) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters: order_id, user_id, and email',
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    console.log('Deleting order:', order_id, 'for user:', user_id);
    
    // Step 1: Verify order ownership and get order details
    const orderQuery = `${SUPABASE_URL}/rest/v1/orders?id=eq.${order_id}&or=(user_id.eq.${user_id},customer_email.eq.${encodeURIComponent(email)})&select=*`;
    
    const checkResponse = await fetch(orderQuery, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      console.error('Failed to check order existence:', errorText);
      
      return new Response(JSON.stringify({
        error: 'Failed to verify order existence',
        details: errorText,
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const existingOrders = await checkResponse.json();
    if (existingOrders.length === 0) {
      return new Response(JSON.stringify({
        error: 'Order not found or you do not have permission to delete this order',
        success: false
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const order = existingOrders[0];
    const orderNumber = order.order_number || `ORD-${String(order.id).padStart(5, '0')}`;
    const customerName = `${order.customer_first_name} ${order.customer_last_name || ''}`.trim();
    
    console.log('Found order to delete:', orderNumber, 'Customer:', customerName, 'Status:', order.status);

    // Step 2: Check if order can be deleted (only completed or cancelled orders)
    if (!['completed', 'cancelled'].includes(order.status)) {
      return new Response(JSON.stringify({
        error: 'Only completed or cancelled orders can be deleted',
        success: false,
        current_status: order.status
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Step 3: Delete the order (order_items will be deleted automatically due to CASCADE)
    const deleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order_id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      }
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error('Failed to delete order:', errorText);
      
      return new Response(JSON.stringify({
        error: 'Failed to delete order',
        details: errorText,
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log('Successfully deleted order:', orderNumber);

    // Success response
    return new Response(JSON.stringify({ 
      success: true,
      message: `Order ${orderNumber} deleted successfully!`,
      data: {
        order_id: parseInt(order_id),
        order_number: orderNumber,
        customer_name: customerName,
        status: order.status,
        total_amount: order.total_amount,
        deleted_at: new Date().toISOString()
      }
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