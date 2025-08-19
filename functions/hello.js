export function onRequestGet() {
  return new Response('Hello from Cloudflare Pages Functions!', {
    headers: { 'Content-Type': 'text/plain' }
  });
}