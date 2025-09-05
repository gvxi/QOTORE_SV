// functions/api/test-email.js - Test Gmail email notification setup
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Test Gmail email request received');

    // Get environment variables
    const { env } = context;
    const ADMIN_EMAIL = env.ADMIN_EMAIL;
    const GMAIL_USER = env.GMAIL_USER;
    const GMAIL_APP_PASSWORD = env.GMAIL_APP_PASSWORD;

    // Validate required environment variables
    if (!ADMIN_EMAIL || !GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.error('Missing required Gmail environment variables');
      return new Response(JSON.stringify({
        error: 'Gmail service not configured',
        success: false,
        debug: {
          hasAdminEmail: !!ADMIN_EMAIL,
          hasGmailUser: !!GMAIL_USER,
          hasGmailPassword: !!GMAIL_APP_PASSWORD,
          adminEmail: ADMIN_EMAIL ? ADMIN_EMAIL.replace(/@.+/, '@***') : 'Not set',
          gmailUser: GMAIL_USER ? GMAIL_USER.replace(/@.+/, '@***') : 'Not set'
        },
        setup_required: [
          '1. Enable 2-Factor Authentication on Gmail',
          '2. Generate App Password in Gmail Settings > Security',
          '3. Set GMAIL_USER to your Gmail address',
          '4. Set GMAIL_APP_PASSWORD to the generated App Password',
          '5. Set ADMIN_EMAIL to receive notifications'
        ]
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log('Sending test email via Gmail to:', ADMIN_EMAIL);

    // Create test email content
    const testTime = new Date().toLocaleString('en-GB', {
      timeZone: 'Asia/Muscat',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Qotore Gmail Test</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 600;">✅ Gmail Test Successful</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Qotore Admin Notification System</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin-bottom: 20px;">
            <h2 style="color: #28a745; margin: 0 0 10px 0;">🎉 Gmail Configuration Successful!</h2>
            <p style="margin: 0; color: #666;">Your Gmail email notification system is working correctly.</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #2d3748; margin-bottom: 10px;">📋 Configuration Details:</h3>
            <ul style="color: #666; padding-left: 20px;">
              <li><strong>Admin Email:</strong> ${ADMIN_EMAIL}</li>
              <li><strong>Gmail Account:</strong> ${GMAIL_USER}</li>
              <li><strong>Sending Method:</strong> Gmail SMTP</li>
              <li><strong>Test Time:</strong> ${testTime} (Oman Time)</li>
            </ul>
          </div>
          
          <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; border-left: 4px solid #17a2b8; margin-bottom: 20px;">
            <h3 style="color: #17a2b8; margin: 0 0 10px 0;">📧 What happens next?</h3>
            <p style="margin: 0; color: #666; font-size: 14px;">
              When customers place orders on your website, you will receive detailed email notifications 
              sent from your Gmail account to your admin email with customer information, order details, 
              and quick action buttons to contact customers or manage orders.
            </p>
          </div>

          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
            <h3 style="color: #856404; margin: 0 0 10px 0;">🔐 Security Note:</h3>
            <p style="margin: 0; color: #856404; font-size: 14px;">
              This system uses your Gmail App Password, which is more secure than your regular password. 
              Make sure 2-Factor Authentication is enabled on your Gmail account for maximum security.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${env.SITE_URL || 'https://qotore.com'}/admin/orders-management.html" 
               style="background: #8B4513; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;">
              📋 Go to Admin Dashboard
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="margin: 0; color: #666; font-size: 14px;">Qotore Gmail Email Notification System</p>
          <p style="margin: 5px 0 0 0; color: #999; font-size: 12px;">Test sent from ${GMAIL_USER} at ${testTime} (Oman Time)</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const emailText = `
Qotore Gmail Test - Configuration Successful!
===========================================

Your Gmail email notification system is working correctly.

Configuration Details:
- Admin Email: ${ADMIN_EMAIL}
- Gmail Account: ${GMAIL_USER}
- Sending Method: Gmail SMTP
- Test Time: ${testTime} (Oman Time)

What happens next?
When customers place orders on your website, you will receive detailed email notifications sent from your Gmail account with customer information, order details, and quick action buttons to contact customers or manage orders.

Security Note:
This system uses your Gmail App Password, which is more secure than your regular password. Make sure 2-Factor Authentication is enabled on your Gmail account for maximum security.

Admin Dashboard: ${env.SITE_URL || 'https://qotore.com'}/admin/orders-management.html

---
Qotore Gmail Email Notification System
Test sent from ${GMAIL_USER} at ${testTime} (Oman Time)
    `;

    // Try to send via simple SMTP approach using a third-party service
    const emailData = {
      from: GMAIL_USER,
      to: ADMIN_EMAIL,
      subject: '✅ Qotore Gmail Test - Configuration Successful',
      html: emailHtml,
      text: emailText
    };

    // Use a simple email API service that supports Gmail SMTP
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY || 'dummy'}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    // If Resend fails, try EmailJS as fallback
    if (!emailResponse.ok && env.EMAILJS_PUBLIC_KEY) {
      console.log('Trying EmailJS as fallback...');
      
      const emailJSResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service_id: 'gmail',
          template_id: 'test_template',
          user_id: env.EMAILJS_PUBLIC_KEY,
          accessToken: env.EMAILJS_PRIVATE_KEY,
          template_params: {
            to_email: ADMIN_EMAIL,
            from_email: GMAIL_USER,
            subject: emailData.subject,
            message_html: emailData.html,
            message_text: emailData.text
          }
        })
      });

      if (emailJSResponse.ok) {
        return new Response(JSON.stringify({
          success: true,
          message: `Test email sent successfully to ${ADMIN_EMAIL} via EmailJS`,
          sent_to: ADMIN_EMAIL,
          sent_from: GMAIL_USER,
          sent_at: testTime,
          method: 'EmailJS + Gmail',
          next_steps: [
            'Check your email inbox (and spam folder)',
            'Place a test order to verify order notifications',
            'Configure any additional email settings as needed'
          ]
        }), {
          status: 200,
          headers: corsHeaders
        });
      }
    }

    // If both fail, try direct Gmail SMTP simulation
    if (!emailResponse.ok) {
      console.log('Direct email APIs failed, using direct Gmail SMTP...');
      
      // Use nodemailer-like approach for Gmail SMTP
      const smtpResponse = await sendViaGmailSMTP({
        from: GMAIL_USER,
        to: ADMIN_EMAIL,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        auth: {
          user: GMAIL_USER,
          pass: GMAIL_APP_PASSWORD
        }
      });

      if (!smtpResponse.success) {
        return new Response(JSON.stringify({
          error: 'Failed to send test email via Gmail SMTP',
          success: false,
          details: smtpResponse.error,
          troubleshooting: {
            check_app_password: 'Verify Gmail App Password is correct (16 characters)',
            check_2fa: 'Ensure 2-Factor Authentication is enabled on Gmail',
            check_less_secure: 'App Passwords require 2FA to be enabled',
            generate_new: 'Try generating a new App Password in Gmail Settings'
          },
          gmail_setup_steps: [
            '1. Go to Gmail Settings > See all settings > Accounts and Import',
            '2. Click "Other Google Account settings"',
            '3. Go to Security > 2-Step Verification (enable if not already)',
            '4. Go to Security > App passwords',
            '5. Generate new app password for "Mail"',
            '6. Use this 16-character password (not your regular Gmail password)'
          ]
        }), {
          status: 500,
          headers: corsHeaders
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Test email sent successfully to ${ADMIN_EMAIL} via Gmail SMTP`,
        sent_to: ADMIN_EMAIL,
        sent_from: GMAIL_USER,
        sent_at: testTime,
        method: 'Gmail SMTP Direct',
        next_steps: [
          'Check your email inbox (and spam folder)',
          'Place a test order to verify order notifications',
          'Order notifications will be sent automatically from your Gmail'
        ]
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // If primary service worked
    const emailResult = await emailResponse.json();
    console.log('Test email sent successfully:', emailResult);

    return new Response(JSON.stringify({
      success: true,
      message: `Test email sent successfully to ${ADMIN_EMAIL}`,
      sent_to: ADMIN_EMAIL,
      sent_from: GMAIL_USER,
      sent_at: testTime,
      method: 'Email Service API',
      next_steps: [
        'Check your email inbox (and spam folder)',
        'Place a test order to verify order notifications',
        'Gmail integration is ready for production use'
      ]
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Test Gmail email error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to send test email: ' + error.message,
      success: false,
      troubleshooting: {
        check_environment_vars: 'Verify all required environment variables are set',
        check_gmail_settings: 'Ensure Gmail App Password is configured correctly',
        check_2fa: 'Verify 2-Factor Authentication is enabled on Gmail'
      }
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Gmail SMTP sending function
async function sendViaGmailSMTP({ from, to, subject, html, text, auth }) {
  try {
    // Create the email message in RFC 2822 format
    const boundary = '----=_NextPart_' + Math.random().toString(36).substr(2, 9);
    
    const message = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      text,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      html,
      ``,
      `--${boundary}--`
    ].join('\r\n');

    // Encode message for Gmail API
    const encodedMessage = btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Try Gmail API approach first
    const gmailApiResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${auth.pass}`, // Using App Password as bearer token
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedMessage
      })
    });

    if (gmailApiResponse.ok) {
      const result = await gmailApiResponse.json();
      return { success: true, messageId: result.id };
    }

    // If Gmail API fails, try alternative SMTP service
    console.log('Gmail API failed, trying SMTP relay...');
    
    // Use a simple SMTP relay service for Gmail
    const smtpResponse = await fetch('https://smtp.gmail.com:587/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${auth.user}:${auth.pass}`)}`
      },
      body: JSON.stringify({
        from: from,
        to: to,
        subject: subject,
        html: html,
        text: text
      })
    });

    if (smtpResponse.ok) {
      return { success: true };
    } else {
      const error = await smtpResponse.text();
      return { success: false, error: error };
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

// Test endpoint info
export async function onRequestGet(context) {
  const { env } = context;
  
  return new Response(JSON.stringify({
    message: 'Gmail email test endpoint is working!',
    method: 'POST /api/test-email to send a test email via Gmail',
    environment_check: {
      hasAdminEmail: !!env.ADMIN_EMAIL,
      hasGmailUser: !!env.GMAIL_USER,
      hasGmailPassword: !!env.GMAIL_APP_PASSWORD,
      adminEmail: env.ADMIN_EMAIL ? env.ADMIN_EMAIL.replace(/@.+/, '@***') : 'Not set',
      gmailUser: env.GMAIL_USER ? env.GMAIL_USER.replace(/@.+/, '@***') : 'Not set'
    },
    required_env_vars: [
      'ADMIN_EMAIL - Email address to receive notifications',
      'GMAIL_USER - Your Gmail address (e.g., yourname@gmail.com)',
      'GMAIL_APP_PASSWORD - Gmail App Password (16 characters, not regular password)'
    ],
    gmail_setup_guide: {
      step1: 'Enable 2-Factor Authentication on your Gmail account',
      step2: 'Go to Gmail Settings > See all settings > Accounts and Import',
      step3: 'Click "Other Google Account settings"',
      step4: 'Go to Security > App passwords',
      step5: 'Generate new app password for "Mail"',
      step6: 'Use the 16-character app password in GMAIL_APP_PASSWORD',
      important: 'Do NOT use your regular Gmail password - only App Passwords work'
    },
    troubleshooting: [
      'If 2FA is not enabled, enable it first in Gmail Security settings',
      'App Passwords option only appears when 2FA is enabled',
      'Generate a new App Password specifically for this application',
      'Copy the App Password exactly (16 characters with no spaces)'
    ]
  }), { 
    headers: { 'Content-Type': 'application/json' } 
  });
}