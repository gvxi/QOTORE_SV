// functions/admin/cancel-order.js - Customer order cancellation endpoint
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Order cancellation request received');

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

    // Parse cancellation request
    let cancelData;
    try {
      const text = await context.request.text();
      if (!text || text.trim() === '') {
        return new Response(JSON.stringify({ 
          error: 'No cancellation data provided',
          success: false 
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      cancelData = JSON.parse(text);
      console.log('Cancellation request:', cancelData);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid cancellation data format',
        success: false 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Validate required fields
    const { orderId, sessionId, userIP, reason } = cancelData;
    if (!orderId || typeof orderId !== 'number') {
      return new Response(JSON.stringify({
        error: 'Valid order ID is required',
        success: false
      }), { status: 400, headers: corsHeaders });
    }

    console.log('Processing cancellation for order:', orderId);

    // Step 1: Get order details and verify it exists and can be cancelled
    const getOrderResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=id,order_number,customer_first_name,customer_last_name,status,created_at,total_amount`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!getOrderResponse.ok) {
      const errorText = await getOrderResponse.text();
      console.error('Failed to fetch order:', errorText);
      return new Response(JSON.stringify({
        error: 'Failed to retrieve order details',
        success: false,
        details: errorText
      }), { status: 500, headers: corsHeaders });
    }

    const orders = await getOrderResponse.json();
    if (orders.length === 0) {
      return new Response(JSON.stringify({
        error: 'Order not found',
        success: false,
        orderId: orderId
      }), { status: 404, headers: corsHeaders });
    }

    const order = orders[0];
    console.log('Found order:', order.order_number, 'Status:', order.status);

    // Step 2: Check if order can be cancelled
    const orderDate = new Date(order.created_at);
    const now = new Date();
    const hoursSinceOrder = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);

    // Check status - can't cancel if already reviewed/completed/cancelled
    if (order.status === 'cancelled') {
      return new Response(JSON.stringify({
        error: 'Order is already cancelled',
        success: false,
        orderNumber: order.order_number
      }), { status: 400, headers: corsHeaders });
    }

    if (order.status === 'completed') {
      return new Response(JSON.stringify({
        error: 'Cannot cancel completed orders',
        success: false,
        orderNumber: order.order_number
      }), { status: 400, headers: corsHeaders });
    }

    // Check if it's been reviewed (you can add a 'reviewed' status or check updated_at)
    if (order.status === 'processing' || order.status === 'reviewed') {
      return new Response(JSON.stringify({
        error: 'Order is being processed and cannot be cancelled',
        success: false,
        orderNumber: order.order_number
      }), { status: 400, headers: corsHeaders });
    }

    // Check time window (1 hour)
    if (hoursSinceOrder > 1) {
      return new Response(JSON.stringify({
        error: 'Orders can only be cancelled within 1 hour of placement',
        success: false,
        orderNumber: order.order_number,
        hoursElapsed: Math.round(hoursSinceOrder * 100) / 100
      }), { status: 400, headers: corsHeaders });
    }

    // Step 3: Update order status to cancelled
    const updatePayload = {
      status: 'cancelled',
      notes: order.notes ? 
        `${order.notes}\n\n--- CANCELLED ---\nReason: ${reason || 'Customer request'}\nCancelled at: ${now.toISOString()}\nSession: ${sessionId}\nIP: ${userIP}` :
        `--- CANCELLED ---\nReason: ${reason || 'Customer request'}\nCancelled at: ${now.toISOString()}\nSession: ${sessionId}\nIP: ${userIP}`,
      updated_at: now.toISOString()
    };

    console.log('Updating order to cancelled status');

    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
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
      console.error('Failed to cancel order:', errorText);
      return new Response(JSON.stringify({
        error: 'Failed to cancel order in database',
        success: false,
        details: errorText
      }), { status: 500, headers: corsHeaders });
    }

    const updatedOrder = await updateResponse.json();
    console.log('Order cancelled successfully:', updatedOrder[0]);

    // Success response
    return new Response(JSON.stringify({ 
      success: true,
      message: `Order ${order.order_number} cancelled successfully`,
      data: {
        id: orderId,
        orderNumber: order.order_number,
        status: 'cancelled',
        cancelledAt: now.toISOString(),
        customerName: `${order.customer_first_name} ${order.customer_last_name}`.trim(),
        totalAmount: order.total_amount / 1000, // Convert fils to OMR
        hoursElapsed: Math.round(hoursSinceOrder * 100) / 100
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Order cancellation error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to cancel order',
      success: false,
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Order status check endpoint
export async function onRequestGet(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const url = new URL(context.request.url);
    const orderId = url.pathname.split('/').pop();
    
    if (!orderId || isNaN(parseInt(orderId))) {
      return new Response(JSON.stringify({
        error: 'Valid order ID required',
        success: false
      }), { status: 400, headers: corsHeaders });
    }

    const { env } = context;
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({
        error: 'Database not configured',
        success: false
      }), { status: 500, headers: corsHeaders });
    }

    // Get order status
    const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${parseInt(orderId)}&select=id,order_number,status,updated_at,created_at`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch order status');
    }

    const orders = await response.json();
    if (orders.length === 0) {
      return new Response(JSON.stringify({
        error: 'Order not found',
        success: false
      }), { status: 404, headers: corsHeaders });
    }

    const order = orders[0];
    const orderDate = new Date(order.created_at);
    const hoursSinceOrder = (Date.now() - orderDate.getTime()) / (1000 * 60 * 60);

    return new Response(JSON.stringify({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        canCancel: order.status === 'pending' && hoursSinceOrder < 1,
        hoursElapsed: Math.round(hoursSinceOrder * 100) / 100,
        updated_at: order.updated_at,
        created_at: order.created_at
      }
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Order status check error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to check order status',
      success: false,
      details: error.message
    }), { status: 500, headers: corsHeaders });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}