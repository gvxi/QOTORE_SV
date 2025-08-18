// functions/login.js
export async function onRequestPost(context) {
  console.log('Login function called');
  
  try {
    const { request, env } = context;
    
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
        error: "Server configuration error - missing credentials" 
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }
    
    // Get request body
    let requestBody;
    try {
      const text = await request.text();
      console.log('Request body:', text);
      
      if (!text || text.trim() === '') {
        return new Response(JSON.stringify({ 
          error: "No data provided" 
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      requestBody = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        error: "Invalid JSON format" 
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    const { username, password } = requestBody;
    console.log('Credentials received:', { username: !!username, password: !!password });
    
    // Validate input
    if (!username || !password) {
      return new Response(JSON.stringify({ 
        error: "Username and password are required" 
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Check credentials
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      console.log('Login successful');
      
      // Generate simple session token
      const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return new Response(JSON.stringify({ 
        success: true,
        message: "Login successful" 
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `admin_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true'
        }
      });
    } else {
      console.log('Invalid credentials');
      return new Response(JSON.stringify({ 
        error: "Invalid credentials" 
      }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
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

// Handle OPTIONS requests for CORS
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}