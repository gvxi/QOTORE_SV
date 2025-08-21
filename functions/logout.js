// functions/logout.js - Admin logout function
export async function onRequestPost(context) {
  console.log('Logout request received');
  
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    // Clear the session cookie
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Logged out successfully'
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        // Clear the admin session cookie
        'Set-Cookie': 'admin_session=; Path=/; Max-Age=0; SameSite=Lax'
      }
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

export async function onRequestGet(context) {
  // Also support GET requests for direct logout links
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/login.html',
      'Set-Cookie': 'admin_session=; Path=/; Max-Age=0; SameSite=Lax'
    }
  });
}

export function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true'
    }
  });
}