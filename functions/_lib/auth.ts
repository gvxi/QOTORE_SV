import { sign, verify } from '@tsndr/cloudflare-worker-jwt';

// Create token with 1-hour expiration
export async function createToken(payload: object, secret: string) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour
  return await sign({ ...payload, exp }, secret);
}

// Verify token (returns true/false)
export async function verifyAdminToken(token: string, secret: string) {
  return await verify(token, secret);
}
