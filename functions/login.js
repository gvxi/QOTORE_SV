export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const body = await context.request.json();
    const { username, password } = body;

    // Hardcoded test credentials first
    if (username === 'admin' && password === 'password123') {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Login successful!' 
      }), {
        headers: {
          ...corsHeaders,
          'Set-Cookie': 'admin_session=test123; Path=/; Max-Age=3600'
        }
      });
    } else {
      return new Response(JSON.stringify({ 
        error: 'Invalid credentials' 
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Server error: ' + error.message 
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

export function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
