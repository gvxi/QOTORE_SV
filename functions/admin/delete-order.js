// functions/admin/delete-order.js - FIXED delete order function
export async function onRequestPost(context) {
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
        received: { id: !!id }
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Deleting order:', id);

    // Step 1: Get order details before deletion (for logging and response)
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}&select=id,customer_first_name,customer_last_name,status,total_amount,order_number,created_at`, {
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
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const existingOrders = await checkResponse.json();
    if (existingOrders.length === 0) {
      return new Response(JSON.stringify({
        error: 'Order not found',
        id: id
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const order = existingOrders[0];
    const orderNumber = order.order_number || `ORD-${String(order.id).padStart(5, '0')}`;
    const customerName = `${order.customer_first_name} ${order.customer_last_name || ''}`.trim();
    
    console.log('Found order to delete:', orderNumber, 'Customer:', customerName, 'Status:', order.status);

    // Step 2: Delete the order (order_items will be deleted automatically due to CASCADE)
    const deleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}`, {
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
        supabaseError: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const deletedOrders = await deleteResponse.json();
    console.log('Successfully deleted order:', orderNumber);

    // Success response
    return new Response(JSON.stringify({ 
      success: true,
      message: `Order ${orderNumber} from ${customerName} deleted successfully!`,
      data: {
        deletedOrder: {
          id: parseInt(id),
          orderNumber: orderNumber,
          customer: customerName,
          status: order.status,
          totalAmount: order.total_amount / 1000, // Convert fils to OMR
          createdAt: order.created_at,
          deletedAt: new Date().toISOString()
        }
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Delete order error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete order',
      details: error.message,
      stack: error.stack
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
  const cookies = context.request.headers.get('Cookie') || '';
  const sessionCookie = cookies
    .split(';')
    .find(c => c.trim().startsWith('admin_session='));
  
  const isAuthenticated = !!sessionCookie;
  
  return new Response(JSON.stringify({
    message: 'Delete order endpoint is working!',
    authenticated: isAuthenticated,
    method: 'POST /admin/delete-order to delete an order',
    requiredFields: ['id (number)'],
    examples: {
      deleteOrder: { id: 123 }
    },
    note: 'Authentication required via admin_session cookie. Order items will be deleted automatically due to CASCADE.'
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}