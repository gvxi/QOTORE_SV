// functions/api/send-admin-notification.js - Send email notification to admin using Gmail SMTP
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
    const GMAIL_USER = env.GMAIL_USER; // Your Gmail address
    const GMAIL_APP_PASSWORD = env.GMAIL_APP_PASSWORD; // Gmail App Password

    // Validate required environment variables
    if (!ADMIN_EMAIL || !GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.error('Missing required environment variables');
      return new Response(JSON.stringify({
        error: 'Email service not configured',
        success: false,
        debug: {
          hasAdminEmail: !!ADMIN_EMAIL,
          hasGmailUser: !!GMAIL_USER,
          hasGmailPassword: !!GMAIL_APP_PASSWORD,
          adminEmail: ADMIN_EMAIL ? ADMIN_EMAIL.replace(/@.+/, '@***') : 'Not set',
          gmailUser: GMAIL_USER ? GMAIL_USER.replace(/@.+/, '@***') : 'Not set'
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
        <td style="padding: 8px; font-weight: 500;">${item.fragrance_name}</td>
        <td style="padding: 8px; color: #666;">${item.fragrance_brand || ''}</td>
        <td style="padding: 8px; text-align: center;">${item.variant_size}</td>
        <td style="padding: 8px; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; text-align: right;">${(item.total_price_cents / 1000).toFixed(3)} OMR</td>
      </tr>
    `).join('');

    // Create email HTML content
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>New Order Notification - ${order_number}</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 600;">🛒 New Order Received</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Order #${order_number}</p>
        </div>
        
        <!-- Order Details -->
        <div style="padding: 30px;">
          
          <!-- Order Info -->
          <div style="margin-bottom: 30px;">
            <h2 style="color: #2d3748; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #8B4513; padding-bottom: 8px;">📋 Order Information</h2>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #8B4513;">
              <p style="margin: 5px 0;"><strong>Order Number:</strong> ${order_number}</p>
              <p style="margin: 5px 0;"><strong>Order Date:</strong> ${orderDate}</p>
              <p style="margin: 5px 0;"><strong>Total Amount:</strong> <span style="color: #8B4513; font-weight: 600; font-size: 18px;">${total_amount_omr} OMR</span></p>
            </div>
          </div>
          
          <!-- Customer Details -->
          <div style="margin-bottom: 30px;">
            <h2 style="color: #2d3748; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #8B4513; padding-bottom: 8px;">👤 Customer Information</h2>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
              <p style="margin: 5px 0;"><strong>Name:</strong> ${customer.first_name} ${customer.last_name || ''}</p>
              <p style="margin: 5px 0;"><strong>Phone:</strong> <a href="tel:${customer.phone}" style="color: #8B4513; text-decoration: none;">${customer.phone}</a></p>
              ${customer.email ? `<p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${customer.email}" style="color: #8B4513; text-decoration: none;">${customer.email}</a></p>` : ''}
            </div>
          </div>
          
          <!-- Delivery Details -->
          <div style="margin-bottom: 30px;">
            <h2 style="color: #2d3748; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #8B4513; padding-bottom: 8px;">🚚 Delivery Information</h2>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
              <p style="margin: 5px 0;"><strong>Address:</strong> ${delivery.address}</p>
              <p style="margin: 5px 0;"><strong>City:</strong> ${delivery.city}</p>
              ${delivery.region ? `<p style="margin: 5px 0;"><strong>Region:</strong> ${delivery.region}</p>` : ''}
              ${delivery.notes ? `<p style="margin: 5px 0;"><strong>Notes:</strong> <em>${delivery.notes}</em></p>` : ''}
            </div>
          </div>
          
          <!-- Order Items -->
          <div style="margin-bottom: 30px;">
            <h2 style="color: #2d3748; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #8B4513; padding-bottom: 8px;">🌸 Order Items</h2>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: #8B4513; color: white;">
                    <th style="padding: 12px 8px; text-align: left; font-weight: 600;">Fragrance</th>
                    <th style="padding: 12px 8px; text-align: left; font-weight: 600;">Brand</th>
                    <th style="padding: 12px 8px; text-align: center; font-weight: 600;">Size</th>
                    <th style="padding: 12px 8px; text-align: center; font-weight: 600;">Qty</th>
                    <th style="padding: 12px 8px; text-align: right; font-weight: 600;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr style="background: #f8f9fa; font-weight: 600;">
                    <td colspan="4" style="padding: 12px 8px; text-align: right; border-top: 2px solid #8B4513;">Total Amount:</td>
                    <td style="padding: 12px 8px; text-align: right; color: #8B4513; font-size: 16px; border-top: 2px solid #8B4513;">${total_amount_omr} OMR</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          <!-- Quick Actions -->
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; margin-bottom: 20px;">Quick Actions:</p>
            <div style="display: inline-flex; gap: 15px; flex-wrap: wrap; justify-content: center;">
              <a href="https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(customer.first_name)}%2C%20we%20received%20your%20order%20${order_number}.%20We%20will%20process%20it%20soon!" 
                 style="background: #25D366; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                📱 Contact Customer
              </a>
              <a href="${env.SITE_URL || 'https://qotore.com'}/admin/orders-management.html" 
                 style="background: #8B4513; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                📋 Manage Orders
              </a>
            </div>
          </div>
          
        </div>
        
        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="margin: 0; color: #666; font-size: 14px;">This is an automated notification from Qotore Admin System</p>
          <p style="margin: 5px 0 0 0; color: #999; font-size: 12px;">Order received at ${orderDate} (Oman Time)</p>
        </div>
        
      </div>
    </body>
    </html>
    `;

    // Create email message using EmailJS API (which works with Gmail)
    const emailMessage = {
      to: ADMIN_EMAIL,
      from: GMAIL_USER,
      subject: `🛒 New Order ${order_number} - ${total_amount_omr} OMR`,
      html: emailHtml,
      text: `
New Order Received - ${order_number}
=====================================

Order Information:
- Order Number: ${order_number}
- Order Date: ${orderDate}
- Total Amount: ${total_amount_omr} OMR

Customer Information:
- Name: ${customer.first_name} ${customer.last_name || ''}
- Phone: ${customer.phone}
${customer.email ? `- Email: ${customer.email}` : ''}

Delivery Information:
- Address: ${delivery.address}
- City: ${delivery.city}
${delivery.region ? `- Region: ${delivery.region}` : ''}
${delivery.notes ? `- Notes: ${delivery.notes}` : ''}

Order Items:
${items.map(item => 
  `- ${item.fragrance_name} (${item.fragrance_brand || 'N/A'}) - ${item.variant_size} x${item.quantity} = ${(item.total_price_cents / 1000).toFixed(3)} OMR`
).join('\n')}

Total: ${total_amount_omr} OMR

Contact customer: https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}
Manage orders: ${env.SITE_URL || 'https://qotore.com'}/admin/orders-management.html

---
This is an automated notification from Qotore Admin System
Order received at ${orderDate} (Oman Time)
      `
    };

    // Send email using EmailJS service (which supports Gmail)
    const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service_id: env.EMAILJS_SERVICE_ID || 'gmail',
        template_id: env.EMAILJS_TEMPLATE_ID || 'template_order_notification',
        user_id: env.EMAILJS_PUBLIC_KEY,
        accessToken: env.EMAILJS_PRIVATE_KEY,
        template_params: {
          to_email: ADMIN_EMAIL,
          from_email: GMAIL_USER,
          subject: emailMessage.subject,
          message_html: emailMessage.html,
          message_text: emailMessage.text,
          order_number: order_number,
          total_amount: total_amount_omr,
          customer_name: `${customer.first_name} ${customer.last_name || ''}`,
          customer_phone: customer.phone
        }
      })
    });

    // If EmailJS fails, try direct SMTP approach
    if (!emailResponse.ok) {
      console.log('EmailJS failed, trying direct Gmail approach...');
      
      // Create SMTP email using simple Gmail API approach
      const gmailApiResponse = await sendViaGmailAPI({
        to: ADMIN_EMAIL,
        from: GMAIL_USER,
        subject: emailMessage.subject,
        html: emailMessage.html,
        accessToken: GMAIL_APP_PASSWORD
      });

      if (!gmailApiResponse.success) {
        return new Response(JSON.stringify({
          error: 'Failed to send email notification via Gmail',
          success: false,
          details: gmailApiResponse.error,
          troubleshooting: {
            check_app_password: 'Verify Gmail App Password is correct',
            check_2fa: 'Ensure 2-Factor Authentication is enabled on Gmail',
            check_permissions: 'Verify Gmail account has necessary permissions'
          }
        }), {
          status: 500,
          headers: corsHeaders
        });
      }

      console.log('Email sent successfully via Gmail API');
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Admin notification sent successfully via Gmail',
        sent_to: ADMIN_EMAIL,
        method: 'Gmail API'
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    const emailResult = await emailResponse.json();
    console.log('Email sent successfully via EmailJS:', emailResult);

    return new Response(JSON.stringify({
      success: true,
      message: 'Admin notification sent successfully via EmailJS',
      sent_to: ADMIN_EMAIL,
      method: 'EmailJS'
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

// Simple Gmail API sending function (fallback)
async function sendViaGmailAPI({ to, from, subject, html, accessToken }) {
  try {
    // This is a simplified approach - in production you'd want to use proper OAuth2
    const message = `To: ${to}\r\nFrom: ${from}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${html}`;
    const encodedMessage = btoa(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedMessage
      })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const error = await response.text();
      return { success: false, error };
    }
  } catch (error) {
    return { success: false, error: error.message };
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
    message: 'Gmail notification endpoint is working!',
    method: 'POST /api/send-admin-notification to send order notifications via Gmail',
    environment_check: {
      hasAdminEmail: !!env.ADMIN_EMAIL,
      hasGmailUser: !!env.GMAIL_USER,
      hasGmailPassword: !!env.GMAIL_APP_PASSWORD,
      adminEmail: env.ADMIN_EMAIL ? env.ADMIN_EMAIL.replace(/@.+/, '@***') : 'Not set',
      gmailUser: env.GMAIL_USER ? env.GMAIL_USER.replace(/@.+/, '@***') : 'Not set'
    },
    required_env_vars: [
      'ADMIN_EMAIL - Email address to receive order notifications',
      'GMAIL_USER - Your Gmail address (e.g., yourname@gmail.com)',
      'GMAIL_APP_PASSWORD - Gmail App Password (not your regular password)'
    ],
    setup_instructions: [
      '1. Enable 2-Factor Authentication on your Gmail account',
      '2. Generate an App Password in Gmail Settings > Security',
      '3. Use the App Password (not your regular Gmail password)',
      '4. Set GMAIL_USER to your full Gmail address',
      '5. Set ADMIN_EMAIL to where you want to receive notifications'
    ],
    note: 'Gmail App Passwords are required when using SMTP with 2FA enabled'
  }), { 
    headers: corsHeaders
  });
}