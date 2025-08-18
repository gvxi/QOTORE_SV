import type { PagesFunction } from '@cloudflare/workers-types';
import { createToken } from '../_lib/auth';
import { getServerClient } from '../_lib/supabase';
import { verifyPassword } from '../_lib/password';

export const onRequestPost: PagesFunction<{
  TK_PASS: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}> = async ({ request, env }) => {
  const formData = await request.formData();
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = new Date();

  if (!username || !password) {
    return new Response(JSON.stringify({ message: 'Missing username or password' }), { status: 400 });
  }

  const supabase = getServerClient({
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY
  });

  // --- Check IP block ---
  const { data: ipRecord } = await supabase
    .from('blocked_ips')
    .select('*')
    .eq('ip_address', ip)
    .maybeSingle();

  if (ipRecord && ipRecord.blocked_until && new Date(ipRecord.blocked_until) > now) {
    return new Response(JSON.stringify({ message: 'IP temporarily blocked' }), { status: 403 });
  }

  // --- Fetch admin user ---
  const { data: admin } = await supabase
    .from('admins')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (!admin) {
    return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401 });
  }

  if (admin.blocked_until && new Date(admin.blocked_until) > now) {
    return new Response(JSON.stringify({ message: 'Account temporarily blocked' }), { status: 403 });
  }

  // --- Verify password ---
  const valid = await verifyPassword(password, admin.password_hash);
  if (!valid) {
    // Increment user failed attempts
    await supabase
      .from('admins')
      .update({ failed_attempts: (admin.failed_attempts || 0) + 1, last_failed: now })
      .eq('id', admin.id);

    // Increment IP failed attempts
    if (ipRecord) {
      await supabase
        .from('blocked_ips')
        .update({ failed_attempts: (ipRecord.failed_attempts || 0) + 1, last_failed: now })
        .eq('id', ipRecord.id);
    } else {
      await supabase
        .from('blocked_ips')
        .insert({ ip_address: ip, failed_attempts: 1, last_failed: now });
    }

    // Block IP after 5 failed attempts
    const failed = ipRecord ? ipRecord.failed_attempts + 1 : 1;
    if (failed >= 5) {
      await supabase
        .from('blocked_ips')
        .update({ blocked_until: new Date(now.getTime() + 30 * 60 * 1000) })
        .eq('ip_address', ip);
    }

    return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401 });
  }

  // --- Reset failed attempts on success ---
  await supabase
    .from('admins')
    .update({ failed_attempts: 0, blocked_until: null })
    .eq('id', admin.id);

  if (ipRecord) {
    await supabase
      .from('blocked_ips')
      .update({ failed_attempts: 0, blocked_until: null })
      .eq('id', ipRecord.id);
  }

  // --- Create JWT token ---
  const token = await createToken({ username }, env.TK_PASS);

  // Set HttpOnly cookie
  const response = new Response(JSON.stringify({ message: 'Login successful' }), {
    headers: { 'Content-Type': 'application/json' }
  });
  response.headers.append('Set-Cookie', `admin_token=${token}; HttpOnly; Path=/; Max-Age=3600`);

  return response;
};
