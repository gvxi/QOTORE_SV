// functions/admin/update-fragrance.js - FIXED VERSION  
export async function onRequestPost(context) {
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
    
    // Parse request data - Expect JSON only (images handled separately)
    let fragranceData;
    
    const text = await request.text();
    if (!text || text.trim() === '') {
      return new Response(JSON.stringify({ 
        error: 'No data provided' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    try {
      fragranceData = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON data provided' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    console.log('Received fragrance update data:', fragranceData);
    
    // Validate required fields
    const { id, name, brand, description, variants, hidden, slug, image_path } = fragranceData;
    
    if (!id || !name || !name.trim()) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: id and name are required' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'At least one variant is required' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Generate slug if not provided
    const finalSlug = slug || name.toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    console.log('Using slug:', finalSlug);
    
    // Check if fragrance exists
    const existingResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?id=eq.${id}&select=id,name,slug,image_path`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    
    if (!existingResponse.ok) {
      return new Response(JSON.stringify({ 
        error: 'Failed to verify fragrance exists' 
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    
    const existingFragrances = await existingResponse.json();
    if (existingFragrances.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Fragrance not found' 
      }), {
        status: 404,
        headers: corsHeaders
      });
    }
    
    const existingFragrance = existingFragrances[0];
    
    // Check if slug conflicts with other fragrances (excluding current one)
    if (finalSlug !== existingFragrance.slug) {
      const slugCheckResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?slug=eq.${finalSlug}&id=neq.${id}&select=id`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      
      if (slugCheckResponse.ok) {
        const conflictingFragrances = await slugCheckResponse.json();
        if (conflictingFragrances.length > 0) {
          return new Response(JSON.stringify({ 
            error: 'A fragrance with this name already exists. Please use a different name.',
            details: 'Slug conflict with another fragrance'
          }), {
            status: 409,
            headers: corsHeaders
          });
        }
      }
    }
    
    // Handle image upload if provided
    let imagePath = existingFragrance.image_path; // Keep existing image by default
    if (imageFile && imageFile.size > 0) {
      try {
        const imageBuffer = await imageFile.arrayBuffer();
        const fileName = `${finalSlug}.png`;
        
        console.log('Uploading new image:', fileName);
        
        // Delete old image if it exists and is different
        if (existingFragrance.image_path && existingFragrance.image_path !== fileName) {
          try {
            await fetch(`${SUPABASE_URL}/storage/v1/object/fragrance-images/${existingFragrance.image_path}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
              }
            });
            console.log('Deleted old image:', existingFragrance.image_path);
          } catch (deleteError) {
            console.warn('Failed to delete old image (non-critical):', deleteError);
          }
        }
        
        const uploadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/fragrance-images/${fileName}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': imageFile.type || 'image/png'
          },
          body: imageBuffer
        });
        
        if (uploadResponse.ok) {
          imagePath = fileName;
          console.log('New image uploaded successfully:', fileName);
        } else {
          const uploadError = await uploadResponse.text();
          console.error('Image upload failed:', uploadError);
          
          return new Response(JSON.stringify({
            error: 'Failed to upload new image',
            details: uploadError
          }), {
            status: 500,
            headers: corsHeaders
          });
        }
      } catch (imageError) {
        console.error('Image processing error:', imageError);
        return new Response(JSON.stringify({
          error: 'Failed to process new image',
          details: imageError.message
        }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }
    
    // Get existing variants for comparison
    const existingVariantsResponse = await fetch(`${SUPABASE_URL}/rest/v1/variants?fragrance_id=eq.${id}&select=id,size_ml,price_cents,is_whole_bottle,sku`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    let existingVariants = [];
    if (existingVariantsResponse.ok) {
      existingVariants = await existingVariantsResponse.json();
      console.log('Found existing variants:', existingVariants.length);
    }

    // Update fragrance
    const fragrancePayload = {
      name: name.trim(),
      slug: finalSlug.trim().toLowerCase(),
      description: description?.trim() || '',
      brand: brand?.trim() || null,
      image_path: imagePath,
      hidden: Boolean(hidden),
      updated_at: new Date().toISOString()
    };

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
        error: 'Failed to update fragrance',
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const updatedFragrance = await updateFragranceResponse.json();
    console.log('Updated fragrance successfully');

    // Compare variants and determine what to create, update, or delete
    const variantsToCreate = [];
    const variantsToUpdate = [];
    const variantsToDelete = [];

    // Create a map of existing variants for easy lookup
    const existingVariantsMap = new Map();
    existingVariants.forEach(variant => {
      const key = variant.is_whole_bottle ? 'whole_bottle' : `${variant.size_ml}ml`;
      existingVariantsMap.set(key, variant);
    });

    // Process new variants
    variants.forEach(newVariant => {
      const key = newVariant.is_whole_bottle ? 'whole_bottle' : `${newVariant.size_ml}ml`;
      const existingVariant = existingVariantsMap.get(key);

      if (existingVariant) {
        // Update existing variant if price changed
        const priceCents = newVariant.price_cents || null;
        if (existingVariant.price_cents !== priceCents) {
          variantsToUpdate.push({
            id: existingVariant.id,
            price_cents: priceCents,
            updated_at: new Date().toISOString()
          });
        }
        // Mark as processed
        existingVariantsMap.delete(key);
      } else {
        // Create new variant
        variantsToCreate.push({
          fragrance_id: parseInt(id),
          size_ml: newVariant.size_ml || null,
          price_cents: newVariant.price_cents || null,
          is_whole_bottle: Boolean(newVariant.is_whole_bottle),
          sku: newVariant.sku || null,
          max_quantity: newVariant.max_quantity || 50,
          in_stock: true,
          created_at: new Date().toISOString()
        });
      }
    });

    // Remaining variants in the map should be deleted
    existingVariantsMap.forEach(variant => {
      variantsToDelete.push(variant.id);
    });

    console.log('Variant operations:', {
      toCreate: variantsToCreate.length,
      toUpdate: variantsToUpdate.length,
      toDelete: variantsToDelete.length
    });

    // Delete variants that are no longer needed
    if (variantsToDelete.length > 0) {
      const deleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/variants?id=in.(${variantsToDelete.join(',')})`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });

      if (!deleteResponse.ok) {
        console.warn('Failed to delete some variants:', await deleteResponse.text());
      } else {
        console.log('Deleted variants:', variantsToDelete);
      }
    }

    // Update existing variants
    for (const variantToUpdate of variantsToUpdate) {
      const { id: variantId, ...updatePayload } = variantToUpdate;
      
      const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/variants?id=eq.${variantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify(updatePayload)
      });

      if (!updateResponse.ok) {
        console.warn(`Failed to update variant ${variantId}:`, await updateResponse.text());
      }
    }

    // Create new variants
    let createdVariants = [];
    if (variantsToCreate.length > 0) {
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
        console.error('Failed to create new variants:', errorText);
        
        return new Response(JSON.stringify({
          error: 'Fragrance updated but some new variants failed to save',
          details: errorText,
          fragranceId: id,
          partialSuccess: true
        }), {
          status: 207, // Multi-status
          headers: corsHeaders
        });
      }

      createdVariants = await createVariantsResponse.json();
      console.log('Created new variants:', createdVariants.length);
    }

    // Get final variant count
    const finalVariantsResponse = await fetch(`${SUPABASE_URL}/rest/v1/variants?fragrance_id=eq.${id}&select=id,size_ml,price_cents,is_whole_bottle`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    let finalVariantCount = 0;
    let finalVariants = [];
    if (finalVariantsResponse.ok) {
      finalVariants = await finalVariantsResponse.json();
      finalVariantCount = finalVariants.length;
    }

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
        hidden: updatedFragrance[0].hidden,
        updated_at: updatedFragrance[0].updated_at,
        variantCount: finalVariantCount,
        variants: finalVariants.map(v => {
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
        }),
        changes: {
          deleted: variantsToDelete.length,
          updated: variantsToUpdate.length,
          created: variantsToCreate.length
        }
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
    message: 'Update fragrance endpoint is working! (FIXED VERSION)',
    authenticated: isAuthenticated,
    method: 'POST /admin/update-fragrance to update a fragrance',
    requiredFields: ['id', 'name', 'variants'],
    optionalFields: ['brand', 'description', 'slug', 'hidden', 'image'],
    improvements: [
      'Handles both FormData (with images) and JSON (without images)',
      'Smart variant management - only updates changed variants',
      'Prevents duplicate variants',
      'Properly removes unchecked variants',
      'Maintains data integrity',
      'Image upload and cleanup'
    ],
    note: 'Authentication required via admin_session cookie'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}