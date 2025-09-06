// functions/api/cancel-order.js - Updated for customer_sessions integration
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
    
    console.log('Cancelling order:', order_id, 'for customer:', customer_ip);
    
    // Step 1: Verify order ownership and eligibility using customer_order_status view
    const orderQuery = `${SUPABASE_URL}/rest/v1/customer_order_status?id=eq.${order_id}&customer_ip=eq.${customer_ip}&select=*`;
    
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
    
    // Step 2: Check if order can be cancelled using the view's can_cancel field
    if (!order.can_cancel) {
      let reason = 'Order cannot be cancelled';
      
      if (order.status !== 'pending') {
        reason = `Cannot cancel order with status: ${order.status}`;
      } else if (order.reviewed) {
        reason = 'Order has already been reviewed by admin and cannot be cancelled';
      } else {
        reason = 'Order cancellation deadline has passed';
      }
      
      return new Response(JSON.stringify({
        error: reason,
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Order is eligible for cancellation');

    // Step 3: Update order status to cancelled
    const now = new Date().toISOString();
    const updateData = {
      status: 'cancelled',
      updated_at: now
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
      console.error('Failed to update order status:', errorText);
      return new Response(JSON.stringify({
        error: 'Failed to cancel order',
        details: errorText,
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // Step 4: Update customer session to remove active order
    await fetch(`${SUPABASE_URL}/rest/v1/customer_sessions?customer_ip=eq.${customer_ip}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        active_order_id: null,
        updated_at: now
      })
    });

    console.log('Order cancelled successfully:', order.order_number);

    return new Response(JSON.stringify({
      success: true,
      message: 'Order cancelled successfully',
      order: {
        id: order.id,
        order_number: order.order_number,
        status: 'cancelled'
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Error cancelling order:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error while cancelling order',
      details: error.message,
      success: false
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle OPTIONS requests for CORS
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}