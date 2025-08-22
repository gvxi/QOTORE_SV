// functions/admin/update-order-status.js - Update order status (pending/completed)
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Update order status request received');
    
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
    const { id, status } = requestData;
    
    if (!id || !status || !['pending', 'completed'].includes(status)) {
      return new Response(JSON.stringify({ 
        error: 'Missing or invalid fields: id (number), status (pending|completed)',
        received: {
          id: id,
          status: status
        }
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Updating order status:', { id, status });

    // Step 1: Check if order exists
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}&select=id,status`, {
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
    console.log('Found order:', order.id, 'Current status:', order.status);

    // Step 2: Update order status
    const updatePayload = {
      status: status,
      updated_at: new Date().toISOString()
    };

    console.log('Updating order status with payload:', updatePayload);

    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updatePayload)
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Failed to update order status:', errorText);
      
      return new Response(JSON.stringify({
        error: 'Failed to update order status',
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const updatedOrder = await updateResponse.json();
    console.log('Updated order status:', updatedOrder[0]);

    // Success response
    return new Response(JSON.stringify({ 
      success: true,
      message: `Order status updated to ${status} successfully!`,
      data: {
        id: parseInt(id),
        status: status,
        updated_at: updatedOrder[0].updated_at
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Update order status error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update order status',
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
  const cookies = context.request.headers.get('Cookie') || '';
  const sessionCookie = cookies
    .split(';')
    .find(c => c.trim().startsWith('admin_session='));
  
  const isAuthenticated = !!sessionCookie;
  
  return new Response(JSON.stringify({
    message: 'Update order status endpoint is working!',
    authenticated: isAuthenticated,
    method: 'POST /admin/update-order-status to update order status',
    requiredFields: ['id (number)', 'status (pending|completed)'],
    examples: {
      markCompleted: { id: 123, status: 'completed' },
      markPending: { id: 123, status: 'pending' }
    },
    note: 'Authentication required via admin_session cookie'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}