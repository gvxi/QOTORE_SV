// functions/api/config.js - SECURE Configuration API endpoint
export async function onRequestGet(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    const { env } = context;
    
    // Get environment variables
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
    const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
    
    // Check if required environment variables are set
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Missing required Supabase environment variables');
      return new Response(JSON.stringify({
        error: 'Configuration incomplete - missing Supabase credentials',
        hasSupabaseUrl: !!SUPABASE_URL,
        hasSupabaseKey: !!SUPABASE_ANON_KEY,
        hasGoogleClientId: !!GOOGLE_CLIENT_ID
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const config = {
      SUPABASE_URL: SUPABASE_URL,
      SUPABASE_ANON_KEY: SUPABASE_ANON_KEY, 
      GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID || null 
    };

    console.log('Configuration served:', {
      hasSupabaseUrl: !!config.SUPABASE_URL,
      hasSupabaseKey: !!config.SUPABASE_ANON_KEY,
      hasGoogleClientId: !!config.GOOGLE_CLIENT_ID
    });

    return new Response(JSON.stringify(config), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Configuration API error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to load configuration',
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle CORS preflight requests
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