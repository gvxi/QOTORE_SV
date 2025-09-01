// functions/admin/mark-order-reviewed.js - Mark order as reviewed to prevent cancellation
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Mark order as reviewed request received');

    // Check admin authentication
    const cookies = context.request.headers.get('Cookie') || '';
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('admin_session='));

    if (!sessionCookie) {
      return new Response(JSON.stringify({
        error: 'Authentication required',
        success: false
      }), { status: 401, headers: corsHeaders });
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
      }), { status: 500, headers: corsHeaders });
    }

    // Parse request data
    let requestData;
    try {
      const text = await context.request.text();
      if (!text || text.trim() === '') {
        return new Response(JSON.stringify({ 
          error: 'No data provided',
          success: false 
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      requestData = JSON.parse(text);
      console.log('Mark reviewed request:', requestData);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid data format',
        success: false 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Validate required fields
    const { id, status } = requestData;
    if (!id || typeof id !== 'number') {
      return new Response(JSON.stringify({
        error: 'Valid order ID is required',
        success: false
      }), { status: 400, headers: corsHeaders });
    }

    // Set status to 'reviewed' if not specified
    const newStatus = status || 'reviewed';
    
    // Validate status
    if (!['reviewed', 'processing'].includes(newStatus)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid status. Must be "reviewed" or "processing"',
        received: newStatus,
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Marking order as reviewed:', { id, status: newStatus });

    // Step 1: Check if order exists and get current details
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}&select=id,order_number,customer_first_name,customer_last_name,status,total_amount,created_at,notes`, {
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
        error: 'Order not found',
        id: id,
        success: false
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const order = existingOrders[0];
    console.log('Found order:', order.order_number, 'Current status:', order.status);

    // Check if order is already completed or cancelled
    if (order.status === 'completed' || order.status === 'cancelled') {
      return new Response(JSON.stringify({
        error: `Order is already ${order.status} and cannot be modified`,
        orderNumber: order.order_number,
        currentStatus: order.status,
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Step 2: Update order status to reviewed/processing
    const now = new Date().toISOString();
    const updatePayload = {
      status: newStatus,
      updated_at: now,
      notes: order.notes ? 
        `${order.notes}\n\n--- ${newStatus.toUpperCase()} ---\nMarked by admin at: ${now}\nCancellation now disabled for customer` :
        `--- ${newStatus.toUpperCase()} ---\nMarked by admin at: ${now}\nCancellation now disabled for customer`
    };

    console.log('Updating order with payload:', updatePayload);

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
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const updatedOrder = await updateResponse.json();
    console.log('Updated order:', updatedOrder[0]);

    // Calculate time info for response
    const orderDate = new Date(order.created_at);
    const hoursSinceOrder = (Date.now() - orderDate.getTime()) / (1000 * 60 * 60);
    const wasStillCancellable = hoursSinceOrder < 1 && order.status === 'pending';

    // Success response
    return new Response(JSON.stringify({ 
      success: true,
      message: `Order ${order.order_number} marked as ${newStatus}${wasStillCancellable ? ' - customer can no longer cancel' : ''}`,
      data: {
        id: parseInt(id),
        orderNumber: order.order_number,
        status: newStatus,
        previousStatus: order.status,
        customer: `${order.customer_first_name} ${order.customer_last_name}`.trim(),
        totalAmount: order.total_amount / 1000, // Convert fils to OMR
        hoursSinceOrder: Math.round(hoursSinceOrder * 100) / 100,
        wasStillCancellable: wasStillCancellable,
        reviewedAt: now,
        cancellationNowDisabled: true
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Mark order as reviewed error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to mark order as reviewed',
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

// Test endpoint
export async function onRequestGet(context) {
  const cookies = context.request.headers.get('Cookie') || '';
  const sessionCookie = cookies
    .split(';')
    .find(c => c.trim().startsWith('admin_session='));
  
  const isAuthenticated = !!sessionCookie;
  
  return new Response(JSON.stringify({
    message: 'Mark order as reviewed endpoint is working!',
    authenticated: isAuthenticated,
    method: 'POST /admin/mark-order-reviewed to mark order as reviewed',
    requiredFields: ['id (number)', 'status (optional: "reviewed" or "processing")'],
    examples: {
      markReviewed: { id: 123, status: 'reviewed' },
      markProcessing: { id: 123, status: 'processing' }
    },
    note: 'Authentication required via admin_session cookie',
    purpose: 'Prevents customer cancellation and allows new orders'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}