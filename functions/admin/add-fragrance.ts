import type { PagesFunction } from '@cloudflare/workers-types';
import { getServerClient } from '../_lib/supabase';

export const onRequestPost: PagesFunction<{
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ADMIN_KEY: string; // secret admin key
}> = async ({ request, env }) => {
  // 1️⃣ Admin authentication
  const adminHeader = request.headers.get('Authorization');
  if (adminHeader !== `Bearer ${env.SUPABASE_ADMIN_KEY}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2️⃣ Parse form data
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  const description = formData.get('description') as string;

  // Get uploaded image
  const imageRaw = formData.get('image');

  if (!imageRaw) {
    return new Response(JSON.stringify({ message: 'No image provided' }), { status: 400 });
  }

  // Narrow type: ensure it's a Blob
  if (typeof imageRaw === 'string') {
    return new Response(JSON.stringify({ message: 'Invalid image file' }), { status: 400 });
  }

  const imageFile: Blob = imageRaw; // explicitly typed as Blob

  const sizes = formData.getAll('size_ml[]') as string[];
  const prices = formData.getAll('price_cents[]') as string[];

  if (!name || !slug || sizes.length === 0 || prices.length === 0) {
    return new Response(JSON.stringify({ message: 'Missing required fields' }), { status: 400 });
  }

  const supabase = getServerClient(env);

  // 3️⃣ Upload image to Supabase Storage
  const storagePath = `fragrance-images/${slug}-${Date.now()}-${(imageFile as any).name || 'image'}`;
  const arrayBuffer = await imageFile.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('fragrance-images')
    .upload(storagePath, new Uint8Array(arrayBuffer), { contentType: imageFile.type });

  if (uploadError) {
    return new Response(JSON.stringify({ message: uploadError.message }), { status: 500 });
  }

  // 4️⃣ Insert fragrance
  const { data: fragrance, error: insertFragranceError } = await supabase
    .from('fragrances')
    .insert({ name, slug, description, image_path: storagePath })
    .select()
    .maybeSingle();

  if (insertFragranceError || !fragrance) {
    return new Response(JSON.stringify({ message: insertFragranceError?.message || 'Failed to insert fragrance' }), { status: 500 });
  }

  // 5️⃣ Insert variants
  for (let i = 0; i < sizes.length; i++) {
    const size_ml = Number(sizes[i]);
    const price_cents = Number(prices[i]);
    if (!size_ml || !price_cents) continue;

    await supabase.from('variants').insert({
      fragrance_id: fragrance.id,
      size_ml,
      price_cents
    });
  }

  // 6️⃣ Success response
  return new Response(JSON.stringify({ message: 'Fragrance added successfully!' }), {
    headers: { 'content-type': 'application/json' }
  });
};
