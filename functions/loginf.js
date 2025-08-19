// functions/login.js
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    // Get environment variables
    const { env } = context;
    const ADMIN_USER = env.ADMIN_USER 
    const ADMIN_PASS = env.ADMIN_PASS 
    
    // Parse request body
    const requestBody = await context.request.json();
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
      // Generate simple session token
      const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Login successful!' 
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Set-Cookie': `admin_session=${sessionToken}; Path=/; Max-Age=3600; HttpOnly; Secure; SameSite=Lax`
        }
      });
    } else {
      return new Response(JSON.stringify({ 
        error: 'Invalid username or password' 
      }), {
        status: 401,
        headers: corsHeaders
      });
    }
    
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error: ' + error.message 
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
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Test GET endpoint to verify function is working
export function onRequestGet() {
  return new Response(JSON.stringify({
    message: 'Login endpoint is working!',
    methods: ['POST for login', 'OPTIONS for CORS'],
    testCredentials: {
      username: 'admin',
      password: 'password123'
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}