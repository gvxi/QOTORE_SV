// functions/admin/delete-fragrance.js - Delete fragrances and their variants
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

    // Get Supabase credentials
    const { env } = context;
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({
        error: 'Database not configured for admin operations',
        debug: {
          hasUrl: !!SUPABASE_URL,
          hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY
        }
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    
    // Parse request data
    let requestData;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        return new Response(JSON.stringify({ 
          error: 'No data provided' 
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      requestData = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid request data format' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Validate required fields
    const { id } = requestData;
    
    if (!id) {
      return new Response(JSON.stringify({ 
        error: 'Missing required field: id',
        received: { id: id }
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Deleting fragrance with ID:', id);

    // Step 1: Get fragrance details before deletion (for response and image cleanup)
    const getFragranceResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?id=eq.${id}&select=id,name,slug,image_path`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!getFragranceResponse.ok) {
      const errorText = await getFragranceResponse.text();
      console.error('Failed to get fragrance details:', errorText);
      
      return new Response(JSON.stringify({
        error: 'Failed to retrieve fragrance details',
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const fragrances = await getFragranceResponse.json();
    if (fragrances.length === 0) {
      return new Response(JSON.stringify({
        error: 'Fragrance not found',
        id: id
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const fragrance = fragrances[0];
    console.log('Found fragrance to delete:', fragrance.name);

    // Step 2: Delete stock records first (if they exist)
    const deleteStockResponse = await fetch(`${SUPABASE_URL}/rest/v1/stock?variant_id=in.(select id from variants where fragrance_id=${id})`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!deleteStockResponse.ok) {
      const stockError = await deleteStockResponse.text();
      console.warn('Failed to delete stock records (non-critical):', stockError);
    } else {
      console.log('Deleted stock records for fragrance variants');
    }

    // Step 3: Delete variants (CASCADE should handle this, but explicit delete for safety)
    const deleteVariantsResponse = await fetch(`${SUPABASE_URL}/rest/v1/variants?fragrance_id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!deleteVariantsResponse.ok) {
      const variantsError = await deleteVariantsResponse.text();
      console.error('Failed to delete variants:', variantsError);
      
      return new Response(JSON.stringify({
        error: 'Failed to delete fragrance variants',
        details: variantsError
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log('Deleted variants for fragrance:', id);

    // Step 4: Delete the fragrance itself
    const deleteFragranceResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!deleteFragranceResponse.ok) {
      const fragranceError = await deleteFragranceResponse.text();
      console.error('Failed to delete fragrance:', fragranceError);
      
      return new Response(JSON.stringify({
        error: 'Failed to delete fragrance from database',
        details: fragranceError
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log('Successfully deleted fragrance:', fragrance.name);

    // Step 5: Attempt to delete image from storage (optional - non-critical if it fails)
    if (fragrance.image_path) {
      try {
        let imageFilename = '';
        
        if (fragrance.image_path.startsWith('fragrance-images/')) {
          imageFilename = fragrance.image_path.replace('fragrance-images/', '');
        } else if (!fragrance.image_path.startsWith('http')) {
          imageFilename = fragrance.image_path;
        }
        
        if (imageFilename) {
          const deleteImageResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/fragrance-images/${imageFilename}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            }
          });

          if (deleteImageResponse.ok) {
            console.log('Successfully deleted image:', imageFilename);
          } else {
            console.warn('Failed to delete image (non-critical):', await deleteImageResponse.text());
          }
        }
      } catch (imageError) {
        console.warn('Error deleting image (non-critical):', imageError);
      }
    }

    // Success response
    return new Response(JSON.stringify({ 
      success: true,
      message: `Fragrance "${fragrance.name}" deleted successfully!`,
      data: {
        id: parseInt(id),
        name: fragrance.name,
        slug: fragrance.slug,
        deleted_at: new Date().toISOString(),
        cleaned_up: {
          variants: true,
          stock: true,
          image: !!fragrance.image_path
        }
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

// Test endpoint
export async function onRequestGet(context) {
  const cookies = context.request.headers.get('Cookie') || '';
  const sessionCookie = cookies
    .split(';')
    .find(c => c.trim().startsWith('admin_session='));
  
  const isAuthenticated = !!sessionCookie;
  
  return new Response(JSON.stringify({
    message: 'Delete fragrance endpoint is working!',
    authenticated: isAuthenticated,
    method: 'DELETE /admin/delete-fragrance to permanently delete a fragrance',
    requiredFields: ['id (number)'],
    example: { id: 123 },
    warning: 'This action is permanent and will delete:',
    deletedData: [
      'The fragrance record',
      'All variants and pricing',
      'Stock records',
      'Associated image file'
    ],
    note: 'Authentication required via admin_session cookie'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}