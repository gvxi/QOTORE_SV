// functions/admin/orders.js - Get all orders for admin
export async function onRequestGet(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Admin orders API called');

    // Check authentication
    const request = context.request;
    const cookies = request.headers.get('Cookie') || '';
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('admin_session='));

    if (!sessionCookie) {
      return new Response(JSON.stringify({
        error: 'Authentication required',
        redirectUrl: '/login.html'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const { env } = context;

    // Check if Supabase environment variables are set
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('Environment check:', {
      hasUrl: !!SUPABASE_URL,
      hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY
    });

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({
        success: false,
        error: 'Database not configured for admin operations',
        debug: {
          hasUrl: !!SUPABASE_URL,
          hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY
        }
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log('Fetching orders from Supabase for admin...');

    // Fetch all orders ordered by creation date (newest first)
    const ordersResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text();
      console.error('Orders fetch failed:', ordersResponse.status, errorText);

      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch orders from database',
        details: `HTTP ${ordersResponse.status}: ${errorText}`
      }), {
        status: ordersResponse.status || 500,
        headers: corsHeaders
      });
    }

    const orders = await ordersResponse.json();

    return new Response(JSON.stringify({
      success: true,
      data: orders
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (err) {
    console.error('Unexpected error while fetching orders:', err);
    return new Response(JSON.stringify({
      success: false,
      error: 'Unexpected server error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
