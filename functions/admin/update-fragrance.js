// functions/admin/update-fragrance.js - Update existing fragrances
export async function onRequestPut(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Update fragrance request received');
    
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
    
    // Parse update data
    let updateData;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        return new Response(JSON.stringify({ 
          error: 'No update data provided' 
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      updateData = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid update data format' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Validate required fields
    const { id, name, slug, description, image, variants, brand } = updateData;
    
    if (!id || !name || !slug || !description || !variants || !Array.isArray(variants)) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: id, name, slug, description, variants',
        received: {
          id: !!id,
          name: !!name,
          slug: !!slug,
          description: !!description,
          variants: Array.isArray(variants) ? `${variants.length} variants` : 'invalid'
        }
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Validate variants
    const validVariants = variants.filter(v => {
      if (v.is_whole_bottle) {
        return true; // Whole bottle is always valid (no price needed)
      }
      const price = parseFloat(v.price);
      return !isNaN(price) && price > 0 && v.size_ml > 0;
    });
    
    if (validVariants.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'At least one valid variant (size and price) is required' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Updating fragrance in Supabase:', { id, name, slug, variantCount: validVariants.length });

    // Step 1: Check if fragrance exists
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?id=eq.${id}&select=id,slug`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!checkResponse.ok) {
      return new Response(JSON.stringify({
        error: 'Failed to verify fragrance existence',
        details: await checkResponse.text()
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const existingFragrances = await checkResponse.json();
    if (existingFragrances.length === 0) {
      return new Response(JSON.stringify({
        error: 'Fragrance not found',
        id: id
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    // Step 2: Check for slug conflicts (excluding current fragrance)
    const slugCheckResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?slug=eq.${encodeURIComponent(slug.trim().toLowerCase())}&id=neq.${id}&select=id`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (slugCheckResponse.ok) {
      const conflictingFragrances = await slugCheckResponse.json();
      if (conflictingFragrances.length > 0) {
        return new Response(JSON.stringify({
          error: 'A fragrance with this slug already exists. Please use a different name/slug.',
          details: 'Slug conflict with another fragrance'
        }), {
          status: 409,
          headers: corsHeaders
        });
      }
    }

    // Step 3: Update fragrance
    const fragrancePayload = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: description.trim(),
      brand: brand?.trim() || null,
      updated_at: new Date().toISOString()
    };

    // Only update image if provided
    if (image && image.trim()) {
      fragrancePayload.image_path = image.trim();
    }

    console.log('Updating fragrance with payload:', fragrancePayload);

    const updateFragranceResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(fragrancePayload)
    });

    if (!updateFragranceResponse.ok) {
      const errorText = await updateFragranceResponse.text();
      console.error('Failed to update fragrance:', errorText);
      
      return new Response(JSON.stringify({
        error: 'Failed to update fragrance in database',
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const updatedFragrance = await updateFragranceResponse.json();
    console.log('Updated fragrance:', updatedFragrance[0]);

    // Step 4: Delete existing variants
    const deleteVariantsResponse = await fetch(`${SUPABASE_URL}/rest/v1/variants?fragrance_id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!deleteVariantsResponse.ok) {
      console.warn('Failed to delete existing variants:', await deleteVariantsResponse.text());
    } else {
      console.log('Deleted existing variants for fragrance:', id);
    }

    // Step 5: Create new variants
    const variantsPayload = validVariants.map(variant => {
      if (variant.is_whole_bottle) {
        return {
          fragrance_id: parseInt(id),
          size_ml: null,
          price_cents: null,
          sku: variant.sku || null,
          is_whole_bottle: true
        };
      } else {
        const priceInCents = Math.round(parseFloat(variant.price) * 1000);
        
        return {
          fragrance_id: parseInt(id),
          size_ml: variant.size_ml,
          price_cents: priceInCents,
          sku: variant.sku || null,
          is_whole_bottle: false
        };
      }
    });

    console.log('Creating new variants:', variantsPayload);

    const createVariantsResponse = await fetch(`${SUPABASE_URL}/rest/v1/variants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(variantsPayload)
    });

    if (!createVariantsResponse.ok) {
      const errorText = await createVariantsResponse.text();
      console.error('Failed to create new variants:', errorText);
      
      return new Response(JSON.stringify({
        error: 'Fragrance updated but variants failed to save',
        details: errorText,
        fragranceId: id,
        partialSuccess: true
      }), {
        status: 207, // Multi-status
        headers: corsHeaders
      });
    }

    const createdVariants = await createVariantsResponse.json();
    console.log('Created new variants:', createdVariants.length);

    // Success response
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Fragrance updated successfully!',
      data: {
        id: parseInt(id),
        name: updatedFragrance[0].name,
        slug: updatedFragrance[0].slug,
        brand: updatedFragrance[0].brand,
        image_path: updatedFragrance[0].image_path,
        updated_at: updatedFragrance[0].updated_at,
        variantCount: createdVariants.length,
        variants: createdVariants.map(v => {
          if (v.is_whole_bottle) {
            return {
              size: 'Whole Bottle',
              price: 'Contact for pricing'
            };
          } else {
            return {
              size: `${v.size_ml}ml`,
              price: `${(v.price_cents / 1000).toFixed(3)} OMR`
            };
          }
        })
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Update fragrance error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update fragrance',
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
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
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
    message: 'Update fragrance endpoint is working!',
    authenticated: isAuthenticated,
    method: 'PUT /admin/update-fragrance to update a fragrance',
    requiredFields: ['id', 'name', 'slug', 'description', 'variants'],
    optionalFields: ['brand', 'image'],
    note: 'Authentication required via admin_session cookie'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}