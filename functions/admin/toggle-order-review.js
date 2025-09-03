// functions/admin/toggle-order-review.js - Toggle order reviewed status (both ways)
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Toggle order review status request received');
    
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
        error: 'Database not configured for admin operations'
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
    const { id, reviewed } = requestData;
    
    if (!id || typeof reviewed !== 'boolean') {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: id (number) and reviewed (boolean)'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    console.log(`Toggling review status for order ${id} to ${reviewed}`);
    
    // Step 1: Fetch the order to verify it exists
    const orderResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}&select=*`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('Failed to fetch order:', errorText);
      return new Response(JSON.stringify({
        error: 'Failed to fetch order',
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const orders = await orderResponse.json();
    
    if (orders.length === 0) {
      return new Response(JSON.stringify({
        error: 'Order not found',
        orderId: id
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const order = orders[0];
    console.log('Found order:', order.order_number, 'Current reviewed status:', order.reviewed);

    // Step 2: Update the reviewed status
    const updateData = {
      reviewed: reviewed,
      updated_at: new Date().toISOString()
    };

    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}`, {
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
      console.error('Failed to update order review status:', errorText);
      return new Response(JSON.stringify({
        error: 'Failed to update order review status',
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const updatedOrders = await updateResponse.json();
    const updatedOrder = updatedOrders[0];

    console.log(`✅ Order ${order.order_number} review status updated to: ${reviewed}`);

    // Step 3: Optional - Send notification if marking as reviewed (not when unmarking)
    if (reviewed) {
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
        // Don't fail the review toggle if notification fails
      }
    }

    // Success response
    return new Response(JSON.stringify({ 
      success: true,
      message: `Order ${order.order_number} ${reviewed ? 'marked as reviewed' : 'marked as unreviewed'} successfully!`,
      data: {
        order_id: updatedOrder.id,
        order_number: order.order_number,
        customer_name: `${order.customer_first_name} ${order.customer_last_name || ''}`.trim(),
        old_reviewed_status: order.reviewed,
        new_reviewed_status: updatedOrder.reviewed,
        status: updatedOrder.status,
        total_amount_omr: (order.total_amount / 1000).toFixed(3),
        updated_at: updatedOrder.updated_at
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Toggle order review error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to toggle order review status: ' + error.message
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
    message: 'Toggle order review status endpoint is working!',
    authenticated: isAuthenticated,
    method: 'POST /admin/toggle-order-review',
    requiredFields: ['id (number)', 'reviewed (boolean)'],
    examples: {
      markAsReviewed: { id: 123, reviewed: true },
      markAsUnreviewed: { id: 123, reviewed: false }
    },
    workflow: {
      markAsReviewed: [
        '1. Admin clicks "Mark as Reviewed" button',
        '2. Order reviewed field becomes true',
        '3. Customer notification sent (optional)',
        '4. Customer can no longer cancel order',
        '5. Order can proceed to completion'
      ],
      markAsUnreviewed: [
        '1. Admin clicks "Mark as Unreviewed" button',
        '2. Order reviewed field becomes false',
        '3. Customer can cancel again (if within deadline)',
        '4. Order requires review before completion'
      ]
    },
    businessLogic: {
      reviewedTrue: 'Order has been reviewed by admin, customer cannot cancel',
      reviewedFalse: 'Order needs admin review, customer can still cancel if within deadline'
    },
    note: 'Authentication required via admin_session cookie'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}