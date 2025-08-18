import type { PagesFunction } from '@cloudflare/workers-types';
import { getServerClient } from '../_lib/supabase';

// Helper to URL-encode WhatsApp message
function encodeQuery(text: string) {
  return encodeURIComponent(text).replace(/%20/g, '+');
}

export const onRequestGet: PagesFunction<{
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  WHATSAPP_NUMBER: string;
  SITE_NAME: string;
}> = async ({ env, params, request }) => {
  const supabase = getServerClient(env);
  const { variantId } = params as { variantId: string };

  // Get qty from query string (default = 1)
  const url = new URL(request.url);
  const qty = Math.max(1, Number(url.searchParams.get('qty') || '1'));

  // Fetch variant + its fragrance using maybeSingle()
  const { data: variant, error } = await supabase
    .from('variants')
    .select(`
      id, size_ml, price_cents,
      fragrance:fragrances(name, slug)
    `)
    .eq('id', variantId)
    .maybeSingle(); // <-- returns object instead of array

  if (error || !variant) {
    return new Response('Variant not found', { status: 404 });
  }

  // Safely access nested fragrance object
const fragrance = variant.fragrance?.[0] ?? { name: 'Unknown', slug: '' };

  // Build WhatsApp message
  const message = [
    `Hello, I'd like to order:`,
    `• ${fragrance.name} (${variant.size_ml}ml) x${qty}`,
    `Price each: ${(variant.price_cents / 100).toFixed(2)}`,
    `From: ${env.SITE_NAME}`,
    `Ref: ${fragrance.slug}#${variant.id}`,
  ].join('\n');

  // Redirect to WhatsApp
  const waUrl = `https://wa.me/${env.WHATSAPP_NUMBER}?text=${encodeQuery(message)}`;
  return Response.redirect(waUrl, 302);
};
