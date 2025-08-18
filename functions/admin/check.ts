import type { PagesFunction } from '@cloudflare/workers-types';
import { verifyAdminToken } from '../_lib/auth'; 

export const onRequestGet: PagesFunction = async ({ request }) => {
  const cookieHeader = request.headers.get('Cookie') || '';
  const tokenMatch = cookieHeader.match(/admin_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;

  if (!token || !verifyAdminToken(token)) {
    // Not logged in → redirect to login page
    return Response.redirect('/login.html', 302);
  }

  // Logged in → serve admin page content
  const html = await fetch(`${request.url}/admin.html`).then(res => res.text());
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
};
