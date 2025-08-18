// functions/test.js - Ultra-simple test function
export async function onRequestGet() {
  return new Response('TEST FUNCTION WORKS!', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain'
    }
  });
}

export async function onRequestPost() {
  return new Response('POST TEST WORKS!', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain'
    }
  });
}