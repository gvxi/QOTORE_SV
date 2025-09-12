// functions/api/cancel-order-auth.js - Cancel order with user authentication
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Authenticated cancel order request received');

    // Get environment variables
    const { env } = context;
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    const RESEND_API_KEY = env.RESEND_API_KEY;
    const ADMIN_EMAIL = env.ADMIN_EMAIL || 'admin@qotore.uk';
    const WHATSAPP_NUMBER = env.WHATSAPP_NUMBER || '96890000000';
    
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
      console.error('Failed to fetch order:', errorText);
      
      return new Response(JSON.stringify({
        error: 'Failed to fetch order details',
        details: errorText,
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
    const customerName = `${order.customer_first_name} ${order.customer_last_name || ''}`.trim();
    const orderNumber = order.order_number;
    
    console.log('Found order to cancel:', orderNumber, 'Customer:', customerName, 'Status:', order.status);
    
    // Step 2: Check if order can be cancelled
    const orderTime = new Date(order.created_at);
    const now = new Date();
    const hoursPassed = (now - orderTime) / (1000 * 60 * 60);
    
    if (order.status !== 'pending') {
      return new Response(JSON.stringify({
        error: 'Order cannot be cancelled as it is no longer pending',
        success: false,
        current_status: order.status
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    if (hoursPassed >= 1) {
      return new Response(JSON.stringify({
        error: 'Order cannot be cancelled as the 1-hour cancellation window has expired',
        success: false,
        hours_passed: hoursPassed.toFixed(2)
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Step 3: Cancel the order
    const updateData = {
      status: 'cancelled',
      updated_at: new Date().toISOString()
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
    const updatedOrder = updatedOrders[0];
    
    console.log('Order cancelled successfully:', orderNumber);
    
    // Step 4: Send email notifications
    let emailNotificationsSent = false;
    
    if (RESEND_API_KEY) {
      try {
        const orderDate = new Date(order.created_at).toLocaleDateString('en-GB');
        const totalOMR = (order.total_amount / 1000).toFixed(3);
        const cancelDate = new Date().toLocaleDateString('en-GB');
        const cancelTime = new Date().toLocaleTimeString('en-GB');
        
        // Admin email notification
        const adminEmailData = {
          from: 'Qotore Orders <orders@qotore.uk>',
          to: [ADMIN_EMAIL],
          subject: `❌ Order Cancelled: ${orderNumber} - ${customerName} - ${totalOMR} OMR`,
          html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: #f8f9fa; padding: 20px;">
              <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Order Cancelled</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">${orderNumber} • Cancelled on ${cancelDate}</p>
                </div>
                
                <div style="padding: 30px;">
                  <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #721c24;"><strong>Customer cancelled their order within the 1-hour window.</strong></p>
                  </div>
                  
                  <h2 style="color: #dc3545; margin-bottom: 20px;">Customer Information</h2>
                  <table style="width: 100%; margin-bottom: 30px;">
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Name:</td><td style="padding: 8px 0;">${customerName}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Phone:</td><td style="padding: 8px 0;"><a href="tel:${order.customer_phone}" style="color: #dc3545;">${order.customer_phone}</a></td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${order.customer_email}" style="color: #dc3545;">${order.customer_email}</a></td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Order Date:</td><td style="padding: 8px 0;">${orderDate}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Cancelled:</td><td style="padding: 8px 0;">${cancelDate} at ${cancelTime}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Total Amount:</td><td style="padding: 8px 0; font-weight: bold; color: #dc3545;">${totalOMR} OMR</td></tr>
                  </table>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="https://wa.me/${WHATSAPP_NUMBER}?text=Hello! Regarding cancelled order ${orderNumber}" 
                       style="background: #25D366; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-right: 10px; display: inline-block;">
                       📱 Contact Customer
                    </a>
                    <a href="https://qotore.uk/admin/orders" 
                       style="background: #6c757d; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                       📊 View All Orders
                    </a>
                  </div>
                </div>
              </div>
            </div>
          `
        };
        
        // Customer email notification
        const customerEmailData = {
          from: 'Qotore <orders@qotore.uk>',
          to: [order.customer_email],
          subject: `Order Cancelled: ${orderNumber} - Confirmation`,
          html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: #f8f9fa; padding: 20px;">
              <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%); color: white; padding: 30px; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Order Cancelled</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Your cancellation has been processed</p>
                </div>
                
                <div style="padding: 30px;">
                  <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    Dear ${customerName},<br><br>
                    Your order has been successfully cancelled as requested. No charges have been applied to your account.
                  </p>
                  
                  <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="color: #6c757d; margin: 0 0 15px 0;">Cancelled Order Details</h3>
                    <p style="margin: 5px 0;"><strong>Order Number:</strong> ${orderNumber}</p>
                    <p style="margin: 5px 0;"><strong>Order Date:</strong> ${orderDate}</p>
                    <p style="margin: 5px 0;"><strong>Cancelled Date:</strong> ${cancelDate} at ${cancelTime}</p>
                    <p style="margin: 5px 0;"><strong>Total Amount:</strong> ${totalOMR} OMR</p>
                  </div>
                  
                  <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #155724;"><strong>No Payment Required:</strong> Since your order was cancelled within the allowed timeframe, no payment has been processed.</p>
                  </div>
                  
                  <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    We're sorry to see you cancel your order. If you have any feedback or if there's anything we can do better, please don't hesitate to let us know.
                  </p>
                  
                  <div style="text-align: center; padding: 20px;">
                    <p style="color: #6c757d; margin-bottom: 10px;">Questions? Contact us:</p>
                    <p style="margin: 5px 0;"><strong>WhatsApp:</strong> <a href="https://wa.me/${WHATSAPP_NUMBER}" style="color: #8B4513;">+${WHATSAPP_NUMBER}</a></p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:orders@qotore.uk" style="color: #8B4513;">orders@qotore.uk</a></p>
                    <p style="margin: 20px 0 0 0; color: #8B4513;"><strong>We hope to serve you again soon!</strong></p>
                  </div>
                </div>
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
        cancelled_at: updatedOrder.updated_at,
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