// functions/api/cancel-order.js - Cancel customer order
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Cancel order request received');

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
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid request data format',
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Validate required fields
    const { order_id, customer_ip } = requestData;
    
    if (!order_id || !customer_ip) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: order_id, customer_ip',
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Attempting to cancel order:', order_id, 'for IP:', customer_ip);

    // Step 1: Verify order exists and belongs to customer
    const orderQuery = `${SUPABASE_URL}/rest/v1/orders?id=eq.${order_id}&customer_ip=eq.${customer_ip}&select=*`;
    
    const orderResponse = await fetch(orderQuery, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('Failed to fetch order:', errorText);
      return new Response(JSON.stringify({
        error: 'Failed to verify order',
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const orders = await orderResponse.json();
    
    if (orders.length === 0) {
      return new Response(JSON.stringify({
        error: 'Order not found or does not belong to you',
        success: false
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const order = orders[0];
    
    // Step 2: Check if order can be cancelled
    const now = new Date();
    const reviewDeadline = order.review_deadline ? new Date(order.review_deadline) : null;
    
    // Order can be cancelled only if:
    // 1. Status is 'pending'
    // 2. Not reviewed by admin yet
    // 3. Still within review deadline
    if (order.status !== 'pending') {
      return new Response(JSON.stringify({
        error: `Cannot cancel order with status: ${order.status}`,
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    if (order.reviewed) {
      return new Response(JSON.stringify({
        error: 'Order has already been reviewed by admin and cannot be cancelled',
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    if (reviewDeadline && now > reviewDeadline) {
      return new Response(JSON.stringify({
        error: 'Order cancellation deadline has passed',
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Order is eligible for cancellation');

    // Step 3: Update order status to cancelled
    const updateData = {
      status: 'cancelled',
      updated_at: now.toISOString()
    };

    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order_id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Failed to cancel order:', errorText);
      return new Response(JSON.stringify({
        error: 'Failed to cancel order',
        details: errorText,
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const updatedOrders = await updateResponse.json();
    const cancelledOrder = updatedOrders[0];

    console.log(`✅ Order ${order.order_number} cancelled successfully`);

    // Success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        order_id: cancelledOrder.id,
        order_number: order.order_number,
        status: cancelledOrder.status,
        cancelled_at: cancelledOrder.updated_at,
        customer_name: `${order.customer_first_name} ${order.customer_last_name || ''}`.trim()
      }
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to cancel order: ' + error.message,
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