// functions/admin/toggle-fragrance/[id].js - Toggle fragrance visibility (hide/show)
export async function onRequestPut(context) {
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

    // Get fragrance ID from URL
    const fragranceId = context.params.id;
    if (!fragranceId) {
      return new Response(JSON.stringify({
        error: 'Fragrance ID is required'
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
      return new Response(JSON.stringify({
        error: 'Database not configured for admin operations'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    
    // Parse request data
    let requestData;
    try {
      const text = await request.text();
      requestData = JSON.parse(text);
    } catch (parseError) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request data format' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    const { hidden } = requestData;
    if (typeof hidden !== 'boolean') {
      return new Response(JSON.stringify({ 
        error: 'Hidden field must be a boolean value' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Toggling fragrance visibility:', fragranceId, { hidden });

    // Update fragrance visibility
    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?id=eq.${fragranceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        hidden: hidden,
        updated_at: new Date().toISOString()
      })
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
    if (!updatedFragrance || updatedFragrance.length === 0) {
      return new Response(JSON.stringify({
        error: 'Fragrance not found'
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    // Success response
    return new Response(JSON.stringify({ 
      success: true,
      message: `Fragrance ${hidden ? 'hidden' : 'shown'} successfully!`,
      data: {
        id: fragranceId,
        name: updatedFragrance[0].name,
        hidden: updatedFragrance[0].hidden,
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
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}