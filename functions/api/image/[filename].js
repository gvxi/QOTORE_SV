// functions/api/image/[filename].js - Serve images from Supabase Storage
export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const filename = params.filename;
    
    // Get Supabase credentials
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response('Image service not configured', { status: 503 });
    }

    if (!filename) {
      return new Response('Filename required', { status: 400 });
    }

    // Validate filename (security)
    if (!filename.match(/^[a-z0-9-]+\.png$/)) {
      return new Response('Invalid filename format', { status: 400 });
    }

    console.log('Serving image:', filename);

    // Get image from Supabase Storage
    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/fragrance-images/${filename}`;
    
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!imageResponse.ok) {
      console.log('Image not found:', filename);
      return new Response('Image not found', { status: 404 });
    }

    // Return the image with proper headers
    const imageBuffer = await imageResponse.arrayBuffer();
    
    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Image serving error:', error);
    return new Response('Image service error', { status: 500 });
  }
}