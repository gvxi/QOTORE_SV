export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Admin notification request received');

    const { env } = context;
    const ADMIN_EMAIL = env.ADMIN_EMAIL;
    const GMAIL_USER = env.GMAIL_USER;
    const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
    const GOOGLE_REFRESH_TOKEN = env.GOOGLE_REFRESH_TOKEN;

    if (!ADMIN_EMAIL || !GMAIL_USER || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
      console.error('Missing required environment variables');
      return new Response(JSON.stringify({
        error: 'Gmail API service not configured',
        success: false,
        debug: {
          hasAdminEmail: !!ADMIN_EMAIL,
          hasGmailUser: !!GMAIL_USER,
          hasClientId: !!GOOGLE_CLIENT_ID,
          hasClientSecret: !!GOOGLE_CLIENT_SECRET,
          hasRefreshToken: !!GOOGLE_REFRESH_TOKEN,
          adminEmail: ADMIN_EMAIL ? ADMIN_EMAIL.replace(/@.+/, '@***') : 'Not set',
          gmailUser: GMAIL_USER ? GMAIL_USER.replace(/@.+/, '@***') : 'Not set'
        }
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

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

    const orderDate = new Date(created_at).toLocaleString('en-GB', {
      timeZone: 'Asia/Muscat',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const itemsHtml = items.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px 8px; font-weight: 500;">${escapeHtml(item.fragrance_name)}</td>
        <td style="padding: 12px 8px; color: #666;">${escapeHtml(item.fragrance_brand || '')}</td>
        <td style="padding: 12px 8px; text-align: center;">${escapeHtml(item.variant_size)}</td>
        <td style="padding: 12px 8px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 8px; text-align: right; font-weight: 500;">${(item.total_price_cents / 1000).toFixed(3)} OMR</td>
      </tr>
    `).join('');

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>New Order ${order_number}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f8fafc; line-height: 1.6;">
  
  <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
    
    <!-- Header with Logo -->
    <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); padding: 32px 24px; text-align: center;">
      <img src="https://qotore.com/icons/icon-192x192.png" alt="Qotore" style="width: 56px; height: 56px; border-radius: 12px; margin-bottom: 16px; background: rgba(255,255,255,0.1); padding: 8px;">
      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600; letter-spacing: -0.025em;">New Order Received</h1>
      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Order ${order_number}</p>
    </div>
    
    <!-- Order Summary -->
    <div style="padding: 24px;">
      <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #8B4513;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 18px; font-weight: 600; color: #1f2937;">${order_number}</span>
          <span style="font-size: 20px; font-weight: 700; color: #8B4513;">${total_amount_omr} OMR</span>
        </div>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">${orderDate}</p>
      </div>
      
      <!-- Customer Info -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px; font-weight: 600;">Customer</h3>
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px;">
          <p style="margin: 0 0 8px 0; color: #374151;"><strong>${escapeHtml(customer.first_name)}${customer.last_name ? ' ' + escapeHtml(customer.last_name) : ''}</strong></p>
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">📱 ${escapeHtml(customer.phone)}</p>
          ${customer.email ? `<p style="margin: 0; color: #6b7280; font-size: 14px;">✉️ ${escapeHtml(customer.email)}</p>` : ''}
        </div>
      </div>
      
      <!-- Delivery Info -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px; font-weight: 600;">Delivery</h3>
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px;">
          <p style="margin: 0 0 4px 0; color: #374151; font-size: 14px;">${escapeHtml(delivery.address)}</p>
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">📍 ${escapeHtml(delivery.city)}, ${escapeHtml(delivery.region)}</p>
          ${delivery.notes ? `<p style="margin: 0; color: #6b7280; font-size: 14px; font-style: italic;">💬 ${escapeHtml(delivery.notes)}</p>` : ''}
        </div>
      </div>
      
      <!-- Items -->
      <div style="margin-bottom: 32px;">
        <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px; font-weight: 600;">Items (${items.length})</h3>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          ${items.map(item => `
            <div style="padding: 16px; border-bottom: 1px solid #f3f4f6; background: white;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                  <p style="margin: 0 0 4px 0; font-weight: 600; color: #1f2937;">${escapeHtml(item.fragrance_name)}</p>
                  <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">${escapeHtml(item.fragrance_brand || '')}</p>
                  <p style="margin: 0; color: #9ca3af; font-size: 13px;">${escapeHtml(item.variant_size)} × ${item.quantity}</p>
                </div>
                <div style="text-align: right; margin-left: 16px;">
                  <p style="margin: 0; font-weight: 600; color: #1f2937;">${(item.total_price_cents / 1000).toFixed(3)} OMR</p>
                </div>
              </div>
            </div>
          `).join('')}
          
          <!-- Total Row -->
          <div style="padding: 16px; background: #f9fafb; border-top: 2px solid #8B4513;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 600; color: #1f2937; font-size: 16px;">Total</span>
              <span style="font-weight: 700; color: #8B4513; font-size: 18px;">${total_amount_omr} OMR</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Action Button -->
      <div style="text-align: center;">
        <a href="https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(customer.first_name)}%2C%20we%20received%20your%20order%20${order_number}.%20We%20will%20process%20it%20soon!" 
           style="display: inline-flex; align-items: center; gap: 8px; background: #25D366; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.9 3.515"/>
          </svg>
          Contact Customer
        </a>
      </div>
      
    </div>
    
    <!-- Footer -->
    <div style="background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #6b7280; font-size: 13px;">Qotore Admin Notification</p>
    </div>
    
  </div>
  
</body>
</html>
`;

    const emailText = `
NEW ORDER RECEIVED - ${order_number}
${'='.repeat(50)}

Order Information:
• Order Number: ${order_number}
• Order Date: ${orderDate}
• Total Amount: ${total_amount_omr} OMR

Customer Information:
• Name: ${customer.first_name}
• Phone: ${customer.phone}
${customer.email ? `• Email: ${customer.email}` : ''}

Delivery Information:
• Method: ${delivery.address}
• Location: ${delivery.region}${delivery.city && delivery.city !== 'Not specified' ? `, ${delivery.city}` : ''}
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

    console.log('Sending email via Gmail API...');
    
    const emailResult = await sendViaGmailAPI({
      to: ADMIN_EMAIL,
      from: GMAIL_USER,
      subject: `🛒 New Order ${order_number} - ${total_amount_omr} OMR`,
      html: emailHtml,
      text: emailText,
      credentials: {
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        refreshToken: GOOGLE_REFRESH_TOKEN
      }
    });

    if (!emailResult.success) {
      console.error('Gmail API error:', emailResult.error);
      
      if (emailResult.permanent_failure) {
        return new Response(JSON.stringify({
          error: 'Gmail API refresh token has expired',
          success: false,
          details: emailResult.error,
          token_expired: true,
          solution: emailResult.solution,
          troubleshooting: {
            refresh_token_expired: 'Your OAuth2 refresh token has expired or been revoked',
            generate_new_token: 'Use OAuth Playground to generate a new refresh token',
            check_oauth_consent: 'Ensure OAuth consent screen is properly configured',
            verify_scopes: 'Make sure gmail.send scope is included in the new token'
          },
          refresh_token_guide: [
            '1. Go to OAuth Playground: https://developers.google.com/oauthplayground',
            '2. Click settings gear → Use your own OAuth credentials',
            '3. Enter your Client ID and Client Secret',
            '4. Select Gmail API v1 → https://www.googleapis.com/auth/gmail.send',
            '5. Click "Authorize APIs" and sign in with your Gmail',
            '6. Click "Exchange authorization code for tokens"',
            '7. Copy the new Refresh Token and update GOOGLE_REFRESH_TOKEN',
            '8. Test the configuration again'
          ],
          prevention_tips: [
            'Keep your OAuth app in "Published" state (not Testing)',
            'Use the Gmail API regularly to prevent inactivity expiration',
            'Monitor for Google security notifications',
            'Consider using a dedicated Gmail account for business notifications'
          ]
        }), {
          status: 401,
          headers: corsHeaders
        });
      }
      
      return new Response(JSON.stringify({
        error: 'Failed to send email via Gmail API',
        success: false,
        details: emailResult.error,
        attempts: emailResult.attempts || 1,
        troubleshooting: {
          check_oauth_setup: 'Verify Google Cloud OAuth2 credentials are correct',
          check_refresh_token: 'Ensure refresh token is valid and not expired',
          check_gmail_api: 'Verify Gmail API is enabled in Google Cloud Console',
          check_scopes: 'Ensure OAuth has gmail.send scope permission',
          check_quota: 'Verify Gmail API quota limits are not exceeded'
        },
        gmail_api_setup_guide: [
          '1. Create project in Google Cloud Console',
          '2. Enable Gmail API',
          '3. Create OAuth2 credentials',
          '4. Generate refresh token with gmail.send scope',
          '5. Set all environment variables correctly'
        ]
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log('Email sent successfully via Gmail API:', emailResult.messageId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Admin notification sent successfully via Gmail API',
      message_id: emailResult.messageId,
      sent_to: ADMIN_EMAIL,
      sent_from: GMAIL_USER,
      order_number: order_number,
      method: 'Gmail API'
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

async function sendViaGmailAPI({ to, from, subject, html, text, credentials }) {
  let retryCount = 0;
  const maxRetries = 2;

  while (retryCount <= maxRetries) {
    try {
      console.log(`Gmail API attempt ${retryCount + 1}/${maxRetries + 1}`);
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          refresh_token: credentials.refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!tokenResponse.ok) {
        const tokenError = await tokenResponse.json();
        console.error('Token refresh failed:', tokenError);
        
        if (tokenError.error === 'invalid_grant' || tokenError.error === 'invalid_request') {
          return { 
            success: false, 
            error: `Refresh token expired or invalid: ${tokenError.error_description || tokenError.error}`,
            permanent_failure: true,
            solution: 'Generate a new refresh token using OAuth Playground'
          };
        }
        
        if (retryCount < maxRetries) {
          console.log('Temporary token error, retrying...');
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          continue;
        }
        
        return { success: false, error: `Token refresh failed: ${tokenError.error_description || tokenError.error}` };
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      
      console.log('Access token obtained successfully');

      const boundary = `boundary_${Math.random().toString(36).substr(2, 9)}`;
      
      const emailMessage = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        ``,
        `--${boundary}`,
        `Content-Type: text/plain; charset=UTF-8`,
        `Content-Transfer-Encoding: 7bit`,
        ``,
        text,
        ``,
        `--${boundary}`,
        `Content-Type: text/html; charset=UTF-8`,
        `Content-Transfer-Encoding: 7bit`,
        ``,
        html,
        ``,
        `--${boundary}--`
      ].join('\r\n');

      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(emailMessage);
      
      let base64Message = '';
      const chunkSize = 3;
      for (let i = 0; i < messageBytes.length; i += chunkSize) {
        const chunk = messageBytes.slice(i, i + chunkSize);
        const binaryString = String.fromCharCode(...chunk);
        base64Message += btoa(binaryString);
      }
      
      const base64UrlMessage = base64Message
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      console.log('Sending email via Gmail API...');

      const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: base64UrlMessage
        })
      });

      if (!gmailResponse.ok) {
        const gmailError = await gmailResponse.json();
        console.error('Gmail API send failed:', gmailError);
        
        if (gmailError.error?.code === 401 || gmailError.error?.status === 'UNAUTHENTICATED') {
          if (retryCount < maxRetries) {
            console.log('Access token expired, retrying with new token...');
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            continue;
          }
        }
        
        return { success: false, error: `Gmail API error: ${gmailError.error?.message || 'Unknown error'}` };
      }

      const result = await gmailResponse.json();
      console.log('Gmail API send successful:', result.id);
      
      return { success: true, messageId: result.id, attempts: retryCount + 1 };

    } catch (error) {
      console.error(`Gmail API attempt ${retryCount + 1} error:`, error);
      
      if (retryCount < maxRetries) {
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        continue;
      }
      
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: 'All retry attempts failed' };
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

export async function onRequestGet(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  const { env } = context;
  
  return new Response(JSON.stringify({
    message: 'Gmail API notification endpoint is working!',
    method: 'POST /api/send-admin-notification to send order notifications via Gmail API',
    environment_check: {
      hasAdminEmail: !!env.ADMIN_EMAIL,
      hasGmailUser: !!env.GMAIL_USER,
      hasClientId: !!env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!env.GOOGLE_CLIENT_SECRET,
      hasRefreshToken: !!env.GOOGLE_REFRESH_TOKEN,
      adminEmail: env.ADMIN_EMAIL ? env.ADMIN_EMAIL.replace(/@.+/, '@***') : 'Not set',
      gmailUser: env.GMAIL_USER ? env.GMAIL_USER.replace(/@.+/, '@***') : 'Not set'
    },
    required_env_vars: [
      'ADMIN_EMAIL - Email address to receive order notifications',
      'GMAIL_USER - Your Gmail address (e.g., yourname@gmail.com)',
      'GOOGLE_CLIENT_ID - OAuth2 Client ID from Google Cloud Console',
      'GOOGLE_CLIENT_SECRET - OAuth2 Client Secret from Google Cloud Console',
      'GOOGLE_REFRESH_TOKEN - OAuth2 Refresh Token with gmail.send scope'
    ],
    optional_env_vars: [
      'SITE_URL - Your website URL for admin panel links in emails'
    ],
    setup_instructions: [
      '1. Create project in Google Cloud Console',
      '2. Enable Gmail API',
      '3. Create OAuth2 credentials (Web application type)',
      '4. Generate refresh token with gmail.send scope',
      '5. Set all environment variables in Cloudflare Workers',
      '6. Test using the test endpoint'
    ],
    features: [
      'Professional HTML emails using your personal Gmail',
      'OAuth2 authentication for security',
      'Proper email encoding and formatting',
      'High deliverability from trusted Gmail servers',
      'No daily sending limits for personal use',
      'Free to use with your existing Gmail account'
    ],
    advantages: [
      'Uses your existing Gmail account',
      'No additional email service costs',
      'High deliverability and trust',
      'Professional appearance from your Gmail',
      'Google Cloud reliability and security'
    ]
  }), { 
    headers: corsHeaders
  });
}