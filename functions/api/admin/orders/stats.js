// functions/api/admin/orders/stats.js - Admin orders statistics API
export async function onRequestGet(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Admin orders statistics API called');
    
    // Check authentication
    const request = context.request;
    const cookies = request.headers.get('Cookie') || '';
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('admin_session='));
    
    if (!sessionCookie) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required',
        redirectUrl: '/admin/login.html'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const { env } = context;
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({
        success: false,
        error: 'Database not configured for admin operations'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log('Fetching orders statistics from Supabase...');

    // Get current date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Fetch all orders
    const ordersResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text();
      console.error('Orders fetch failed:', ordersResponse.status, errorText);
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch orders from database',
        details: `HTTP ${ordersResponse.status}: ${errorText}`
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const ordersData = await ordersResponse.json();
    console.log('Fetched orders for statistics:', ordersData.length);

    // Calculate statistics
    const totalOrders = ordersData.length;
    const pendingOrders = ordersData.filter(order => order.status === 'pending').length;
    const completedOrders = ordersData.filter(order => order.status === 'completed').length;
    const canceledOrders = ordersData.filter(order => order.status === 'canceled').length;

    // Calculate total revenue (only from completed orders)
    const totalRevenue = ordersData
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + (order.total_amount_cents || 0), 0);

    // Calculate today's orders
    const todayOrders = ordersData.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= today;
    });

    // Calculate yesterday's orders
    const yesterdayOrders = ordersData.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= yesterday && orderDate < today;
    });

    // Calculate this month's orders
    const thisMonthOrders = ordersData.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= thisMonth;
    });

    // Calculate last month's orders
    const lastMonthOrders = ordersData.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= lastMonth && orderDate <= lastMonthEnd;
    });

    // Calculate changes
    const ordersChange = {
      value: todayOrders.length - yesterdayOrders.length,
      unit: ' today vs yesterday'
    };

    const pendingChange = {
      value: todayOrders.filter(o => o.status === 'pending').length - 
             yesterdayOrders.filter(o => o.status === 'pending').length,
      unit: ' pending today vs yesterday'
    };

    // Calculate revenue change (this month vs last month)
    const thisMonthRevenue = thisMonthOrders
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + (order.total_amount_cents || 0), 0);

    const lastMonthRevenue = lastMonthOrders
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + (order.total_amount_cents || 0), 0);

    const revenueChange = {
      value: Math.round((thisMonthRevenue - lastMonthRevenue) / 1000), // Convert to OMR
      unit: ' OMR this month vs last month'
    };

    // Recent orders (last 10)
    const recentOrders = ordersData
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    const statistics = {
      totalOrders,
      pendingOrders,
      completedOrders,
      canceledOrders,
      totalRevenue,
      ordersChange,
      pendingChange,
      revenueChange,
      todayOrders: todayOrders.length,
      yesterdayOrders: yesterdayOrders.length,
      thisMonthOrders: thisMonthOrders.length,
      lastMonthOrders: lastMonthOrders.length,
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        customer_name: order.customer_name,
        total: order.total_amount_cents,
        status: order.status,
        created_at: order.created_at
      }))
    };

    console.log('Orders statistics calculated:', {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue
    });

    return new Response(JSON.stringify({
      success: true,
      ...statistics,
      source: 'supabase'
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error fetching orders statistics:', error);
    
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}