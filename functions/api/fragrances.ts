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

  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
  });
};
