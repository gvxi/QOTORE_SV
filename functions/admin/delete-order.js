// functions/admin/delete-order.js - Delete orders
export async function onRequestDelete(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Delete order request received');
    
    // Check authentication
    const request = context.request;
    const cookies = request.headers.get('Cookie') || '';
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('admin_session='));
    
    if (!sessionCookie) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required',
        redirectUrl: '/login.html'
      }), {
        status: 401,
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
        error: 'Database not configured for admin operations',
        debug: {
          hasUrl: !!SUPABASE_URL,
          hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY
        }
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    
    // Parse request data
    let requestData;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        return new Response(JSON.stringify({ 
          error: 'No data provided' 
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      requestData = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid request data format' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Validate required fields
    const { id } = requestData;
    
    if (!id) {
      return new Response(JSON.stringify({ 
        error: 'Missing required field: id',
        received: { id: id }
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Deleting order with ID:', id);

    // Step 1: Get order details before deletion (for response)
    const getOrderResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}&select=id,customer_first_name,customer_last_name,total_amount`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!getOrderResponse.ok) {
      const errorText = await getOrderResponse.text();
      console.error('Failed to get order details:', errorText);
      
      return new Response(JSON.stringify({
        error: 'Failed to retrieve order details',
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const orders = await getOrderResponse.json();
    if (orders.length === 0) {
      return new Response(JSON.stringify({
        error: 'Order not found',
        id: id
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const order = orders[0];
    console.log('Found order to delete:', `${order.customer_first_name} ${order.customer_last_name}`);

    // Step 2: Delete the order
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
        details: orderError
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log('Successfully deleted order:', id);

    // Success response
    return new Response(JSON.stringify({ 
      success: true,
      message: `Order from ${order.customer_first_name} ${order.customer_last_name} deleted successfully!`,
      data: {
        id: parseInt(id),
        customer: `${order.customer_first_name} ${order.customer_last_name}`,
        amount: order.total_amount / 1000, // Convert from fils to OMR
        deleted_at: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Delete order error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete order',
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
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Test endpoint
export async function onRequestGet(context) {
  const cookies = context.request.headers.get('Cookie') || '';
  const sessionCookie = cookies
    .split(';')
    .find(c => c.trim().startsWith('admin_session='));
  
  const isAuthenticated = !!sessionCookie;
  
  return new Response(JSON.stringify({
    message: 'Delete order endpoint is working!',
    authenticated: isAuthenticated,
    method: 'DELETE /admin/delete-order to permanently delete an order',
    requiredFields: ['id (number)'],
    example: { id: 123 },
    warning: 'This action is permanent and cannot be undone',
    note: 'Authentication required via admin_session cookie'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}