import type { PagesFunction } from '@cloudflare/workers-types';
import { getServerClient } from '../_lib/supabase';

// Replace with your Supabase project ref from dashboard
const SUPABASE_PUBLIC_URL = 'https://<your-supabase-project-ref>.supabase.co/storage/v1/object/public';

type Variant = {
  id: number;
  size_ml: number;
  price_cents: number;
};

type Fragrance = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  image_path: string | null;
  image_url: string | null;
  variants: Variant[];
};

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

  const fragrances: Fragrance[] = (data || []).map(f => ({
    ...f,
    image_url: f.image_path
      ? `${SUPABASE_PUBLIC_URL}/${f.image_path}`
      : null,
  }));

  return new Response(JSON.stringify(fragrances), {
    headers: { 'content-type': 'application/json' },
  });
};
