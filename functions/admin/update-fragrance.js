// functions/admin/update-fragrance.js - COMPLETELY REWRITTEN AND SIMPLIFIED
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('🔄 Update fragrance request received');
    
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
    let updateData;
    const text = await request.text();
    
    if (!text || text.trim() === '') {
      console.log('❌ No data provided');
      return new Response(JSON.stringify({ 
        error: 'No data provided' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    try {
      updateData = JSON.parse(text);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON data provided',
        details: parseError.message
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    console.log('📝 Received update data:', updateData);
    
    // Extract and validate required fields
    const { id, name, brand, description, variants, hidden, image_path } = updateData;
    
    if (!id || !name || !name.trim()) {
      console.log('❌ Missing required fields');
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: id and name are required',
        received: { id: !!id, name: !!name }
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      console.log('❌ Invalid variants');
      return new Response(JSON.stringify({ 
        error: 'At least one variant is required',
        received: { variants: variants ? `${variants.length} variants` : 'null' }
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Generate slug from name
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    console.log('🏷️ Generated slug:', slug);
    
    // STEP 1: Check if fragrance exists
    console.log('🔍 Checking if fragrance exists...');
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?id=eq.${id}&select=id,name,slug,image_path`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    
    if (!checkResponse.ok) {
      console.error('❌ Failed to check fragrance existence');
      return new Response(JSON.stringify({ 
        error: 'Failed to verify fragrance exists' 
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    
    const existingFragrances = await checkResponse.json();
    if (existingFragrances.length === 0) {
      console.log('❌ Fragrance not found');
      return new Response(JSON.stringify({ 
        error: `Fragrance with ID ${id} not found` 
      }), {
        status: 404,
        headers: corsHeaders
      });
    }
    
    console.log('✅ Found fragrance:', existingFragrances[0].name);
    
    // STEP 2: Check for slug conflicts (excluding current fragrance)
    console.log('🔍 Checking for slug conflicts...');
    const slugCheckResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?slug=eq.${slug}&id=neq.${id}&select=id`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    
    if (slugCheckResponse.ok) {
      const conflictingFragrances = await slugCheckResponse.json();
      if (conflictingFragrances.length > 0) {
        console.log('❌ Slug conflict detected');
        return new Response(JSON.stringify({ 
          error: 'A fragrance with this name already exists. Please use a different name.',
          conflictingSlug: slug
        }), {
          status: 409,
          headers: corsHeaders
        });
      }
    }
    
    console.log('✅ No slug conflicts');
    
    // STEP 3: Update fragrance record
    console.log('📝 Updating fragrance record...');
    const fragrancePayload = {
      name: name.trim(),
      slug: slug,
      description: description?.trim() || '',
      brand: brand?.trim() || null,
      hidden: Boolean(hidden),
      updated_at: new Date().toISOString()
    };

    // Add image path if provided
    if (image_path) {
      fragrancePayload.image_path = image_path;
      console.log('🖼️ Using image path:', image_path);
    }

    console.log('📄 Fragrance payload:', fragrancePayload);

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
      console.error('❌ Failed to update fragrance:', errorText);
      
      return new Response(JSON.stringify({
        error: 'Failed to update fragrance',
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const updatedFragrance = await updateFragranceResponse.json();
    console.log('✅ Updated fragrance successfully');

    // STEP 4: Replace all variants (simple strategy to avoid complex diffs)
    console.log('🗑️ Deleting existing variants...');
    const deleteVariantsResponse = await fetch(`${SUPABASE_URL}/rest/v1/variants?fragrance_id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!deleteVariantsResponse.ok) {
      const deleteError = await deleteVariantsResponse.text();
      console.warn('⚠️ Failed to delete existing variants:', deleteError);
    } else {
      console.log('✅ Deleted existing variants');
    }

    // STEP 5: Create new variants
    console.log('➕ Creating new variants...');
    const variantsToCreate = variants.map(variant => ({
      fragrance_id: parseInt(id),
      size_ml: variant.size_ml || null,
      price_cents: variant.price_cents || null,
      is_whole_bottle: Boolean(variant.is_whole_bottle),
      sku: variant.sku || null,
      max_quantity: variant.max_quantity || 50,
      in_stock: true,
      created_at: new Date().toISOString()
    }));
    
    console.log('📦 Variants to create:', variantsToCreate);
    
    const createVariantsResponse = await fetch(`${SUPABASE_URL}/rest/v1/variants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(variantsToCreate)
    });
    
    if (!createVariantsResponse.ok) {
      const errorText = await createVariantsResponse.text();
      console.error('❌ Failed to create new variants:', errorText);
      
      return new Response(JSON.stringify({
        error: 'Fragrance updated but variants failed to save',
        details: errorText,
        fragranceId: id,
        partialSuccess: true
      }), {
        status: 207,
        headers: corsHeaders
      });
    }
    
    const createdVariants = await createVariantsResponse.json();
    console.log('✅ Created variants:', createdVariants.length);

    // Success response
    console.log('🎉 Update completed successfully');
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Fragrance updated successfully!',
      data: {
        id: parseInt(id),
        name: updatedFragrance[0].name,
        slug: updatedFragrance[0].slug,
        brand: updatedFragrance[0].brand,
        image_path: updatedFragrance[0].image_path,
        hidden: updatedFragrance[0].hidden,
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
    console.error('💥 Update fragrance error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update fragrance',
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
    message: '✅ Update fragrance endpoint is working! (COMPLETELY REWRITTEN)',
    authenticated: isAuthenticated,
    method: 'POST /admin/update-fragrance',
    requiredFields: ['id', 'name', 'variants'],
    optionalFields: ['brand', 'description', 'hidden', 'image_path'],
    strategy: 'Simple replace-all variants (no complex diffs)',
    improvements: [
      '✅ Matches frontend data structure exactly',
      '✅ Detailed logging with emojis for debugging',
      '✅ Simplified variant replacement strategy',  
      '✅ Better error handling and validation',
      '✅ Clear step-by-step process'
    ],
    note: 'Authentication required via admin_session cookie'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}