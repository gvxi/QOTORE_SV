export async function onRequestPost(context: EventContext<any, any, any>): Promise<Response> {
  try {
    const request = context.request;
    const env = context.env;
    
    // Get credentials from environment variables
    const ADMIN_USER = env.ADMIN_USER;
    const ADMIN_PASS = env.ADMIN_PASS;
    
    if (!ADMIN_USER || !ADMIN_PASS) {
      return new Response(JSON.stringify({ 
        error: "Server configuration error" 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Parse request body
    let body: { username?: string; password?: string };
    try {
      const text = await request.text();
      if (!text) {
        return new Response(JSON.stringify({ 
          error: "No data provided" 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      body = JSON.parse(text);
    } catch (parseError) {
      return new Response(JSON.stringify({ 
        error: "Invalid JSON format" 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { username, password } = body;
    
    // Validate input
    if (!username || !password) {
      return new Response(JSON.stringify({ 
        error: "Username and password are required" 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check credentials
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      // Generate a simple session token (in production, use JWT or similar)
      const sessionToken = btoa(Date.now() + ':' + Math.random());
      
      // Set secure cookie
      return new Response(JSON.stringify({ 
        success: true,
        message: "Login successful" 
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `admin_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
        }
      });
    } else {
      return new Response(JSON.stringify({ 
        error: "Invalid credentials" 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    console.error('Login function error:', error);
    return new Response(JSON.stringify({ 
      error: "Internal server error" 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}