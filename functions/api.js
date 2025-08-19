export function onRequestGet() {
  return new Response(JSON.stringify({ 
    message: 'API works!', 
    timestamp: new Date().toISOString() 
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
