// functions/admin/update-order-status.js - FIXED to support all order statuses
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
    
    if (!id || !status) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: id, status',
        received: { id: !!id, status: !!status }
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Validate status value - FIXED to support all valid statuses
    const validStatuses = ['pending', 'reviewed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', '),
        received: status,
        validOptions: validStatuses
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Updating order status:', { id, status });

    // Step 1: Check if order exists and get current details
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}&select=id,customer_first_name,customer_last_name,status,total_amount,order_number`, {
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
    
    console.log('Found order:', orderNumber, 'Customer:', customerName, 'Current status:', order.status);

    // Don't update if status is the same
    if (order.status === status) {
      return new Response(JSON.stringify({
        success: true,
        message: `Order ${orderNumber} is already ${status}`,
        data: {
          id: parseInt(id),
          status: status,
          orderNumber: orderNumber,
          customer: customerName
        }
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Step 2: Update order status
    const updatePayload = {
      status: status,
      updated_at: new Date().toISOString()
    };

    // If marking as reviewed, also set the reviewed boolean flag
    if (status === 'reviewed') {
      updatePayload.reviewed = true;
    }

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
        details: errorText,
        supabaseError: errorText
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
      message: `Order ${orderNumber} from ${customerName} updated to ${status} successfully!`,
      data: {
        id: parseInt(id),
        orderNumber: orderNumber,
        customer: customerName,
        previousStatus: order.status,
        newStatus: status,
        totalAmount: order.total_amount / 1000, // Convert fils to OMR
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
    message: 'Update order status endpoint is working!',
    authenticated: isAuthenticated,
    method: 'POST /admin/update-order-status to update order status',
    requiredFields: ['id (number)', 'status (pending|reviewed|completed|cancelled)'],
    validStatuses: ['pending', 'reviewed', 'completed', 'cancelled'],
    examples: {
      markReviewed: { id: 123, status: 'reviewed' },
      markCompleted: { id: 123, status: 'completed' },
      markPending: { id: 123, status: 'pending' },
      markCancelled: { id: 123, status: 'cancelled' }
    },
    note: 'Authentication required via admin_session cookie'
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}