// functions/api/place-order-auth.js - Place order with user authentication
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Authenticated place order request received');

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
    let orderData;
    try {
      const text = await context.request.text();
      orderData = JSON.parse(text);
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
    const required = ['user_id', 'customer_email', 'customer_first_name', 'customer_phone', 'delivery_city', 'delivery_region', 'total_amount', 'items'];
    const missing = required.filter(field => !orderData[field]);
    
    if (missing.length > 0) {
      return new Response(JSON.stringify({
        error: `Missing required fields: ${missing.join(', ')}`,
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      return new Response(JSON.stringify({
        error: 'Order must contain at least one item',
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    console.log('Creating order for user:', orderData.user_id);
    
    // Step 1: Check if user already has an active order
    const activeOrderCheck = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?user_id=eq.${orderData.user_id}&status=in.(pending,reviewed)&select=id,order_number,status`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );
    
    if (activeOrderCheck.ok) {
      const activeOrders = await activeOrderCheck.json();
      if (activeOrders.length > 0) {
        return new Response(JSON.stringify({
          error: 'You already have an active order. Please complete or cancel it before placing a new order.',
          active_order: activeOrders[0],
          success: false
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
    }
    
    const now = new Date().toISOString();
    
    // Generate order number
    const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;
    
    // Step 2: Create the order
    const orderPayload = {
      user_id: orderData.user_id,
      customer_email: orderData.customer_email,
      customer_first_name: orderData.customer_first_name,
      customer_last_name: orderData.customer_last_name || null,
      customer_phone: orderData.customer_phone,
      delivery_city: orderData.delivery_city,
      delivery_region: orderData.delivery_region,
      delivery_type: orderData.delivery_type || 'home',
      delivery_notes: orderData.delivery_notes || null,
      total_amount: orderData.total_amount,
      status: 'pending',
      order_number: orderNumber,
      created_at: now,
      updated_at: now
    };
    
    console.log('Creating order with payload:', orderPayload);
    
    const orderResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(orderPayload)
    });
    
    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('Failed to create order:', errorText);
      
      return new Response(JSON.stringify({
        error: 'Failed to create order',
        details: errorText,
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    
    const createdOrders = await orderResponse.json();
    const createdOrder = createdOrders[0];
    console.log('Order created:', createdOrder.id);
    
    // Step 3: Create order items
    const orderItems = orderData.items.map(item => ({
      order_id: createdOrder.id,
      fragrance_id: item.fragrance_id,
      variant_id: item.variant_id,
      fragrance_name: item.fragrance_name,
      fragrance_brand: item.fragrance_brand || null,
      variant_size: item.variant_size,
      variant_price_cents: item.variant_price_cents,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      total_price_cents: item.total_price_cents,
      is_whole_bottle: item.is_whole_bottle || false,
      created_at: now
    }));
    
    console.log('Creating order items:', orderItems.length);
    
    const itemsResponse = await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify(orderItems)
    });
    
    if (!itemsResponse.ok) {
      const errorText = await itemsResponse.text();
      console.error('Failed to create order items:', errorText);
      
      // Try to clean up the order since items failed
      await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${createdOrder.id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      
      return new Response(JSON.stringify({
        error: 'Failed to create order items',
        details: errorText,
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    
    // Step 4: Send email notifications
    let emailNotificationsSent = false;
    
    if (RESEND_API_KEY) {
      try {
        // Prepare email content
        const customerName = `${orderData.customer_first_name} ${orderData.customer_last_name || ''}`.trim();
        const totalOMR = (orderData.total_amount / 1000).toFixed(3);
        
        // Generate items list for email
        let itemsList = '';
        orderData.items.forEach(item => {
          const itemPrice = (item.unit_price_cents / 1000).toFixed(3);
          const itemTotal = (item.total_price_cents / 1000).toFixed(3);
          itemsList += `• ${item.fragrance_name} (${item.fragrance_brand}) - ${item.variant_size}\n  Quantity: ${item.quantity} × ${itemPrice} OMR = ${itemTotal} OMR\n\n`;
        });
        
        // Send notification to admin
        const adminEmailData = {
          from: 'Qotore Orders <orders@qotore.uk>',
          to: [ADMIN_EMAIL],
          subject: `🛒 New Order: ${orderNumber} - ${customerName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px; border-radius: 12px;">
              <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 20px; border-radius: 8px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">🛒 New Order Received</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Order #${orderNumber}</p>
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #8B4513; margin-top: 0;">Customer Information</h2>
                <p><strong>Name:</strong> ${customerName}</p>
                <p><strong>Email:</strong> ${orderData.customer_email}</p>
                <p><strong>Phone:</strong> ${orderData.customer_phone}</p>
                <p><strong>Location:</strong> ${orderData.delivery_city}, ${orderData.delivery_region}</p>
                <p><strong>Delivery:</strong> ${orderData.delivery_type === 'home' ? 'Home Delivery' : 'Delivery Service'}</p>
                ${orderData.delivery_notes ? `<p><strong>Notes:</strong> ${orderData.delivery_notes}</p>` : ''}
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #8B4513; margin-top: 0;">Order Items</h2>
                <div style="white-space: pre-line; font-family: monospace; background: #f8f9fa; padding: 15px; border-radius: 6px;">${itemsList}</div>
                <div style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #8B4513;">
                  <strong style="font-size: 18px; color: #28a745;">Total: ${totalOMR} OMR</strong>
                </div>
              </div>
              
              <div style="text-align: center; padding: 20px; background: #d4edda; border-radius: 8px; border: 1px solid #c3e6cb;">
                <p style="margin: 0; color: #155724;">
                  <strong>Action Required:</strong> Please review this order and update its status in the admin panel.
                </p>
              </div>
            </div>
          `
        };
        
        // Send notification to customer
        const customerEmailData = {
          from: 'Qotore <orders@qotore.uk>',
          to: [orderData.customer_email],
          subject: `Order Confirmation - ${orderNumber} | Qotore`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px; border-radius: 12px;">
              <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 20px; border-radius: 8px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">Thank You for Your Order!</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Order #${orderNumber}</p>
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #8B4513; margin-top: 0;">Hello ${customerName},</h2>
                <p>We have received your order and it is now being processed. We will contact you soon to confirm the details and arrange delivery.</p>
                
                <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 6px; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; color: #0c5460;"><strong>Order Status:</strong> Pending Review</p>
                </div>
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #8B4513; margin-top: 0;">Order Summary</h2>
                <div style="white-space: pre-line; font-family: monospace; background: #f8f9fa; padding: 15px; border-radius: 6px;">${itemsList}</div>
                <div style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #8B4513;">
                  <strong style="font-size: 18px; color: #28a745;">Total: ${totalOMR} OMR</strong>
                </div>
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #8B4513; margin-top: 0;">Delivery Information</h2>
                <p><strong>Location:</strong> ${orderData.delivery_city}, ${orderData.delivery_region}</p>
                <p><strong>Method:</strong> ${orderData.delivery_type === 'home' ? 'Home Delivery (Free)' : 'Delivery Service'}</p>
                ${orderData.delivery_notes ? `<p><strong>Your Notes:</strong> ${orderData.delivery_notes}</p>` : ''}
              </div>
              
              <div style="text-align: center; padding: 20px;">
                <p style="color: #6c757d; margin-bottom: 10px;">Need help? Contact us:</p>
                <p style="margin: 5px 0;"><strong>WhatsApp:</strong> +968 9222 5949</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> orders@qotore.uk</p>
                <p style="margin: 20px 0 0 0; color: #8B4513;"><strong>Thank you for choosing Qotore!</strong></p>
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
          console.log('Email notifications sent successfully');
        } else {
          console.warn('Some email notifications failed to send');
        }
        
      } catch (emailError) {
        console.error('Email notification error:', emailError);
      }
    }
    
    console.log('Order created successfully:', orderNumber);
    
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Order placed successfully!',
      data: {
        order_id: createdOrder.id,
        order_number: orderNumber,
        status: 'pending',
        total_amount: orderData.total_amount,
        customer_name: `${orderData.customer_first_name} ${orderData.customer_last_name || ''}`.trim(),
        items_count: orderData.items.length,
        email_sent: emailNotificationsSent
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Error in place-order-auth:', error);
    
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