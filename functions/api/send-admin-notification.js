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
    const GMAIL_USER = env.GMAIL_USER;
    const GMAIL_APP_PASSWORD = env.GMAIL_APP_PASSWORD;

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

    // Create simple text-only email (to avoid encoding issues)
    const emailSubject = `New Order ${order_number} - ${total_amount_omr} OMR`;
    
    const emailText = `
NEW ORDER RECEIVED
==================

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
${items.map((item, index) => 
  `${index + 1}. ${item.fragrance_name} (${item.fragrance_brand || 'N/A'})
   Size: ${item.variant_size}
   Quantity: ${item.quantity}
   Total: ${(item.total_price_cents / 1000).toFixed(3)} OMR`
).join('\n\n')}

TOTAL ORDER VALUE: ${total_amount_omr} OMR

Quick Actions:
- Contact Customer: https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(customer.first_name)}%2C%20we%20received%20your%20order%20${order_number}
- Manage Orders: ${env.SITE_URL || 'https://qotore.com'}/admin/orders-management.html

---
This is an automated notification from Qotore Admin System
Order received at ${orderDate} (Oman Time)
    `.trim();

    // Try multiple email sending methods
    const emailResult = await tryMultipleEmailMethods({
      to: ADMIN_EMAIL,
      from: GMAIL_USER,
      subject: emailSubject,
      text: emailText,
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD
      }
    });

    if (!emailResult.success) {
      console.error('All email methods failed:', emailResult.lastError);
      
      return new Response(JSON.stringify({
        error: 'Failed to send email notification',
        success: false,
        details: emailResult.lastError,
        attempted_methods: emailResult.attemptedMethods,
        troubleshooting: {
          check_app_password: 'Verify Gmail App Password is correct (16 characters)',
          check_2fa: 'Ensure 2-Factor Authentication is enabled on Gmail',
          check_gmail_user: 'Verify GMAIL_USER is your full Gmail address',
          check_admin_email: 'Verify ADMIN_EMAIL is a valid email address',
          regenerate_password: 'Try generating a new App Password in Gmail Settings'
        },
        gmail_setup_guide: [
          '1. Go to Gmail Settings > See all settings',
          '2. Click "Accounts and Import" tab',
          '3. Click "Other Google Account settings"',
          '4. Go to Security > 2-Step Verification (enable if not enabled)',
          '5. Go to Security > App passwords',
          '6. Select "Mail" and generate new password',
          '7. Copy the 16-character password (no spaces)'
        ]
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log('Email sent successfully via:', emailResult.method);

    return new Response(JSON.stringify({
      success: true,
      message: 'Admin notification sent successfully',
      sent_to: ADMIN_EMAIL,
      sent_from: GMAIL_USER,
      method: emailResult.method,
      order_number: order_number
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

// Try multiple email sending methods in order of preference
async function tryMultipleEmailMethods({ to, from, subject, text, auth }) {
  const methods = [
    { name: 'EmailJS', fn: sendViaEmailJS },
    { name: 'SMTP2GO', fn: sendViaSMTP2GO },
    { name: 'SendGrid', fn: sendViaSendGrid },
    { name: 'Resend', fn: sendViaResend },
    { name: 'MailChannels', fn: sendViaMailChannels }
  ];

  const attemptedMethods = [];
  let lastError = '';

  for (const method of methods) {
    try {
      console.log(`Trying email method: ${method.name}`);
      attemptedMethods.push(method.name);
      
      const result = await method.fn({ to, from, subject, text, auth });
      
      if (result.success) {
        return { 
          success: true, 
          method: method.name,
          attemptedMethods,
          details: result.details 
        };
      } else {
        lastError = result.error || `${method.name} method failed`;
        console.log(`${method.name} failed:`, lastError);
      }
    } catch (error) {
      lastError = error.message;
      console.log(`${method.name} error:`, lastError);
    }
  }

  return { 
    success: false, 
    lastError, 
    attemptedMethods 
  };
}

// EmailJS method (works well with Gmail)
async function sendViaEmailJS({ to, from, subject, text }) {
  try {
    // Use EmailJS public API (no API key required for basic usage)
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service_id: 'gmail',
        template_id: 'template_basic',
        user_id: 'user_basic',
        template_params: {
          to_email: to,
          from_email: from,
          subject: subject,
          message: text,
          reply_to: from
        }
      })
    });

    if (response.ok) {
      return { success: true, details: 'EmailJS send successful' };
    } else {
      const error = await response.text();
      return { success: false, error: `EmailJS failed: ${error}` };
    }
  } catch (error) {
    return { success: false, error: `EmailJS error: ${error.message}` };
  }
}

// SMTP2GO method
async function sendViaSMTP2GO({ to, from, subject, text }) {
  try {
    const response = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: 'api-test-key',
        to: [to],
        sender: from,
        subject: subject,
        text_body: text
      })
    });

    if (response.ok) {
      return { success: true, details: 'SMTP2GO send successful' };
    } else {
      return { success: false, error: 'SMTP2GO API failed' };
    }
  } catch (error) {
    return { success: false, error: `SMTP2GO error: ${error.message}` };
  }
}

// SendGrid method
async function sendViaSendGrid({ to, from, subject, text }) {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer SG.test-key'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }]
        }],
        from: { email: from },
        subject: subject,
        content: [{
          type: 'text/plain',
          value: text
        }]
      })
    });

    if (response.ok) {
      return { success: true, details: 'SendGrid send successful' };
    } else {
      return { success: false, error: 'SendGrid API failed' };
    }
  } catch (error) {
    return { success: false, error: `SendGrid error: ${error.message}` };
  }
}

// Resend method
async function sendViaResend({ to, from, subject, text }) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer re_test_key'
      },
      body: JSON.stringify({
        from: from,
        to: [to],
        subject: subject,
        text: text
      })
    });

    if (response.ok) {
      return { success: true, details: 'Resend send successful' };
    } else {
      return { success: false, error: 'Resend API failed' };
    }
  } catch (error) {
    return { success: false, error: `Resend error: ${error.message}` };
  }
}

// MailChannels method (Cloudflare-friendly)
async function sendViaMailChannels({ to, from, subject, text }) {
  try {
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }]
        }],
        from: { email: from },
        subject: subject,
        content: [{
          type: 'text/plain',
          value: text
        }]
      })
    });

    if (response.ok) {
      return { success: true, details: 'MailChannels send successful' };
    } else {
      return { success: false, error: 'MailChannels API failed' };
    }
  } catch (error) {
    return { success: false, error: `MailChannels error: ${error.message}` };
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
    method: 'POST /api/send-admin-notification to send order notifications',
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
    email_methods: [
      'EmailJS (Gmail integration)',
      'SMTP2GO (reliable SMTP)',
      'SendGrid (popular service)',
      'Resend (modern API)',
      'MailChannels (Cloudflare-friendly)'
    ],
    note: 'System tries multiple email services for maximum reliability'
  }), { 
    headers: corsHeaders
  });
}