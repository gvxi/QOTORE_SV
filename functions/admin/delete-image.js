// functions/admin/delete-image.js - Delete image from Supabase Storage
export async function onRequestDelete(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Delete image request received');
    
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
        error: 'Storage not configured'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    
    // Parse request data
    let requestData;
    try {
      const text = await request.text();
      requestData = JSON.parse(text);
    } catch (parseError) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request data format' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    const { imagePath } = requestData;
    if (!imagePath) {
      return new Response(JSON.stringify({ 
        error: 'Image path is required' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Deleting image from storage:', imagePath);

    // Extract filename from path (remove "fragrance-images/" prefix if present)
    const filename = imagePath.replace('fragrance-images/', '');
    
    // Validate filename for security
    if (!filename.match(/^[a-z0-9-]+\.png$/)) {
      return new Response(JSON.stringify({
        error: 'Invalid filename format'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Delete from Supabase Storage
    const deleteResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/fragrance-images/${filename}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error('Failed to delete image from storage:', errorText);
      
      // Don't treat 404 as an error - image might already be deleted
      if (deleteResponse.status === 404) {
        return new Response(JSON.stringify({
          success: true,
          message: 'Image already deleted or does not exist',
          data: { imagePath, filename }
        }), {
          status: 200,
          headers: corsHeaders
        });
      }
      
      return new Response(JSON.stringify({
        error: 'Failed to delete image from storage',
        details: errorText,
        status: deleteResponse.status
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log('Successfully deleted image from storage:', filename);

    // Success response
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Image deleted successfully from storage',
      data: {
        imagePath,
        filename,
        deleted_at: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Delete image error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete image',
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
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
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
    message: 'Delete image endpoint is working!',
    authenticated: isAuthenticated,
    method: 'DELETE /admin/delete-image',
    accepts: 'application/json',
    fields: ['imagePath (String)'],
    bucket: 'fragrance-images',
    fileNaming: 'slug.toLowerCase().replace(/\\s+/g, "-").png',
    supabaseConfig: {
      hasUrl: !!context.env.SUPABASE_URL,
      hasServiceKey: !!context.env.SUPABASE_SERVICE_ROLE_KEY
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}