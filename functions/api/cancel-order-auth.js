// functions/api/cancel-order-auth.js - Cancel order with user authentication
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Authenticated cancel order request received');

    // Get Supabase credentials
    const { env } = context;
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    const RESEND_API_KEY = env.RESEND_API_KEY;
    const ADMIN_EMAIL = env.ADMIN_EMAIL || 'admin@qotore.uk';
    
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
    
    const { order_id, user_id } = requestData;
    
    if (!order_id || !user_id) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: order_id, user_id',
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    console.log('Cancelling order:', order_id, 'for user:', user_id);
    
    // Step 1: Verify order ownership and get order details
    const orderQuery = `${SUPABASE_URL}/rest/v1/orders?id=eq.${order_id}&user_id=eq.${user_id}&select=*`;
    
    const orderResponse = await fetch(orderQuery, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('Order verification failed:', errorText);
      
      return new Response(JSON.stringify({
        error: 'Failed to verify order ownership',
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    
    const orders = await orderResponse.json();
    
    if (orders.length === 0) {
      return new Response(JSON.stringify({
        error: 'Order not found or you do not have permission to cancel this order',
        success: false
      }), {
        status: 404,
        headers: corsHeaders
      });
    }
    
    const order = orders[0];
    console.log('Found order:', order.order_number, 'Status:', order.status, 'Created:', order.created_at);
    
    // Step 2: Check if order can be cancelled
    const orderTime = new Date(order.created_at).getTime();
    const currentTime = Date.now();
    const oneHour = 60 * 60 * 1000;
    const timeSinceOrder = currentTime - orderTime;
    
    // Order can be cancelled if:
    // 1. Status is 'pending' AND within 1 hour of creation
    if (order.status !== 'pending') {
      return new Response(JSON.stringify({
        error: 'Order cannot be cancelled. It is already being processed or completed.',
        status: order.status,
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    if (timeSinceOrder > oneHour) {
      return new Response(JSON.stringify({
        error: 'Cancellation period expired. Orders can only be cancelled within 1 hour of placement.',
        time_elapsed_hours: Math.round(timeSinceOrder / oneHour * 100) / 100,
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    console.log('Order is eligible for cancellation');
    
    // Step 3: Update order status to cancelled
    const now = new Date().toISOString();
    const updatePayload = {
      status: 'cancelled',
      updated_at: now,
      cancelled_at: now
    };
    
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
    
    const updatedOrders = await updateResponse.json();
    const updatedOrder = updatedOrders[0];
    console.log('Order cancelled successfully:', updatedOrder.order_number);
    
    // Step 4: Send email notifications
    let emailNotificationsSent = false;
    
    if (RESEND_API_KEY) {
      try {
        const customerName = `${order.customer_first_name} ${order.customer_last_name || ''}`.trim();
        const totalOMR = (order.total_amount / 1000).toFixed(3);
        
        // Send notification to admin
        const adminEmailData = {
          from: 'Qotore Orders <orders@qotore.uk>',
          to: [ADMIN_EMAIL],
          subject: `❌ Order Cancelled: ${order.order_number} - ${customerName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px; border-radius: 12px;">
              <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 20px; border-radius: 8px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">❌ Order Cancelled</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Order #${order.order_number}</p>
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #dc3545; margin-top: 0;">Cancellation Details</h2>
                <p><strong>Customer:</strong> ${customerName}</p>
                <p><strong>Email:</strong> ${order.customer_email}</p>
                <p><strong>Phone:</strong> ${order.customer_phone}</p>
                <p><strong>Order Total:</strong> ${totalOMR} OMR</p>
                <p><strong>Cancelled At:</strong> ${new Date(now).toLocaleString()}</p>
              </div>
              
              <div style="text-align: center; padding: 20px; background: #f8d7da; border-radius: 8px; border: 1px solid #f5c6cb;">
                <p style="margin: 0; color: #721c24;">
                  <strong>Order Status:</strong> This order has been cancelled by the customer and requires no further action.
                </p>
              </div>
            </div>
          `
        };
        
        // Send confirmation to customer
        const customerEmailData = {
          from: 'Qotore <orders@qotore.uk>',
          to: [order.customer_email],
          subject: `Order Cancelled - ${order.order_number} | Qotore`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px; border-radius: 12px;">
              <div style="background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%); color: white; padding: 20px; border-radius: 8px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">Order Cancelled</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Order #${order.order_number}</p>
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #6c757d; margin-top: 0;">Hello ${customerName},</h2>
                <p>Your order has been successfully cancelled as requested. You will not be charged for this order.</p>
                
                <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; color: #721c24;"><strong>Order Status:</strong> Cancelled</p>
                </div>
                
                <p><strong>Cancelled On:</strong> ${new Date(now).toLocaleString()}</p>
                <p><strong>Original Total:</strong> ${totalOMR} OMR</p>
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #8B4513; margin-top: 0;">We're Sorry to See You Go</h2>
                <p>If you cancelled by mistake or would like to place a new order, you can visit our website anytime.</p>
                <p>If you had any issues with our service, please don't hesitate to contact us - we're always looking to improve!</p>
              </div>
              
              <div style="text-align: center; padding: 20px;">
                <p style="color: #6c757d; margin-bottom: 10px;">Need help? Contact us:</p>
                <p style="margin: 5px 0;"><strong>WhatsApp:</strong> +968 9222 5949</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> orders@qotore.uk</p>
                <p style="margin: 20px 0 0 0; color: #8B4513;"><strong>Thank you for considering Qotore!</strong></p>
              </div>
            </div>
          `
        };
        
        // Send both emails
        const emailPromises = [
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(adminEmailData)
          }),
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(customerEmailData)
          })
        ];
        
        const emailResults = await Promise.allSettled(emailPromises);
        emailNotificationsSent = emailResults.every(result => result.status === 'fulfilled');
        
        if (emailNotificationsSent) {
          console.log('Cancellation email notifications sent successfully');
        } else {
          console.warn('Some cancellation email notifications failed to send');
        }
        
      } catch (emailError) {
        console.error('Email notification error:', emailError);
      }
    }
    
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        order_id: updatedOrder.id,
        order_number: updatedOrder.order_number,
        status: 'cancelled',
        cancelled_at: updatedOrder.cancelled_at,
        customer_name: customerName,
        total_amount: order.total_amount,
        email_sent: emailNotificationsSent
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Error in cancel-order-auth:', error);
    
    return new Response(JSON.stringify({
      success: false,
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}