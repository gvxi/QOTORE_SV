// functions/api/send-admin-notification.js - Send email notification to admin using Resend
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Admin notification request received');

    // Get environment variables
    const { env } = context;
    const ADMIN_EMAIL = env.ADMIN_EMAIL;
    const RESEND_API_KEY = env.RESEND_API_KEY;
    const FROM_EMAIL = env.FROM_EMAIL || 'Qotore Orders <orders@resend.dev>';

    // Validate required environment variables
    if (!ADMIN_EMAIL || !RESEND_API_KEY) {
      console.error('Missing required environment variables');
      return new Response(JSON.stringify({
        error: 'Email service not configured',
        success: false,
        debug: {
          hasAdminEmail: !!ADMIN_EMAIL,
          hasResendKey: !!RESEND_API_KEY,
          hasFromEmail: !!FROM_EMAIL,
          adminEmail: ADMIN_EMAIL ? ADMIN_EMAIL.replace(/@.+/, '@***') : 'Not set',
          fromEmail: FROM_EMAIL ? FROM_EMAIL.replace(/@.+/, '@***') : 'Not set'
        }
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // Parse request data
    let orderData;
    try {
      const text = await context.request.text();
      if (!text || text.trim() === '') {
        return new Response(JSON.stringify({ 
          error: 'No order data provided',
          success: false
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      orderData = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid order data format',
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Validate order data structure
    const { order_number, customer, delivery, items, total_amount_omr, created_at } = orderData;
    
    if (!order_number || !customer || !delivery || !items || !total_amount_omr) {
      return new Response(JSON.stringify({
        error: 'Missing required order fields',
        success: false,
        required: ['order_number', 'customer', 'delivery', 'items', 'total_amount_omr']
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Preparing email for order:', order_number);

    // Format order date
    const orderDate = new Date(created_at).toLocaleString('en-GB', {
      timeZone: 'Asia/Muscat',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Format items for email
    const itemsHtml = items.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px 8px; font-weight: 500;">${item.fragrance_name}</td>
        <td style="padding: 12px 8px; color: #666;">${item.fragrance_brand || ''}</td>
        <td style="padding: 12px 8px; text-align: center;">${item.variant_size}</td>
        <td style="padding: 12px 8px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 8px; text-align: right; font-weight: 500;">${(item.total_price_cents / 1000).toFixed(3)} OMR</td>
      </tr>
    `).join('');

    // Create professional HTML email
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>New Order ${order_number}</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa; line-height: 1.6;">
      <div style="max-width: 650px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 600;">🛒 New Order Received</h1>
          <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.9;">Order #${order_number}</p>
        </div>
        
        <!-- Order Summary -->
        <div style="padding: 30px;">
          
          <!-- Quick Stats -->
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #8B4513;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
              <div>
                <h2 style="margin: 0; color: #8B4513; font-size: 20px;">Order #${order_number}</h2>
                <p style="margin: 5px 0 0 0; color: #666;">${orderDate}</p>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 24px; font-weight: 700; color: #8B4513;">${total_amount_omr} OMR</div>
                <div style="font-size: 14px; color: #666;">${items.length} item${items.length > 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>
          
          <!-- Customer Information -->
          <div style="margin-bottom: 30px;">
            <h3 style="color: #2d3748; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #8B4513; padding-bottom: 8px;">👤 Customer Information</h3>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
              <p style="margin: 8px 0;"><strong>Name:</strong> ${customer.first_name} ${customer.last_name || ''}</p>
              <p style="margin: 8px 0;"><strong>Phone:</strong> <a href="tel:${customer.phone}" style="color: #8B4513; text-decoration: none; font-weight: 500;">${customer.phone}</a></p>
              ${customer.email ? `<p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${customer.email}" style="color: #8B4513; text-decoration: none;">${customer.email}</a></p>` : ''}
            </div>
          </div>
          
          <!-- Delivery Information -->
          <div style="margin-bottom: 30px;">
            <h3 style="color: #2d3748; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #8B4513; padding-bottom: 8px;">🚚 Delivery Information</h3>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
              <p style="margin: 8px 0;"><strong>Address:</strong> ${delivery.address}</p>
              <p style="margin: 8px 0;"><strong>City:</strong> ${delivery.city}</p>
              ${delivery.region ? `<p style="margin: 8px 0;"><strong>Region:</strong> ${delivery.region}</p>` : ''}
              ${delivery.notes ? `<p style="margin: 8px 0;"><strong>Special Notes:</strong> <em>${delivery.notes}</em></p>` : ''}
            </div>
          </div>
          
          <!-- Order Items -->
          <div style="margin-bottom: 30px;">
            <h3 style="color: #2d3748; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #8B4513; padding-bottom: 8px;">🌸 Order Items</h3>
            <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #eee;">
              <table style="width: 100%; border-collapse: collapse; background: white;">
                <thead>
                  <tr style="background: #8B4513; color: white;">
                    <th style="padding: 15px 8px; text-align: left; font-weight: 600;">Fragrance</th>
                    <th style="padding: 15px 8px; text-align: left; font-weight: 600;">Brand</th>
                    <th style="padding: 15px 8px; text-align: center; font-weight: 600;">Size</th>
                    <th style="padding: 15px 8px; text-align: center; font-weight: 600;">Qty</th>
                    <th style="padding: 15px 8px; text-align: right; font-weight: 600;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr style="background: #f8f9fa; font-weight: 600;">
                    <td colspan="4" style="padding: 15px 8px; text-align: right; border-top: 2px solid #8B4513; font-size: 16px;">Total Amount:</td>
                    <td style="padding: 15px 8px; text-align: right; color: #8B4513; font-size: 18px; border-top: 2px solid #8B4513; font-weight: 700;">${total_amount_omr} OMR</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          <!-- Quick Actions -->
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; margin-bottom: 20px; font-size: 16px;">Quick Actions:</p>
            <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
              <a href="https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(customer.first_name)}%2C%20we%20received%20your%20order%20${order_number}.%20We%20will%20process%20it%20soon!" 
                 style="background: #25D366; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;">
                📱 Contact Customer
              </a>
              <a href="${env.SITE_URL || 'https://qotore.com'}/admin/orders-management.html" 
                 style="background: #8B4513; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;">
                📋 Manage Orders
              </a>
            </div>
          </div>
          
        </div>
        
        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #eee;">
          <p style="margin: 0; color: #666; font-size: 14px; font-weight: 500;">Qotore Admin Notification System</p>
          <p style="margin: 8px 0 0 0; color: #999; font-size: 12px;">Order received at ${orderDate} (Oman Time)</p>
        </div>
        
      </div>
    </body>
    </html>
    `;

    // Create plain text version
    const emailText = `
NEW ORDER RECEIVED - ${order_number}
${'='.repeat(50)}

Order Information:
• Order Number: ${order_number}
• Order Date: ${orderDate}
• Total Amount: ${total_amount_omr} OMR

Customer Information:
• Name: ${customer.first_name} ${customer.last_name || ''}
• Phone: ${customer.phone}
${customer.email ? `• Email: ${customer.email}` : ''}

Delivery Information:
• Address: ${delivery.address}
• City: ${delivery.city}
${delivery.region ? `• Region: ${delivery.region}` : ''}
${delivery.notes ? `• Notes: ${delivery.notes}` : ''}

Order Items:
${items.map((item, index) => 
  `${index + 1}. ${item.fragrance_name} (${item.fragrance_brand || 'N/A'})
   Size: ${item.variant_size} | Quantity: ${item.quantity} | Total: ${(item.total_price_cents / 1000).toFixed(3)} OMR`
).join('\n\n')}

TOTAL: ${total_amount_omr} OMR

Quick Actions:
• Contact Customer: https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}
• Manage Orders: ${env.SITE_URL || 'https://qotore.com'}/admin/orders-management.html

---
This is an automated notification from Qotore Admin System
Order received at ${orderDate} (Oman Time)
    `;

    // Send email using Resend
    console.log('Sending email via Resend API...');
    
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: `🛒 New Order ${order_number} - ${total_amount_omr} OMR`,
        html: emailHtml,
        text: emailText,
        tags: [
          { name: 'category', value: 'order-notification' },
          { name: 'order_number', value: order_number }
        ]
      })
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json().catch(() => ({}));
      const errorText = await resendResponse.text().catch(() => 'Unknown error');
      
      console.error('Resend API error:', resendResponse.status, errorData, errorText);
      
      return new Response(JSON.stringify({
        error: 'Failed to send email via Resend',
        success: false,
        details: errorData.message || errorText,
        status: resendResponse.status,
        troubleshooting: {
          check_api_key: 'Verify RESEND_API_KEY is correct and active',
          check_from_email: 'Verify FROM_EMAIL domain is verified in Resend',
          check_admin_email: 'Verify ADMIN_EMAIL is a valid email address',
          resend_setup: 'Ensure your Resend account is properly configured'
        },
        resend_setup_guide: [
          '1. Sign up at https://resend.com',
          '2. Verify your sending domain',
          '3. Generate an API key',
          '4. Set RESEND_API_KEY environment variable',
          '5. Set FROM_EMAIL to use your verified domain'
        ]
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const result = await resendResponse.json();
    console.log('Email sent successfully via Resend:', result.id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Admin notification sent successfully via Resend',
      email_id: result.id,
      sent_to: ADMIN_EMAIL,
      sent_from: FROM_EMAIL,
      order_number: order_number,
      method: 'Resend API'
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Send notification error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to send admin notification: ' + error.message,
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

// Test endpoint with CORS headers
export async function onRequestGet(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  const { env } = context;
  
  return new Response(JSON.stringify({
    message: 'Resend notification endpoint is working!',
    method: 'POST /api/send-admin-notification to send order notifications via Resend',
    environment_check: {
      hasAdminEmail: !!env.ADMIN_EMAIL,
      hasResendKey: !!env.RESEND_API_KEY,
      hasFromEmail: !!env.FROM_EMAIL,
      adminEmail: env.ADMIN_EMAIL ? env.ADMIN_EMAIL.replace(/@.+/, '@***') : 'Not set',
      fromEmail: env.FROM_EMAIL ? env.FROM_EMAIL.replace(/@.+/, '@***') : 'Not set'
    },
    required_env_vars: [
      'ADMIN_EMAIL - Email address to receive order notifications',
      'RESEND_API_KEY - Your Resend API key',
      'FROM_EMAIL - Verified sender email (e.g., orders@yourdomain.com)'
    ],
    optional_env_vars: [
      'RESEND_DOMAIN - Your verified domain (if using subdomain)',
      'SITE_URL - Your website URL for admin panel links'
    ],
    setup_instructions: [
      '1. Create account at https://resend.com',
      '2. Add and verify your domain',
      '3. Generate API key in Resend dashboard',
      '4. Set environment variables in Cloudflare Workers',
      '5. Test using the test endpoint'
    ],
    features: [
      'Professional HTML emails with beautiful styling',
      'Plain text fallback for all email clients',
      'Order tracking with tags and metadata',
      'High deliverability and reliability',
      'Detailed error reporting and troubleshooting'
    ]
  }), { 
    headers: corsHeaders
  });
}