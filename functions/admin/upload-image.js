// functions/admin/upload-image.js - Upload images to Supabase Storage
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Image upload request received');
    
    // Check authentication
    const request = context.request;
    const cookies = request.headers.get('Cookie') || '';
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('admin_session='));
    
    if (!sessionCookie) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required',
        redirectUrl: '/login.html'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Get Supabase credentials
    const { env } = context;
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({
        error: 'Storage not configured',
        debug: {
          hasUrl: !!SUPABASE_URL,
          hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY
        }
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const imageFile = formData.get('image');
    const slug = formData.get('slug')?.toString().trim();

    if (!imageFile || !slug) {
      return new Response(JSON.stringify({
        error: 'Missing image file or slug',
        received: {
          hasImage: !!imageFile,
          hasSlug: !!slug
        }
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Validate file type (PNG only)
    if (!imageFile.type || !imageFile.type.includes('png')) {
      return new Response(JSON.stringify({
        error: 'Only PNG images are allowed',
        received: imageFile.type || 'unknown'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (imageFile.size > maxSize) {
      return new Response(JSON.stringify({
        error: 'Image too large. Maximum size is 5MB.',
        received: `${(imageFile.size / 1024 / 1024).toFixed(2)}MB`
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Generate filename from slug (lowercase, spaces to dashes, .png extension)
    const filename = `${slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.png`;
    console.log('Generated filename:', filename);

    // Convert File to ArrayBuffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    console.log('Uploading to Supabase Storage...');

    // Upload to Supabase Storage
    const uploadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/fragrance-images/${filename}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'image/png',
        'x-upsert': 'true' // Overwrite if exists
      },
      body: uint8Array
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Supabase upload failed:', errorText);
      
      return new Response(JSON.stringify({
        error: 'Failed to upload image to storage',
        details: errorText,
        status: uploadResponse.status
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const uploadResult = await uploadResponse.json();
    console.log('Upload successful:', uploadResult);

    // Generate public URL for the uploaded image
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/fragrance-images/${filename}`;
    const imagePath = `fragrance-images/${filename}`; // Full path for database storage

    return new Response(JSON.stringify({
      success: true,
      message: 'Image uploaded successfully!',
      data: {
        filename: filename,
        originalName: imageFile.name,
        size: imageFile.size,
        publicUrl: publicUrl,
        path: imagePath, // This goes to image_path column
        slug: slug // This is just the slug without extension
      }
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Image upload error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to upload image',
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Test endpoint
export async function onRequestGet(context) {
  const isAuthenticated = !!context.request.headers.get('Cookie')?.includes('admin_session=');
  
  return new Response(JSON.stringify({
    message: 'Image upload endpoint is working!',
    authenticated: isAuthenticated,
    method: 'POST /admin/upload-image',
    accepts: 'multipart/form-data',
    fields: ['image (File, PNG only)', 'slug (String)'],
    bucket: 'fragrance-images',
    maxSize: '5MB',
    fileNaming: 'slug.toLowerCase().replace(/\\s+/g, "-").png',
    supabaseConfig: {
      hasUrl: !!context.env.SUPABASE_URL,
      hasServiceKey: !!context.env.SUPABASE_SERVICE_ROLE_KEY
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}