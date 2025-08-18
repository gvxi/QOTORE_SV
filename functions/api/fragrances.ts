import type { PagesFunction } from '@cloudflare/workers-types';
import { getServerClient } from '../_lib/supabase';

export const onRequestGet: PagesFunction<{
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}> = async ({ env }) => {
  const supabase = getServerClient(env);

  const { data, error } = await supabase
    .from('fragrances')
    .select(`
      id, slug, name, description, image_path,
      variants:variants(id, size_ml, price_cents)
    `)
    .order('name');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Generate full public URL for images
  const result = data.map(f => ({
    ...f,
    image_url: f.image_path
      ? `https://ixrxsgnbgwpirusokvnj.supabase.co/storage/v1/object/public/${f.image_path}`
      : null,
  }));

  return new Response(JSON.stringify(result), {
    headers: { 'content-type': 'application/json' },
  });
};
