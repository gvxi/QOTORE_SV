// functions/api/admin/orders/[id]/status.js - Update individual order status
export async function onRequestPatch(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Order status update API called');
    
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

    // Get order ID from URL params
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const orderId = pathParts[pathParts.length - 2]; // Get ID before 'status'

    if (!orderId || orderId === '[id]') {
      return new Response(JSON.stringify({
        error: 'Order ID is required'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Parse request body
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return new Response(JSON.stringify({
        error: 'Status is required'
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
    
    if (!updatedOrder || updatedOrder.length === 0) {
      return new Response(JSON.stringify({
        error: 'Order not found'
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    console.log('Order status updated successfully:', updatedOrder[0]);

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
      'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}