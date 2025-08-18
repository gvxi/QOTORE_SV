import type { PagesFunction } from '@cloudflare/workers-types';
import { verifyAdminToken } from '../_lib/auth';
import { getServerClient } from '../_lib/supabase';

export const onRequestGet: PagesFunction<{
  TK_PASS: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}> = async ({ request, env }) => {
  const cookieHeader = request.headers.get('Cookie') || '';
  const tokenMatch = cookieHeader.match(/admin_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  const supabase = getServerClient({
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY
  });

  // Check if IP is blocked
  const { data: ipRecord } = await supabase
    .from('blocked_ips')
    .select('*')
    .eq('ip_address', ip)
    .maybeSingle();

  if ((ipRecord && ipRecord.blocked_until && new Date(ipRecord.blocked_until) > new Date()) || !token || !(await verifyAdminToken(token, env.TK_PASS))) {
    // Serve rejection page
    const html = await fetch(`${request.url}/rejected.html`).then(res => res.text());
    return new Response(html, { headers: { 'Content-Type': 'text/html' }, status: 403 });
  }

  // Serve admin page
  const html = await fetch(`${request.url}/admin.html`).then(res => res.text());
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
};
