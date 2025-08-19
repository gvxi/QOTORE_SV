// functions/admin/toggle-fragrance.js - Toggle fragrance visibility (hide/show)
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Toggle fragrance visibility request received');
    
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

    // Get Supabase credentials
    const { env } = context;
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({
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
    
    // Parse request data
    let requestData;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        return new Response(JSON.stringify({ 
          error: 'No data provided' 
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      requestData = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid request data format' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Validate required fields
    const { id, hidden } = requestData;
    
    if (!id || typeof hidden !== 'boolean') {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: id (number), hidden (boolean)',
        received: {
          id: id,
          hidden: hidden,
          hiddenType: typeof hidden
        }
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Toggling fragrance visibility:', { id, hidden });

    // Step 1: Check if fragrance exists
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?id=eq.${id}&select=id,name,hidden`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      console.error('Failed to check fragrance existence:', errorText);
      
      return new Response(JSON.stringify({
        error: 'Failed to verify fragrance existence',
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const existingFragrances = await checkResponse.json();
    if (existingFragrances.length === 0) {
      return new Response(JSON.stringify({
        error: 'Fragrance not found',
        id: id
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const fragrance = existingFragrances[0];
    console.log('Found fragrance:', fragrance.name, 'Current hidden status:', fragrance.hidden);

    // Step 2: Update visibility
    const updatePayload = {
      hidden: hidden,
      updated_at: new Date().toISOString()
    };

    console.log('Updating fragrance visibility with payload:', updatePayload);

    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updatePayload)
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Failed to update fragrance visibility:', errorText);
      
      return new Response(JSON.stringify({
        error: 'Failed to update fragrance visibility',
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const updatedFragrance = await updateResponse.json();
    console.log('Updated fragrance visibility:', updatedFragrance[0]);

    // Success response
    return new Response(JSON.stringify({ 
      success: true,
      message: `Fragrance ${hidden ? 'hidden from' : 'made visible in'} store successfully!`,
      data: {
        id: parseInt(id),
        name: fragrance.name,
        hidden: hidden,
        status: hidden ? 'hidden' : 'visible',
        updated_at: updatedFragrance[0].updated_at
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Toggle fragrance visibility error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to toggle fragrance visibility',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Test endpoint
export async function onRequestGet(context) {
  const cookies = context.request.headers.get('Cookie') || '';
  const sessionCookie = cookies
    .split(';')
    .find(c => c.trim().startsWith('admin_session='));
  
  const isAuthenticated = !!sessionCookie;
  
  return new Response(JSON.stringify({
    message: 'Toggle fragrance visibility endpoint is working!',
    authenticated: isAuthenticated,
    method: 'POST /admin/toggle-fragrance to hide/show a fragrance',
    requiredFields: ['id (number)', 'hidden (boolean)'],
    examples: {
      hide: { id: 123, hidden: true },
      show: { id: 123, hidden: false }
    },
    note: 'Authentication required via admin_session cookie'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}