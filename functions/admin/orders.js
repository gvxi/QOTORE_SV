// functions/admin/orders.js - FIXED VERSION with correct data structure
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

    // Fetch all orders with their items using a join
    const ordersResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*,order_items(*)&order=created_at.desc`, {
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
    console.log('Fetched orders for admin:', ordersData.length);

    // If no orders, return empty success
    if (!ordersData || ordersData.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        data: [],
        count: 0,
        source: 'admin-supabase',
        message: 'No orders found',
        stats: {
          total: 0,
          pending: 0,
          completed: 0,
          revenue: 0
        }
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Transform orders to match frontend expectations
    const orders = ordersData.map(order => {
      const items = Array.isArray(order.order_items)
        ? order.order_items.map(item => ({
            id: item.id,
            name: item.fragrance_name,
            brand: item.fragrance_brand || '',
            size: item.variant_size,
            price: item.unit_price_cents / 1000, // Convert from fils to OMR
            quantity: item.quantity,
            total: item.total_price_cents / 1000
          }))
        : [];

      return {
        // FIXED: Use field names that match frontend expectations
        id: order.id,
        order_number: order.order_number || `ORD-${String(order.id).padStart(5, '0')}`,
        
        // Customer info - frontend expects these exact field names
        customer_name: `${order.customer_first_name} ${order.customer_last_name || ''}`.trim(),
        customer_first_name: order.customer_first_name,
        customer_last_name: order.customer_last_name || '',
        customer_phone: order.customer_phone,
        customer_email: order.customer_email || '',
        
        // Delivery info
        delivery_address: order.delivery_address,
        delivery_city: order.delivery_city,
        delivery_region: order.delivery_region || '',
        
        // Order details
        notes: order.notes || '',
        items: items,
        total_amount: order.total_amount, // Keep in fils for calculations
        total: order.total_amount / 1000, // Also provide in OMR for display
        status: order.status || 'pending',
        reviewed: order.reviewed || false,
        
        // Timestamps
        created_at: order.created_at,
        updated_at: order.updated_at,
        review_deadline: order.review_deadline,
        
        // Customer IP for admin reference
        customer_ip: order.customer_ip
      };
    });

    console.log(`Successfully processed ${orders.length} orders for admin`);

    // Calculate stats
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const reviewedOrders = orders.filter(o => o.reviewed).length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const totalRevenue = orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (o.total_amount / 1000), 0);

    return new Response(JSON.stringify({
      success: true,
      data: orders,
      count: totalOrders,
      source: 'admin-supabase',
      stats: {
        total: totalOrders,
        pending: pendingOrders,
        reviewed: reviewedOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        revenue: totalRevenue
      }
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error fetching orders for admin:', error);
    
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

// Test endpoint
export async function onRequestPost(context) {
  const cookies = context.request.headers.get('Cookie') || '';
  const sessionCookie = cookies
    .split(';')
    .find(c => c.trim().startsWith('admin_session='));
  
  const isAuthenticated = !!sessionCookie;
  
  return new Response(JSON.stringify({
    message: 'Admin orders API is working!',
    authenticated: isAuthenticated,
    endpoints: {
      get: 'GET /admin/orders - Fetch all orders for admin',
      test: 'POST /admin/orders - This test endpoint'
    },
    supabaseConfig: {
      hasUrl: !!context.env.SUPABASE_URL,
      hasServiceKey: !!context.env.SUPABASE_SERVICE_ROLE_KEY
    },
    note: 'Authentication required via admin_session cookie'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}