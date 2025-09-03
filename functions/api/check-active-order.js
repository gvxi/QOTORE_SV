// functions/api/check-active-order.js - Customer endpoint with service role key
export async function onRequestGet(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    // Get customer IP from query parameters
    const url = new URL(context.request.url);
    const customerIP = url.searchParams.get('ip');
    const customerPhone = url.searchParams.get('phone'); // Optional

    if (!customerIP) {
      return new Response(JSON.stringify({
        error: 'Missing required parameter: ip',
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Get Supabase credentials - try both keys
    const { env } = context;
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
    
    // Use service role key (bypasses RLS) for customer operations
    const apiKey = SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment check:', {
      hasUrl: !!SUPABASE_URL,
      hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!SUPABASE_ANON_KEY,
      usingKey: apiKey ? 'service_role' : 'none',
      path: url.pathname
    });
    
    if (!SUPABASE_URL || !apiKey) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({
        error: 'Database not configured',
        debug: {
          hasUrl: !!SUPABASE_URL,
          hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
          hasAnonKey: !!SUPABASE_ANON_KEY,
          allEnvKeys: Object.keys(env).filter(key => key.includes('SUPABASE'))
        },
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log('Checking active order for IP:', customerIP);

    // Query for active orders (pending or reviewed status)
    let query = `${SUPABASE_URL}/rest/v1/orders?customer_ip=eq.${customerIP}&status=in.(pending,reviewed)&select=*,order_items(*)&order=created_at.desc&limit=1`;
    
    // Add phone filter if provided
    if (customerPhone) {
      query += `&customer_phone=eq.${customerPhone}`;
    }

    const response = await fetch(query, {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase query failed:', errorText);
      return new Response(JSON.stringify({
        error: 'Database query failed',
        details: errorText,
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const orders = await response.json();
    
    if (orders.length > 0) {
      const order = orders[0];
      
      // Check if order can be cancelled (pending status, not reviewed, within deadline)
      const now = new Date();
      const reviewDeadline = order.review_deadline ? new Date(order.review_deadline) : null;
      const canCancel = (
        order.status === 'pending' && 
        !order.reviewed && 
        reviewDeadline && 
        reviewDeadline > now
      );

      console.log('Active order found:', order.order_number);

      return new Response(JSON.stringify({
        success: true,
        data: {
          has_order: true,
          order_id: order.id,
          order_number: order.order_number,
          order_status: order.status,
          reviewed: order.reviewed,
          total_amount: order.total_amount,
          created_at: order.created_at,
          review_deadline: order.review_deadline,
          can_cancel: canCancel,
          customer_name: `${order.customer_first_name} ${order.customer_last_name || ''}`.trim(),
          delivery_city: order.delivery_city,
          order_items: order.order_items || []
        }
      }), {
        status: 200,
        headers: corsHeaders
      });
    } else {
      console.log('No active order found for IP:', customerIP);
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          has_order: false
        }
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

  } catch (error) {
    console.error('Check active order error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to check active order: ' + error.message,
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}