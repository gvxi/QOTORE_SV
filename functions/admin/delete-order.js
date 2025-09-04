// functions/admin/delete-order.js
export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };

  try {
    // Get environment variables
    const { env } = context;
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing required environment variables');
      return new Response(JSON.stringify({
        error: 'Server configuration error',
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // Check authentication
    const cookies = context.request.headers.get('Cookie') || '';
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('admin_session='));

    if (!sessionCookie) {
      return new Response(JSON.stringify({
        error: 'Authentication required',
        success: false
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Parse request body
    const body = await context.request.json();
    const { id } = body;

    if (!id || isNaN(parseInt(id))) {
      return new Response(JSON.stringify({
        error: 'Valid order ID is required',
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log(`🗑️ Attempting to delete order ID: ${id}`);

    // Step 1: Get order details before deleting (for confirmation message)
    const getOrderQuery = `${SUPABASE_URL}/rest/v1/orders?id=eq.${id}&select=*`;
    
    const getOrderResponse = await fetch(getOrderQuery, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!getOrderResponse.ok) {
      const errorText = await getOrderResponse.text();
      console.error('Failed to get order details:', errorText);
      
      return new Response(JSON.stringify({
        error: 'Failed to retrieve order details',
        details: errorText,
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const orders = await getOrderResponse.json();
    if (orders.length === 0) {
      return new Response(JSON.stringify({
        error: 'Order not found',
        id: id,
        success: false
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const order = orders[0];
    const customerName = `${order.customer_first_name} ${order.customer_last_name || ''}`.trim();
    const orderNumber = order.order_number || `ORD-${String(order.id).padStart(5, '0')}`;
    
    console.log(`📋 Found order to delete: ${orderNumber} from ${customerName}`);

    // Step 2: Delete order items first (due to foreign key constraints)
    const deleteItemsResponse = await fetch(`${SUPABASE_URL}/rest/v1/order_items?order_id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!deleteItemsResponse.ok) {
      const itemsError = await deleteItemsResponse.text();
      console.error('Failed to delete order items:', itemsError);
      
      return new Response(JSON.stringify({
        error: 'Failed to delete order items',
        details: itemsError,
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log(`🗑️ Deleted order items for order ${id}`);

    // Step 3: Delete the main order
    const deleteOrderResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!deleteOrderResponse.ok) {
      const orderError = await deleteOrderResponse.text();
      console.error('Failed to delete order:', orderError);
      
      return new Response(JSON.stringify({
        error: 'Failed to delete order from database',
        details: orderError,
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log(`✅ Successfully deleted order: ${orderNumber}`);

    // Success response with detailed information
    return new Response(JSON.stringify({ 
      success: true,
      message: `Order ${orderNumber} from ${customerName} deleted successfully!`,
      data: {
        id: parseInt(id),
        order_number: orderNumber,
        customer: customerName,
        amount: (order.total_amount / 1000).toFixed(3), // Convert from fils to OMR
        deleted_at: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('❌ Delete order error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete order',
      details: error.message,
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

// Test endpoint for debugging
export async function onRequestGet(context) {
  const cookies = context.request.headers.get('Cookie') || '';
  const sessionCookie = cookies
    .split(';')
    .find(c => c.trim().startsWith('admin_session='));
  
  const isAuthenticated = !!sessionCookie;
  
  return new Response(JSON.stringify({
    message: 'Delete order endpoint is working!',
    authenticated: isAuthenticated,
    method: 'POST /admin/delete-order',
    requiredFields: ['id (number)'],
    workflow: [
      '1. Verify admin authentication',
      '2. Validate order ID',
      '3. Fetch order details for confirmation',
      '4. Delete order items (foreign key constraint)',
      '5. Delete main order record',
      '6. Return success message with details'
    ],
    example: {
      request: { id: 123 },
      response: {
        success: true,
        message: 'Order ORD-00123 from John Doe deleted successfully!',
        data: {
          id: 123,
          order_number: 'ORD-00123',
          customer: 'John Doe',
          amount: '25.500',
          deleted_at: '2025-09-04T12:00:00.000Z'
        }
      }
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}