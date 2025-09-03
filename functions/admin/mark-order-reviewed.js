// functions/admin/mark-order-reviewed.js - Mark order as reviewed by admin
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Mark order as reviewed request received');
    
    // Check authentication
    const request = context.request;
    const cookies = request.headers.get('Cookie') || '';
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('admin_session='));
    
    if (!sessionCookie) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required',
        redirectUrl: '/login.html',
        success: false
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
        success: false
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
    const { order_id } = requestData;
    
    if (!order_id || typeof order_id !== 'number') {
      return new Response(JSON.stringify({ 
        error: 'Missing or invalid field: order_id (must be a number)',
        received: { order_id: order_id, type: typeof order_id },
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Marking order as reviewed:', order_id);

    // Step 1: Check if order exists and get current state
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${order_id}&select=id,order_number,status,reviewed,customer_first_name,customer_last_name,total_amount`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

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
        order_id: order_id,
        success: false
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const order = existingOrders[0];
    console.log('Found order:', order.order_number, 'Current status:', order.status, 'Reviewed:', order.reviewed);

    // Step 2: Check if order can be reviewed
    if (order.status !== 'pending') {
      return new Response(JSON.stringify({
        error: `Cannot review order with status: ${order.status}. Only pending orders can be reviewed.`,
        current_status: order.status,
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    if (order.reviewed) {
      return new Response(JSON.stringify({
        error: 'Order has already been reviewed',
        order_number: order.order_number,
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Step 3: Mark order as reviewed and update status
    const updatePayload = {
      reviewed: true,
      status: 'reviewed', // Change status from 'pending' to 'reviewed'
      updated_at: new Date().toISOString()
    };

    console.log('Updating order with payload:', updatePayload);

    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order_id}`, {
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
      console.error('Failed to update order:', errorText);
      
      return new Response(JSON.stringify({
        error: 'Failed to mark order as reviewed',
        details: errorText,
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const updatedOrders = await updateResponse.json();
    const updatedOrder = updatedOrders[0];

    console.log('✅ Order marked as reviewed:', updatedOrder.order_number);

    // Step 4: Optional - Notify customer (if notification system exists)
    try {
      await fetch(`${context.request.url.split('/admin/')[0]}/api/notify-customer-reviewed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: order.id,
          order_number: order.order_number,
          customer_name: `${order.customer_first_name} ${order.customer_last_name || ''}`.trim()
        })
      });
    } catch (notificationError) {
      console.warn('Failed to send customer notification:', notificationError);
      // Don't fail the review if notification fails
    }

    // Success response
    return new Response(JSON.stringify({ 
      success: true,
      message: `Order ${order.order_number} marked as reviewed successfully!`,
      data: {
        order_id: updatedOrder.id,
        order_number: order.order_number,
        customer_name: `${order.customer_first_name} ${order.customer_last_name || ''}`.trim(),
        old_status: order.status,
        new_status: updatedOrder.status,
        reviewed: updatedOrder.reviewed,
        total_amount_omr: (order.total_amount / 1000).toFixed(3),
        updated_at: updatedOrder.updated_at
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Mark order as reviewed error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to mark order as reviewed: ' + error.message,
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
    method: 'POST /admin/mark-order-reviewed',
    requiredFields: ['order_id (number)'],
    restrictions: [
      'Admin authentication required',
      'Order must have status "pending"',
      'Order must not already be reviewed'
    ],
    workflow: [
      '1. Order starts as "pending" with reviewed=false',
      '2. Admin clicks "Review" button',
      '3. Order becomes status="reviewed" with reviewed=true',
      '4. Customer can no longer cancel the order',
      '5. Admin can then mark as "completed" or "cancelled"'
    ],
    example: {
      request: { order_id: 123 },
      response: {
        success: true,
        message: 'Order ORD-00123 marked as reviewed successfully!',
        data: {
          order_id: 123,
          order_number: 'ORD-00123',
          customer_name: 'John Doe',
          old_status: 'pending',
          new_status: 'reviewed',
          reviewed: true
        }
      }
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}