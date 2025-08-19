// functions/loginf.js - Ultra-simple debug version
console.log('loginf.js file loaded');

export function onRequestGet(context) {
  console.log('GET request to loginf');
  
  return new Response(JSON.stringify({
    status: 'loginf function is working!',
    timestamp: new Date().toISOString(),
    environment: {
      hasAdminUser: !!context.env.ADMIN_USER,
      hasAdminPass: !!context.env.ADMIN_PASS,
      adminUser: context.env.ADMIN_USER ? 'SET' : 'NOT SET',
      adminPass: context.env.ADMIN_PASS ? 'SET' : 'NOT SET'
    }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// functions/loginf.js - Working version with proper authentication
export async function onRequestPost(context) {
  console.log('Login POST request received');
  
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    const { env, request } = context;
    
    // Get environment variables
    const ADMIN_USER = env.ADMIN_USER;
    const ADMIN_PASS = env.ADMIN_PASS;
    
    console.log('Environment check:', { 
      hasUser: !!ADMIN_USER, 
      hasPass: !!ADMIN_PASS,
      userLength: ADMIN_USER ? ADMIN_USER.length : 0,
      passLength: ADMIN_PASS ? ADMIN_PASS.length : 0
    });
    
    if (!ADMIN_USER || !ADMIN_PASS) {
      console.error('Missing environment variables');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error - admin credentials not configured'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    
    // Parse request body
    let requestBody;
    try {
      const text = await request.text();
      console.log('Request body received, length:', text.length);
      
      if (!text || text.trim() === '') {
        return new Response(JSON.stringify({ 
          error: 'No data provided' 
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      
      requestBody = JSON.parse(text);
      console.log('Parsed request body:', { username: requestBody.username, hasPassword: !!requestBody.password });
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
      console.log('Missing username or password');
      return new Response(JSON.stringify({ 
        error: 'Username and password are required' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Check credentials
    console.log('Checking credentials for user:', username);
    console.log('Expected user:', ADMIN_USER);
    console.log('Username match:', username.trim() === ADMIN_USER);
    console.log('Password match:', password === ADMIN_PASS);
    
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

export function onRequestOptions() {
  console.log('OPTIONS request to loginf');
  
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}