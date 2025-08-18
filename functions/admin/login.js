// functions/login.js
export async function onRequestPost(context) {
  console.log('Login function called');
  
  try {
    const { request, env } = context;
    
    // CORS headers for all responses
    const corsHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    
    // Check environment variables
    const ADMIN_USER = env.ADMIN_USER;
    const ADMIN_PASS = env.ADMIN_PASS;
    
    console.log('Environment check:', { 
      hasUser: !!ADMIN_USER, 
      hasPass: !!ADMIN_PASS 
    });
    
    if (!ADMIN_USER || !ADMIN_PASS) {
      console.error('Missing environment variables');
      return new Response(JSON.stringify({ 
        error: "Server configuration error - please check environment variables" 
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    
    // Get request body
    let requestBody;
    try {
      const text = await request.text();
      console.log('Request body received:', text);
      
      if (!text || text.trim() === '') {
        return new Response(JSON.stringify({ 
          error: "No data provided" 
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      
      requestBody = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        error: "Invalid JSON format" 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    const { username, password } = requestBody;
    
    // Validate input
    if (!username || !password) {
      return new Response(JSON.stringify({ 
        error: "Username and password are required" 
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
        message: "Login successful" 
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Set-Cookie': `admin_session=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`
        }
      });
    } else {
      console.log('Invalid credentials provided');
      return new Response(JSON.stringify({ 
        error: "Invalid username or password" 
      }), {
        status: 401,
        headers: corsHeaders
      });
    }
    
  } catch (error) {
    console.error('Login function error:', error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Handle CORS preflight requests
export async function onRequestOptions(context) {
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