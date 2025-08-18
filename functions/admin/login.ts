import type { PagesFunction } from '@cloudflare/workers-types';
import { createToken } from '../_lib/auth';
import { getServerClient } from '../_lib/supabase';

// Plain-text password verification
function verifyPassword(password: string, hash: string) {
  return password === hash;
}

export const onRequestPost: PagesFunction<{
  TK_PASS: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}> = async ({ request, env }) => {
  try {
    // Parse JSON
    let body: any;
    try {
      body = await request.json();
    } catch (err) {
      return new Response(JSON.stringify({ message: 'Invalid JSON', debug: String(err) }), { status: 400 });
    }

    const { username, password } = body;
    if (!username || !password) {
      return new Response(JSON.stringify({ message: 'Missing username or password' }), { status: 400 });
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const now = new Date();

    const supabase = getServerClient({
      SUPABASE_URL: env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY
    });

    // Check IP block
    let ipRecord;
    try {
      const { data, error } = await supabase
        .from('blocked_ips')
        .select('*')
        .eq('ip_address', ip)
        .maybeSingle();
      if (error) throw error;
      ipRecord = data;
    } catch (err) {
      return new Response(JSON.stringify({ message: 'Error checking IP', debug: String(err) }), { status: 500 });
    }

    if (ipRecord && ipRecord.blocked_until && new Date(ipRecord.blocked_until) > now) {
      return new Response(JSON.stringify({ message: 'IP temporarily blocked' }), { status: 403 });
    }

    // Fetch admin
    let admin;
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('username', username)
        .maybeSingle();
      if (error) throw error;
      admin = data;
    } catch (err) {
      return new Response(JSON.stringify({ message: 'Error fetching admin', debug: String(err) }), { status: 500 });
    }

    if (!admin) return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401 });
    if (admin.blocked_until && new Date(admin.blocked_until) > now) {
      return new Response(JSON.stringify({ message: 'Account temporarily blocked' }), { status: 403 });
    }

    // Verify password
    const valid = verifyPassword(password, admin.password_hash);
    if (!valid) {
      return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401 });
    }

    // Create JWT
    let token;
    try {
      token = await createToken({ username }, env.TK_PASS);
    } catch (err) {
      return new Response(JSON.stringify({ message: 'Error creating token', debug: String(err) }), { status: 500 });
    }

    const response = new Response(JSON.stringify({ message: 'Login successful' }), {
      headers: { 'Content-Type': 'application/json' }
    });
    response.headers.append('Set-Cookie', `admin_token=${token}; HttpOnly; Path=/; Max-Age=3600`);
    return response;

  } catch (err) {
    return new Response(JSON.stringify({ message: 'Server error', debug: String(err) }), { status: 500 });
  }
};
