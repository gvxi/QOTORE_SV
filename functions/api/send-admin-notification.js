
function generateReviewToken(orderId, timestamp) {
  const data = `${orderId}-${timestamp}`;
  return btoa(data).replace(/[+=\/]/g, '').substring(0, 32);
}

function generateReviewUrl(baseUrl, orderId) {
  const timestamp = Date.now();
  const token = generateReviewToken(orderId, timestamp);
  return `${baseUrl}/api/review-order?order=${orderId}&token=${token}`;
}

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

const orderId = orderData.orderId || orderData.id || 'unknown';



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