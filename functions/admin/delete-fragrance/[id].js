// functions/admin/delete-fragrance/[id].js - Delete fragrance and its image
export async function onRequestDelete(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Delete fragrance request received');
    
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

    // Get fragrance ID from URL
    const fragranceId = context.params.id;
    if (!fragranceId) {
      return new Response(JSON.stringify({
        error: 'Fragrance ID is required'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Get Supabase credentials
    const { env } = context;
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({
        error: 'Database not configured for admin operations'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log('Deleting fragrance:', fragranceId);

    // Step 1: Get fragrance details (especially image path)
    const fragranceResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?id=eq.${fragranceId}&select=*`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!fragranceResponse.ok) {
      return new Response(JSON.stringify({
        error: 'Failed to fetch fragrance details'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const fragranceData = await fragranceResponse.json();
    if (!fragranceData || fragranceData.length === 0) {
      return new Response(JSON.stringify({
        error: 'Fragrance not found'
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const fragrance = fragranceData[0];
    const imagePath = fragrance.image_path;

    // Step 2: Delete variants (cascade should handle this, but let's be explicit)
    const deleteVariantsResponse = await fetch(`${SUPABASE_URL}/rest/v1/variants?fragrance_id=eq.${fragranceId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!deleteVariantsResponse.ok) {
      console.warn('Failed to delete variants, but continuing with fragrance deletion');
    }

    // Step 3: Delete stock entries (if any)
    const deleteStockResponse = await fetch(`${SUPABASE_URL}/rest/v1/stock?variant_id=in.(select id from variants where fragrance_id=${fragranceId})`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    // We don't check this response since stock might not exist

    // Step 4: Delete the fragrance itself
    const deleteFragranceResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?id=eq.${fragranceId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!deleteFragranceResponse.ok) {
      const errorText = await deleteFragranceResponse.text();
      console.error('Failed to delete fragrance:', errorText);
      
      return new Response(JSON.stringify({
        error: 'Failed to delete fragrance from database',
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // Step 5: Delete image from Supabase Storage (if exists)
    if (imagePath) {
      try {
        console.log('Deleting image from storage:', imagePath);
        
        // Extract filename from path (remove "fragrance-images/" prefix)
        const filename = imagePath.replace('fragrance-images/', '');
        
        const deleteImageResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/fragrance-images/${filename}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          }
        });

        if (!deleteImageResponse.ok) {
          const imageError = await deleteImageResponse.text();
          console.warn('Failed to delete image from storage:', imageError);
          // Don't fail the entire operation if image deletion fails
        } else {
          console.log('Successfully deleted image from storage');
        }
      } catch (imageError) {
        console.warn('Error deleting image:', imageError);
        // Continue even if image deletion fails
      }
    }

    // Success response
    return new Response(JSON.stringify({ 
      success: true,
      message: `Fragrance "${fragrance.name}" deleted successfully!`,
      data: {
        id: fragranceId,
        name: fragrance.name,
        imagePath: imagePath,
        deleted_at: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Delete fragrance error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete fragrance',
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