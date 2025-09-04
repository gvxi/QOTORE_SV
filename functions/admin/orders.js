// functions/admin/orders.js - FIXED VERSION with proper fragrance data loading
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

    // STEP 1: Fetch all orders
    const ordersResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, {
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
          reviewed: 0,
          completed: 0,
          cancelled: 0,
          revenue: 0
        }
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // STEP 2: Fetch all order items for all orders
    const orderIds = ordersData.map(order => order.id);
    const orderItemsResponse = await fetch(`${SUPABASE_URL}/rest/v1/order_items?order_id=in.(${orderIds.join(',')})&select=*`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    let orderItemsData = [];
    if (orderItemsResponse.ok) {
      orderItemsData = await orderItemsResponse.json();
      console.log('Fetched order items:', orderItemsData.length);
    } else {
      console.warn('Order items fetch failed, proceeding with empty items');
    }

    // STEP 3: Transform orders to match frontend expectations
    const orders = ordersData.map(order => {
      // Get items for this order
      const orderItems = orderItemsData.filter(item => item.order_id === order.id);
      
      // Transform items to expected format - using stored data from order_items table
      const items = orderItems.map(item => ({
        id: item.id,
        fragrance_name: item.fragrance_name || 'Unknown Item',
        fragrance_brand: item.fragrance_brand || 'Unknown Brand',
        variant_size: item.variant_size || 'Unknown Size',
        quantity: item.quantity || 1,
        unit_price_cents: item.unit_price_cents || 0,
        total_price_cents: item.total_price_cents || 0,
        is_whole_bottle: item.is_whole_bottle || false,
        // Also provide formatted versions for display
        name: item.fragrance_name || 'Unknown Item',
        brand: item.fragrance_brand || 'Unknown Brand', 
        size: item.variant_size || 'Unknown Size',
        price: (item.unit_price_cents || 0) / 1000, // Convert fils to OMR
        total: (item.total_price_cents || 0) / 1000 // Convert fils to OMR
      }));

      return {
        // Order identification
        id: order.id,
        order_number: order.order_number || `ORD-${String(order.id).padStart(5, '0')}`,
        
        // Customer info
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
        items: items, // Properly formatted items with fragrance names and prices
        total_amount: order.total_amount, // Keep in fils for calculations
        status: order.status || 'pending',
        reviewed: order.reviewed || false,
        
        // Timestamps
        created_at: order.created_at,
        updated_at: order.updated_at,
        review_deadline: order.review_deadline,
        
        // Customer tracking
        customer_ip: order.customer_ip,
        session_id: order.session_id
      };
    });

    console.log(`Successfully processed ${orders.length} orders for admin`);

    // Calculate comprehensive stats
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      reviewed: orders.filter(o => o.status === 'reviewed').length,
      completed: orders.filter(o => o.status === 'completed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      revenue: orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (o.total_amount || 0), 0) // Keep in fils for accuracy
    };

    return new Response(JSON.stringify({
      success: true,
      data: orders,
      count: stats.total,
      source: 'admin-supabase-fixed',
      message: `Successfully loaded ${stats.total} orders with proper item details`,
      stats: stats
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error fetching orders for admin:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
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
    message: 'Admin orders API is working! (FIXED VERSION)',
    authenticated: isAuthenticated,
    endpoints: {
      get: 'GET /admin/orders - Fetch all orders with proper item details',
      test: 'POST /admin/orders - This test endpoint'
    },
    fixes: {
      'Item Loading': 'Now properly loads order_items table data with fragrance names and prices',
      'Data Structure': 'Items include both original database fields and formatted display fields',
      'Stats Calculation': 'Comprehensive stats including all order statuses',
      'Error Handling': 'Better error handling for missing data'
    },
    dataStructure: {
      orders: 'Array of order objects',
      'order.items': 'Array of order items with fragrance details',
      'item fields': 'fragrance_name, fragrance_brand, variant_size, quantity, unit_price_cents, total_price_cents',
      'display fields': 'name, brand, size, price (OMR), total (OMR)'
    },
    supabaseConfig: {
      hasUrl: !!context.env.SUPABASE_URL,
      hasServiceKey: !!context.env.SUPABASE_SERVICE_ROLE_KEY
    },
    note: 'Authentication required via admin_session cookie'
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}