// functions/api/fragrances.js - Updated to support hidden field
export async function onRequestGet(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    console.log('Fragrances API called');
    const { env, request } = context;
    
    // Check if this is an admin request
    const cookies = request.headers.get('Cookie') || '';
    const isAdmin = cookies.includes('admin_session=');
    
    // Check if Supabase environment variables are set
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment check:', {
      hasUrl: !!SUPABASE_URL,
      hasKey: !!SUPABASE_ANON_KEY,
      hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
      isAdmin: isAdmin
    });
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({
        success: false,
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

    // Use service role key for admin requests to see hidden fragrances
    const authKey = isAdmin && SUPABASE_SERVICE_ROLE_KEY ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
    
    // Build query - for public users, exclude hidden fragrances
    let fragranceQuery = `${SUPABASE_URL}/rest/v1/fragrances?select=*,brands(name)&order=created_at.desc`;
    if (!isAdmin) {
      fragranceQuery += '&hidden=eq.false';
    }

    const fragrancesResponse = await fetch(fragranceQuery, {
      headers: {
        'apikey': authKey,
        'Authorization': `Bearer ${authKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!fragrancesResponse.ok) {
      const errorText = await fragrancesResponse.text();
      console.error('Fragrances fetch failed:', fragrancesResponse.status, errorText);
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch fragrances from database',
        details: `HTTP ${fragrancesResponse.status}: ${errorText}`,
        supabaseUrl: SUPABASE_URL ? 'SET' : 'NOT SET'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const fragrancesData = await fragrancesResponse.json();
    console.log('Fetched fragrances:', fragrancesData.length, isAdmin ? '(admin view)' : '(public view)');

    // If no fragrances, return empty success
    if (!fragrancesData || fragrancesData.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        data: [],
        count: 0,
        source: 'supabase',
        message: 'No fragrances found',
        adminView: isAdmin
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Fetch variants for each fragrance
    const fragranceIds = fragrancesData.map(f => f.id);
    console.log('Fetching variants for fragrance IDs:', fragranceIds);

    const variantsResponse = await fetch(`${SUPABASE_URL}/rest/v1/variants?fragrance_id=in.(${fragranceIds.join(',')})&order=fragrance_id,size_ml.asc.nullslast`, {
      headers: {
        'apikey': authKey,
        'Authorization': `Bearer ${authKey}`,
        'Content-Type': 'application/json'
      }
    });

    let variantsData = [];
    if (variantsResponse.ok) {
      variantsData = await variantsResponse.json();
      console.log('Fetched variants:', variantsData.length);
    } else {
      console.warn('Variants fetch failed, continuing without variants');
    }

    // Combine fragrances with their variants
    const fragrances = fragrancesData.map(fragrance => {
      const fragranceVariants = variantsData.filter(v => v.fragrance_id === fragrance.id);
      
      return {
        id: fragrance.id,
        name: fragrance.name,
        slug: fragrance.slug,
        description: fragrance.description || '',
        image_path: fragrance.image_path || '',
        brand: fragrance.brands?.name || '',
        hidden: fragrance.hidden || false, // Include hidden status for admin
        variants: fragranceVariants.map(variant => ({
          id: variant.id,
          size: variant.is_whole_bottle ? 'Whole Bottle' : `${variant.size_ml}ml`,
          size_ml: variant.size_ml,
          price: variant.is_whole_bottle ? null : variant.price_cents / 1000, // Convert fils to OMR
          price_display: variant.is_whole_bottle ? 'Contact for pricing' : `${(variant.price_cents / 1000).toFixed(3)} OMR`,
          sku: variant.sku || '',
          is_whole_bottle: variant.is_whole_bottle || false,
          available: true // Always available as per requirements
        })),
        created_at: fragrance.created_at,
        updated_at: fragrance.updated_at
      };
    });

    console.log(`Successfully processed ${fragrances.length} fragrances`);

    return new Response(JSON.stringify({
      success: true,
      data: fragrances,
      count: fragrances.length,
      source: 'supabase',
      adminView: isAdmin
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error fetching fragrances:', error);
    
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
      hasKey: !!context.env.SUPABASE_ANON_KEY,
      hasServiceKey: !!context.env.SUPABASE_SERVICE_ROLE_KEY
    },
    features: [
      'Hidden fragrances support',
      'Admin vs public view',
      'Automatic variant loading',
      'Brand relationship handling'
    ]
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}