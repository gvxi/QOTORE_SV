// functions/logout.js - Complete logout function
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Logout request received');
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Logged out successfully',
      redirectUrl: '/'
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        // Clear the session cookie
        'Set-Cookie': 'admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax'
      }
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ 
      error: 'Logout failed',
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

// Test GET endpoint
export function onRequestGet() {
  return new Response(JSON.stringify({
    message: 'Logout endpoint is working!',
    method: 'POST /logout to logout',
    note: 'This will clear the admin session cookie'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}