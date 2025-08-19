// functions/api/fragrances.js - Fetch fragrances from Supabase
export async function onRequestGet(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    const { env } = context;
    
    // Check if Supabase environment variables are set
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({
        error: 'Database not configured',
        debug: {
          hasUrl: !!SUPABASE_URL,
          hasKey: !!SUPABASE_ANON_KEY
        }
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log('Fetching fragrances from Supabase...');

    // Fetch fragrances with their variants and brands using Supabase REST API
    const query = `
      SELECT 
        f.id,
        f.slug,
        f.name,
        f.description,
        f.image_path,
        f.created_at,
        b.name as brand_name,
        v.id as variant_id,
        v.size_ml,
        v.price_cents,
        v.sku,
        s.quantity
      FROM fragrances f
      LEFT JOIN brands b ON f.brand_id = b.id
      LEFT JOIN variants v ON f.id = v.fragrance_id
      LEFT JOIN stock s ON v.id = s.variant_id
      ORDER BY f.created_at DESC, v.size_ml ASC
    `.replace(/\s+/g, ' ').trim();

    // Use Supabase REST API with PostgREST
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_fragrances_with_variants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({})
    });

    // If the RPC function doesn't exist, use a simpler approach
    if (!response.ok) {
      console.log('RPC function not found, using simple query...');
      
      // Fetch fragrances first
      const fragrancesResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?select=*,brands(name),variants(id,size_ml,price_cents,sku,stock(quantity))&order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (!fragrancesResponse.ok) {
        const errorText = await fragrancesResponse.text();
        console.error('Supabase error:', errorText);
        return new Response(JSON.stringify({
          error: 'Failed to fetch from database',
          details: errorText
        }), {
          status: 500,
          headers: corsHeaders
        });
      }

      const supabaseData = await fragrancesResponse.json();
      console.log('Raw Supabase data:', supabaseData);

      // Transform the data to match our frontend expectations
      const fragrances = supabaseData.map(fragrance => ({
        id: fragrance.id,
        name: fragrance.name,
        slug: fragrance.slug,
        description: fragrance.description || '',
        image_path: fragrance.image_path || '',
        brand: fragrance.brands?.name || '',
        variants: (fragrance.variants || []).map(variant => ({
          id: variant.id,
          size: `${variant.size_ml}ml`,
          price: variant.price_cents / 100, // Convert cents to dollars
          sku: variant.sku || '',
          stock: variant.stock?.quantity || 0
        })),
        created_at: fragrance.created_at
      }));

      console.log(`Successfully fetched ${fragrances.length} fragrances`);

      return new Response(JSON.stringify({
        success: true,
        data: fragrances,
        count: fragrances.length,
        source: 'supabase'
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // If RPC worked, process that data
    const rpcData = await response.json();
    console.log('RPC data:', rpcData);

    return new Response(JSON.stringify({
      success: true,
      data: rpcData,
      count: rpcData.length,
      source: 'supabase_rpc'
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error fetching fragrances:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message,
      fallback: 'sample_data_used'
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
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Test endpoint
export async function onRequestPost(context) {
  return new Response(JSON.stringify({
    message: 'Fragrances API is working!',
    endpoints: {
      get: 'GET /api/fragrances - Fetch all fragrances',
      test: 'POST /api/fragrances - This test endpoint'
    },
    supabaseConfig: {
      hasUrl: !!context.env.SUPABASE_URL,
      hasKey: !!context.env.SUPABASE_ANON_KEY
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}