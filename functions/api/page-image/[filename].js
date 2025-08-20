// functions/api/page-image/[filename].js
export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const filename = params.filename;
    
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response('Image service not configured', { status: 503 });
    }

    if (!filename) {
      return new Response('Filename required', { status: 400 });
    }

    // Validate filename for page images (more permissive than fragrance images)
    if (!filename.match(/^[a-z0-9-]+\.(png|jpg|jpeg|svg)$/)) {
      return new Response('Invalid filename format', { status: 400 });
    }

    console.log('Serving page image:', filename);

    // Get image from page-images bucket
    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/page-images/${filename}`;
    
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!imageResponse.ok) {
      console.log('Page image not found:', filename);
      return new Response('Image not found', { status: 404 });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    
    return new Response(imageBuffer, {
      headers: {
        'Content-Type': imageResponse.headers.get('content-type') || 'image/png',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Page image serving error:', error);
    return new Response('Image service error', { status: 500 });
  }
}