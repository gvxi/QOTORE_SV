// functions/admin/fragrances.js - Admin API that returns ALL fragrances including hidden ones
export async function onRequestGet(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Admin fragrances API called');
    const { env, request } = context;
    
    // Check authentication
    const cookies = request.headers.get('Cookie') || '';
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('admin_session='));
    
    if (!sessionCookie) {
      console.log('No admin session found');
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required',
        redirect: '/admin/login'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }
    
    // Check if Supabase environment variables are set
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment check:', {
      hasUrl: !!SUPABASE_URL,
      hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
      urlLength: SUPABASE_URL ? SUPABASE_URL.length : 0
    });
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({
        success: false,
        error: 'Database not configured',
        debug: {
          hasUrl: !!SUPABASE_URL,
          hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'
        }
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log('Fetching ALL fragrances from Supabase for admin...');

    // Fetch ALL fragrances (including hidden ones) - this is the key difference from public API
    const fragrancesResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
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
    console.log('Fetched fragrances for admin:', fragrancesData.length);

    // If no fragrances, return empty success
    if (!fragrancesData || fragrancesData.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        data: [],
        count: 0,
        source: 'admin-supabase',
        message: 'No fragrances found'
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
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    let variantsData = [];
    if (variantsResponse.ok) {
      variantsData = await variantsResponse.json();
      console.log('Fetched variants for admin:', variantsData.length);
    } else {
      console.warn('Variants fetch failed, continuing without variants');
    }

    // Combine fragrances with their variants (including hidden fragrances)
    // FIXED: Return raw database structure to maintain compatibility with admin forms
    const fragrances = fragrancesData.map(fragrance => {
      const fragranceVariants = variantsData.filter(v => v.fragrance_id === fragrance.id);
      
      return {
        id: fragrance.id,
        name: fragrance.name,
        slug: fragrance.slug,
        description: fragrance.description || '',
        image_path: fragrance.image_path || '',
        brand: fragrance.brand || '', // Simple text field
        hidden: fragrance.hidden || false, // Include hidden status for admin
        // FIXED: Keep raw database structure for admin compatibility
        variants: fragranceVariants.map(variant => ({
          id: variant.id,
          size_ml: variant.size_ml, // Keep original database field
          price_cents: variant.price_cents, // Keep original database field
          sku: variant.sku || '',
          is_whole_bottle: variant.is_whole_bottle || false,
          max_quantity: variant.max_quantity || 50,
          in_stock: variant.in_stock !== false,
          created_at: variant.created_at,
          // Also provide processed versions for display
          size: variant.is_whole_bottle ? 'Whole Bottle' : `${variant.size_ml}ml`,
          price: variant.is_whole_bottle ? null : variant.price_cents / 1000, // Convert fils to OMR
          price_display: variant.is_whole_bottle ? 'Contact for pricing' : `${(variant.price_cents / 1000).toFixed(3)} OMR`,
          available: true
        })),
        created_at: fragrance.created_at,
        updated_at: fragrance.updated_at
      };
    });

    console.log(`Successfully processed ${fragrances.length} fragrances for admin (including hidden ones)`);

    // Calculate stats for admin
    const totalFragrances = fragrances.length;
    const visibleFragrances = fragrances.filter(f => !f.hidden).length;
    const hiddenFragrances = fragrances.filter(f => f.hidden).length;
    const totalVariants = fragrances.reduce((sum, f) => sum + (f.variants?.length || 0), 0);

    return new Response(JSON.stringify({
      success: true,
      data: fragrances,
      count: totalFragrances,
      source: 'admin-supabase',
      stats: {
        total: totalFragrances,
        visible: visibleFragrances,
        hidden: hiddenFragrances,
        variants: totalVariants
      }
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error fetching fragrances for admin:', error);
    
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
    message: 'Admin fragrances API is working! (FIXED VERSION)',
    authenticated: isAuthenticated,
    endpoints: {
      get: 'GET /admin/fragrances - Fetch ALL fragrances (including hidden) for admin',
      test: 'POST /admin/fragrances - This test endpoint'
    },
    differences: {
      'Public API (/api/fragrances)': 'Shows only visible fragrances with processed data',
      'Admin API (/admin/fragrances)': 'Shows ALL fragrances including hidden ones with raw + processed data'
    },
    fixes: {
      'Data Structure': 'Now returns both raw database fields (size_ml, price_cents) and processed versions (size, price, price_display)',
      'Form Compatibility': 'populateForm function can now handle the data correctly',
      'Display Compatibility': 'getVariantsDisplay function works with both data structures'
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