// functions/test.js - Simple test function to verify Functions are working
export async function onRequestGet(context) {
  console.log('Test function called');
  
  return new Response(JSON.stringify({
    message: "Test function is working!",
    timestamp: new Date().toISOString(),
    env_check: {
      hasAdminUser: !!context.env.ADMIN_USER,
      hasAdminPass: !!context.env.ADMIN_PASS
    }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function onRequestPost(context) {
  console.log('Test POST function called');
  
  let body = {};
  try {
    const text = await context.request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch (e) {
    console.error('JSON parse error in test:', e);
  }
  
  return new Response(JSON.stringify({
    message: "Test POST function is working!",
    receivedBody: body,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}