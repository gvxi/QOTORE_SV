// functions/api/place-order-auth.js - Place order with user authentication
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Authenticated place order request received');

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
    
    // Validate required fields based on your table structure
    const required = [
      'user_id', 'customer_email', 'customer_first_name', 'customer_phone', 
      'delivery_city', 'delivery_region', 'delivery_address', 'total_amount', 'items'
    ];
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
        const existingOrder = activeOrders[0];
        return new Response(JSON.stringify({
          error: `You already have an active order (${existingOrder.order_number}). Please complete or cancel it before placing a new order.`,
          success: false,
          existing_order: existingOrder
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
    }
    
    // Step 2: Create the order based on your table structure
    const now = new Date().toISOString();
    
    const newOrder = {
      customer_first_name: orderData.customer_first_name,
      customer_last_name: orderData.customer_last_name || '',
      customer_phone: orderData.customer_phone,
      customer_email: orderData.customer_email,
      delivery_address: orderData.delivery_address,
      delivery_city: orderData.delivery_city,
      delivery_region: orderData.delivery_region,
      notes: orderData.order_notes || null,
      total_amount: orderData.total_amount,
      status: 'pending',
      created_at: now,
      updated_at: now,
      user_id: orderData.user_id,
      is_guest_order: false
    };
    
    console.log('Creating order with data:', newOrder);
    
    const orderResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(newOrder)
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
    const orderNumber = createdOrder.order_number;
    
    console.log('Order created successfully:', orderNumber, ', ID:', createdOrder.id);
    
    // Step 3: Create order items based on your table structure
    const orderItems = orderData.items.map(item => ({
      order_id: createdOrder.id,
      fragrance_id: item.fragrance_id || null,
      variant_id: item.variant_id || null,
      fragrance_name: item.fragrance_name,
      fragrance_brand: item.fragrance_brand || null,
      variant_size: item.variant_size,
      variant_price_cents: item.unit_price_cents,
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
      
      // Clean up the order since items failed
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
        const customerName = `${orderData.customer_first_name} ${orderData.customer_last_name || ''}`.trim();
        const orderDate = new Date(now).toLocaleDateString('en-GB');
        const totalOMR = (orderData.total_amount / 1000).toFixed(3);
        const deliveryType = orderData.delivery_type === 'home' ? 'Home Delivery' : 'Delivery Service';
        
        // Admin email notification
        const adminEmailData = {
          from: 'Qotore Orders <orders@qotore.uk>',
          to: [ADMIN_EMAIL],
          subject: `🛍️ New Order: ${orderNumber} - ${customerName} - ${totalOMR} OMR`,
          html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: #f8f9fa; padding: 20px;">
              <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 30px; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px; font-weight: bold;">New Order Received!</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">${orderNumber} • ${orderDate}</p>
                </div>
                
                <div style="padding: 30px;">
                  <h2 style="color: #8B4513; margin-bottom: 20px;">Customer Information</h2>
                  <table style="width: 100%; margin-bottom: 30px;">
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Name:</td><td style="padding: 8px 0;">${customerName}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Phone:</td><td style="padding: 8px 0;"><a href="tel:${orderData.customer_phone}" style="color: #8B4513;">${orderData.customer_phone}</a></td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${orderData.customer_email}" style="color: #8B4513;">${orderData.customer_email}</a></td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Address:</td><td style="padding: 8px 0;">${orderData.delivery_address}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">City:</td><td style="padding: 8px 0;">${orderData.delivery_city}, ${orderData.delivery_region}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Delivery:</td><td style="padding: 8px 0;">${deliveryType}</td></tr>
                    ${orderData.order_notes ? `<tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Notes:</td><td style="padding: 8px 0;">${orderData.order_notes}</td></tr>` : ''}
                  </table>
                  
                  <h2 style="color: #8B4513; margin-bottom: 15px;">Order Items</h2>
                  <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                    ${orderData.items.map(item => `
                      <div style="border-bottom: 1px solid #e9ecef; padding: 10px 0; display: flex; justify-content: space-between;">
                        <div>
                          <strong>${item.fragrance_name}</strong><br>
                          <span style="color: #6c757d;">${item.fragrance_brand} • ${item.variant_size}</span>
                        </div>
                        <div style="text-align: right;">
                          <div>Qty: ${item.quantity}</div>
                          <div style="color: #8B4513; font-weight: bold;">${(item.total_price_cents / 1000).toFixed(3)} OMR</div>
                        </div>
                      </div>
                    `).join('')}
                    <div style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #8B4513; font-size: 18px; font-weight: bold; color: #8B4513;">
                      Total: ${totalOMR} OMR
                    </div>
                  </div>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="https://wa.me/${WHATSAPP_NUMBER}?text=Hello! Regarding Order ${orderNumber}" 
                       style="background: #25D366; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-right: 10px; display: inline-block;">
                      📱 Contact Customer on WhatsApp
                    </a>
                    <a href="https://qotore.uk/admin/orders" 
                       style="background: #8B4513; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                      🛍️ Manage Order
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
          to: [orderData.customer_email],
          subject: `Order Confirmation: ${orderNumber} - Thank you for your order!`,
          html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: #f8f9fa; padding: 20px;">
              <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 30px; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Order Confirmed!</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for choosing Qotore</p>
                </div>
                
                <div style="padding: 30px;">
                  <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    Dear ${customerName},<br><br>
                    Your order has been successfully placed and is now being processed. We'll contact you soon to confirm delivery details.
                  </p>
                  
                  <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="color: #8B4513; margin: 0 0 15px 0;">Order Details</h3>
                    <p style="margin: 5px 0;"><strong>Order Number:</strong> ${orderNumber}</p>
                    <p style="margin: 5px 0;"><strong>Order Date:</strong> ${orderDate}</p>
                    <p style="margin: 5px 0;"><strong>Total Amount:</strong> ${totalOMR} OMR</p>
                    <p style="margin: 5px 0;"><strong>Items:</strong> ${orderData.items.length} item(s)</p>
                  </div>
                  
                  <h3 style="color: #8B4513; margin-bottom: 15px;">Your Items</h3>
                  <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                    ${orderData.items.map(item => `
                      <div style="border-bottom: 1px solid #e9ecef; padding: 10px 0; display: flex; justify-content: space-between;">
                        <div>
                          <strong>${item.fragrance_name}</strong><br>
                          <span style="color: #6c757d;">${item.fragrance_brand} • ${item.variant_size}</span>
                        </div>
                        <div style="text-align: right;">
                          <div>Qty: ${item.quantity}</div>
                          <div style="color: #8B4513; font-weight: bold;">${(item.total_price_cents / 1000).toFixed(3)} OMR</div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                  
                  <h3 style="color: #8B4513; margin-bottom: 15px;">Delivery Information</h3>
                  <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                    <p style="margin: 5px 0;"><strong>Address:</strong> ${orderData.delivery_address}</p>
                    <p style="margin: 5px 0;"><strong>City:</strong> ${orderData.delivery_city}, ${orderData.delivery_region}</p>
                    <p style="margin: 5px 0;"><strong>Delivery Type:</strong> ${deliveryType}</p>
                    ${orderData.order_notes ? `<p style="margin: 5px 0;"><strong>Your Notes:</strong> ${orderData.order_notes}</p>` : ''}
                  </div>
                  
                  <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #856404;"><strong>Important:</strong> You can cancel your order within 1 hour of placing it. After this time, please contact us directly for any changes.</p>
                  </div>
                  
                  <div style="text-align: center; padding: 20px;">
                    <p style="color: #6c757d; margin-bottom: 10px;">Need help? Contact us:</p>
                    <p style="margin: 5px 0;"><strong>WhatsApp:</strong> <a href="https://wa.me/${WHATSAPP_NUMBER}" style="color: #8B4513;">+${WHATSAPP_NUMBER}</a></p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:orders@qotore.uk" style="color: #8B4513;">orders@qotore.uk</a></p>
                    <p style="margin: 20px 0 0 0; color: #8B4513;"><strong>Thank you for choosing Qotore!</strong></p>
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
          console.log('Email notifications sent successfully');
        } else {
          console.warn('Some email notifications failed to send');
        }
        
      } catch (emailError) {
        console.error('Email notification error:', emailError);
      }
    }
    
    console.log('Order created successfully:', orderNumber);
    
    // Return success response with full order data
    const fullOrder = {
      ...createdOrder,
      order_items: orderData.items.map((item, index) => ({
        ...orderItems[index],
        id: index + 1 // Temporary ID since we don't get the real IDs back
      }))
    };
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Order placed successfully!',
      order: fullOrder,
      data: {
        order_id: createdOrder.id,
        order_number: orderNumber,
        status: 'pending',
        total_amount: orderData.total_amount,
        customer_name: `${orderData.customer_first_name} ${orderData.customer_last_name || ''}`.trim(),
        items_count: orderData.items.length,
        email_sent: emailNotificationsSent,
        created_at: createdOrder.created_at
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