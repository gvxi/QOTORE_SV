// functions/api/get-customer-orders.js - Get customer's order history
export async function onRequestGet(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    // Get query parameters
    const url = new URL(context.request.url);
    const customerIP = url.searchParams.get('ip');
    const customerPhone = url.searchParams.get('phone');
    const completedOnly = url.searchParams.get('completed_only') === 'true';
    const limit = parseInt(url.searchParams.get('limit')) || 10;

    if (!customerIP) {
      return new Response(JSON.stringify({
        error: 'Missing required parameter: ip',
        success: false
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Get Supabase credentials
    const { env } = context;
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({
        error: 'Database not configured',
        success: false
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log('Fetching orders for customer:', customerIP);

    // Build query
    let query = `${SUPABASE_URL}/rest/v1/customer_order_status?customer_ip=eq.${customerIP}`;
    
    // Add phone filter if provided
    if (customerPhone) {
      query += `&customer_phone=eq.${customerPhone}`;
    }
    
    // Add status filter if only completed orders requested
    if (completedOnly) {
      query += `&status=eq.completed`;
    }
    
    // Add ordering and limit
    query += `&order=created_at.desc&limit=${limit}`;

    const response = await fetch(query, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
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
    
    // If we have orders, fetch their items
    if (orders.length > 0) {
      const orderIds = orders.map(order => order.id);
      
      const itemsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/order_items?order_id=in.(${orderIds.join(',')})&select=*`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (itemsResponse.ok) {
        const allItems = await itemsResponse.json();
        
        // Group items by order_id
        const itemsByOrder = {};
        allItems.forEach(item => {
          if (!itemsByOrder[item.order_id]) {
            itemsByOrder[item.order_id] = [];
          }
          itemsByOrder[item.order_id].push({
            fragrance_name: item.fragrance_name,
            fragrance_brand: item.fragrance_brand,
            variant_size: item.variant_size,
            quantity: item.quantity,
            unit_price: item.unit_price_cents ? (item.unit_price_cents / 1000) : null,
            total: item.total_price_cents ? (item.total_price_cents / 1000) : null
          });
        });
        
        // Add items to orders
        orders.forEach(order => {
          order.items = itemsByOrder[order.id] || [];
          order.items_count = order.items.length;
        });
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      orders: orders,
      count: orders.length,
      customer_ip: customerIP
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error while fetching orders',
      details: error.message,
      success: false
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}