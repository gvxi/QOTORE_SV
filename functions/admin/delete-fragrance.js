// functions/admin/delete-fragrance.js - FIXED TO USE POST METHOD
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('🗑️ Delete fragrance request received');
    
    // Check authentication
    const request = context.request;
    const cookies = request.headers.get('Cookie') || '';
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('admin_session='));
    
    if (!sessionCookie) {
      console.log('❌ No admin session found');
      return new Response(JSON.stringify({ 
        error: 'Authentication required',
        redirectUrl: '/admin/login'
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
      console.error('❌ Missing Supabase environment variables');
      return new Response(JSON.stringify({
        error: 'Database not configured for admin operations'
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
      console.error('❌ JSON parse error:', parseError);
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

    console.log('🔍 Deleting fragrance with ID:', id);

    // STEP 1: Get fragrance details before deletion (for response and image cleanup)
    console.log('📋 Getting fragrance details before deletion...');
    const getFragranceResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?id=eq.${id}&select=id,name,slug,image_path`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!getFragranceResponse.ok) {
      const errorText = await getFragranceResponse.text();
      console.error('❌ Failed to get fragrance details:', errorText);
      
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
      console.log('❌ Fragrance not found');
      return new Response(JSON.stringify({
        error: 'Fragrance not found',
        id: id
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const fragrance = fragrances[0];
    console.log('✅ Found fragrance to delete:', fragrance.name);

    // STEP 2: Delete stock records first (if they exist)
    console.log('🗃️ Deleting stock records...');
    const deleteStockResponse = await fetch(`${SUPABASE_URL}/rest/v1/stock?variant_id=in.(select id from variants where fragrance_id=${id})`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!deleteStockResponse.ok) {
      const stockError = await deleteStockResponse.text();
      console.warn('⚠️ Failed to delete stock records (non-critical):', stockError);
    } else {
      console.log('✅ Deleted stock records for fragrance variants');
    }

    // STEP 3: Delete variants (CASCADE should handle this, but explicit delete for safety)
    console.log('📦 Deleting variants...');
    const deleteVariantsResponse = await fetch(`${SUPABASE_URL}/rest/v1/variants?fragrance_id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!deleteVariantsResponse.ok) {
      const variantsError = await deleteVariantsResponse.text();
      console.error('❌ Failed to delete variants:', variantsError);
      
      return new Response(JSON.stringify({
        error: 'Failed to delete fragrance variants',
        details: variantsError
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log('✅ Deleted variants for fragrance:', id);

    // STEP 4: Delete the fragrance itself
    console.log('🏷️ Deleting fragrance record...');
    const deleteFragranceResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!deleteFragranceResponse.ok) {
      const fragranceError = await deleteFragranceResponse.text();
      console.error('❌ Failed to delete fragrance:', fragranceError);
      
      return new Response(JSON.stringify({
        error: 'Failed to delete fragrance from database',
        details: fragranceError
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log('✅ Successfully deleted fragrance:', fragrance.name);

    // STEP 5: Attempt to delete image from storage using your delete-image endpoint
    if (fragrance.image_path) {
      try {
        console.log('🖼️ Deleting image from storage:', fragrance.image_path);
        
        const deleteImageResponse = await fetch(`${context.env.SUPABASE_URL}/storage/v1/object/fragrance-images/${fragrance.image_path}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          }
        });

        if (deleteImageResponse.ok) {
          console.log('✅ Successfully deleted image:', fragrance.image_path);
        } else {
          console.warn('⚠️ Failed to delete image (non-critical):', await deleteImageResponse.text());
        }
      } catch (imageError) {
        console.warn('⚠️ Error deleting image (non-critical):', imageError);
      }
    }

    // Success response
    console.log('🎉 Delete operation completed successfully');
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
    console.error('💥 Delete fragrance error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete fragrance',
      details: error.message,
      stack: error.stack
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
  const cookies = context.request.headers.get('Cookie') || '';
  const sessionCookie = cookies
    .split(';')
    .find(c => c.trim().startsWith('admin_session='));
  
  const isAuthenticated = !!sessionCookie;
  
  return new Response(JSON.stringify({
    message: '✅ Delete fragrance endpoint is working! (FIXED FOR POST)',
    authenticated: isAuthenticated,
    method: 'POST /admin/delete-fragrance to permanently delete a fragrance',
    requiredFields: ['id (number)'],
    example: { id: 123 },
    warning: '⚠️ This action is permanent and will delete:',
    deletedData: [
      '🏷️ The fragrance record',
      '📦 All variants and pricing',
      '🗃️ Stock records', 
      '🖼️ Associated image file'
    ],
    improvements: [
      '✅ Uses POST method (matches frontend)',
      '✅ Detailed logging with emojis', 
      '✅ Proper error handling',
      '✅ Image cleanup using direct Supabase API'
    ],
    note: '🔑 Authentication required via admin_session cookie'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Keep DELETE method for backward compatibility
export async function onRequestDelete(context) {
  return onRequestPost(context);
}