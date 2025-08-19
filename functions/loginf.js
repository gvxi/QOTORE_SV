// functions/loginf.js - Complete login function
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Login attempt started');
    
    // Get environment variables - NO FALLBACKS for security
    const { env } = context;
    const ADMIN_USER = env.ADMIN_USER;
    const ADMIN_PASS = env.ADMIN_PASS;
    
    // Check if environment variables are set
    if (!ADMIN_USER || !ADMIN_PASS) {
      console.error('Environment variables missing');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error - admin credentials not configured',
        debug: {
          hasAdminUser: !!ADMIN_USER,
          hasAdminPass: !!ADMIN_PASS
        }
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    
    // Parse request body
    let requestBody;
    try {
      const text = await context.request.text();
      if (!text || text.trim() === '') {
        return new Response(JSON.stringify({ 
          error: 'No data provided' 
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      requestBody = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid request format' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    const { username, password } = requestBody;
    
    // Validate input
    if (!username || !password) {
      return new Response(JSON.stringify({ 
        error: 'Username and password are required' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Check credentials
    if (username.trim() === ADMIN_USER && password === ADMIN_PASS) {
      console.log('Login successful for user:', username);
      
      // Generate session token
      const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Login successful!',
        redirectUrl: '/admin/index.html'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Set-Cookie': `admin_session=${sessionToken}; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Lax`
        }
      });
    } else {
      console.log('Invalid credentials provided');
      return new Response(JSON.stringify({ 
        error: 'Invalid username or password' 
      }), {
        status: 401,
        headers: corsHeaders
      });
    }
    
  } catch (error) {
    console.error('Login function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle CORS preflight
export function onRequestOptions() {
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

// Test GET endpoint to verify function and environment variables
export function onRequestGet(context) {
  const { env } = context;
  
  return new Response(JSON.stringify({
    message: 'Login function is working!',
    methods: ['POST for login', 'OPTIONS for CORS'],
    environmentCheck: {
      hasAdminUser: !!env.ADMIN_USER,
      hasAdminPass: !!env.ADMIN_PASS,
      adminUserLength: env.ADMIN_USER ? env.ADMIN_USER.length : 0,
      adminPassLength: env.ADMIN_PASS ? env.ADMIN_PASS.length : 0
    },
    endpoints: {
      login: 'POST /loginf',
      test: 'GET /loginf'
    },
    note: 'Set ADMIN_USER and ADMIN_PASS environment variables in Cloudflare Pages settings'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}