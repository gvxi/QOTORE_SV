// functions/admin/update-fragrance/[id].js - Update existing fragrance
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
    
    // Parse fragrance data
    let fragranceData;
    try {
      const text = await request.text();
      fragranceData = JSON.parse(text);
    } catch (parseError) {
      return new Response(JSON.stringify({ 
        error: 'Invalid fragrance data format' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    const { name, slug, description, image, variants, brand } = fragranceData;
    
    if (!name || !slug || !description || !variants || !Array.isArray(variants)) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: name, slug, description, variants'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Validate variants
    const validVariants = variants.filter(v => {
      if (v.is_whole_bottle) {
        return true;
      }
      const price = parseFloat(v.price);
      return !isNaN(price) && price > 0 && v.size_ml > 0;
    });
    
    if (validVariants.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'At least one valid variant is required' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Updating fragrance:', fragranceId, { name, slug, variantCount: validVariants.length });

    // Step 1: Handle brand (if provided)
    let brandId = null;
    if (brand && brand.trim()) {
      const brandResponse = await fetch(`${SUPABASE_URL}/rest/v1/brands?name=eq.${encodeURIComponent(brand.trim())}`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });

      if (brandResponse.ok) {
        const existingBrands = await brandResponse.json();
        
        if (existingBrands.length > 0) {
          brandId = existingBrands[0].id;
        } else {
          // Create new brand
          const createBrandResponse = await fetch(`${SUPABASE_URL}/rest/v1/brands`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({ name: brand.trim() })
          });

          if (createBrandResponse.ok) {
            const newBrand = await createBrandResponse.json();
            brandId = newBrand[0].id;
          }
        }
      }
    }

    // Step 2: Update fragrance
    const fragrancePayload = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: description.trim(),
      image_path: image?.trim() || null,
      brand_id: brandId,
      updated_at: new Date().toISOString()
    };

    const fragranceResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?id=eq.${fragranceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(fragrancePayload)
    });

    if (!fragranceResponse.ok) {
      const errorText = await fragranceResponse.text();
      console.error('Failed to update fragrance:', errorText);
      
      if (errorText.includes('unique') || errorText.includes('duplicate')) {
        return new Response(JSON.stringify({
          error: 'A fragrance with this slug already exists'
        }), {
          status: 409,
          headers: corsHeaders
        });
      }
      
      return new Response(JSON.stringify({
        error: 'Failed to update fragrance in database',
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const updatedFragrance = await fragranceResponse.json();
    if (!updatedFragrance || updatedFragrance.length === 0) {
      return new Response(JSON.stringify({
        error: 'Fragrance not found'
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    // Step 3: Delete existing variants
    const deleteVariantsResponse = await fetch(`${SUPABASE_URL}/rest/v1/variants?fragrance_id=eq.${fragranceId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!deleteVariantsResponse.ok) {
      console.warn('Failed to delete existing variants, continuing...');
    }

    // Step 4: Create new variants
    const variantsPayload = validVariants.map(variant => {
      if (variant.is_whole_bottle) {
        return {
          fragrance_id: fragranceId,
          size_ml: null,
          price_cents: null,
          sku: variant.sku || null,
          is_whole_bottle: true
        };
      } else {
        const priceInCents = Math.round(parseFloat(variant.price) * 1000);
        
        return {
          fragrance_id: fragranceId,
          size_ml: variant.size_ml,
          price_cents: priceInCents,
          sku: variant.sku || null,
          is_whole_bottle: false
        };
      }
    });

    const variantsResponse = await fetch(`${SUPABASE_URL}/rest/v1/variants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(variantsPayload)
    });

    if (!variantsResponse.ok) {
      const errorText = await variantsResponse.text();
      console.error('Failed to create new variants:', errorText);
      
      return new Response(JSON.stringify({
        error: 'Fragrance updated but variants failed to save',
        details: errorText,
        partialSuccess: true
      }), {
        status: 207,
        headers: corsHeaders
      });
    }

    const createdVariants = await variantsResponse.json();

    // Success response
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Fragrance updated successfully!',
      data: {
        id: fragranceId,
        name: updatedFragrance[0].name,
        slug: updatedFragrance[0].slug,
        brand: brand || null,
        image_path: updatedFragrance[0].image_path,
        updated_at: updatedFragrance[0].updated_at,
        variantCount: createdVariants.length
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