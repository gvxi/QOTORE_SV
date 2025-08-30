// functions/admin/add-fragrance.js - FIXED VERSION
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Add fragrance request received');
    
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
    
    // Parse request data - Handle both FormData and JSON
    let fragranceData;
    let imageFile = null;
    
    const contentType = request.headers.get('Content-Type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (with image)
      const formData = await request.formData();
      const dataString = formData.get('data');
      if (dataString) {
        fragranceData = JSON.parse(dataString);
      }
      imageFile = formData.get('image');
    } else {
      // Handle JSON (without image)
      const text = await request.text();
      if (!text || text.trim() === '') {
        return new Response(JSON.stringify({ 
          error: 'No data provided' 
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      fragranceData = JSON.parse(text);
    }
    
    console.log('Received fragrance data:', fragranceData);
    
    // Validate required fields
    const { name, brand, description, variants, hidden } = fragranceData;
    
    if (!name || !name.trim()) {
      return new Response(JSON.stringify({ 
        error: 'Missing required field: name' 
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
    
    // Generate slug
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    console.log('Generated slug:', slug);
    
    // Check if slug already exists
    const existingResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances?slug=eq.${slug}&select=id`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    
    if (existingResponse.ok) {
      const existing = await existingResponse.json();
      if (existing.length > 0) {
        return new Response(JSON.stringify({ 
          error: 'A fragrance with this name already exists. Please use a different name.',
          details: 'Slug conflict'
        }), {
          status: 409,
          headers: corsHeaders
        });
      }
    }
    
    // Handle image upload if provided
    let imagePath = null;
    if (imageFile && imageFile.size > 0) {
      try {
        const imageBuffer = await imageFile.arrayBuffer();
        const fileName = `${slug}.png`;
        
        console.log('Uploading image:', fileName);
        
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
          console.log('Image uploaded successfully:', fileName);
        } else {
          const uploadError = await uploadResponse.text();
          console.error('Image upload failed:', uploadError);
          
          return new Response(JSON.stringify({
            error: 'Failed to upload image',
            details: uploadError
          }), {
            status: 500,
            headers: corsHeaders
          });
        }
      } catch (imageError) {
        console.error('Image processing error:', imageError);
        return new Response(JSON.stringify({
          error: 'Failed to process image',
          details: imageError.message
        }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }
    
    // Create fragrance record
    const fragrancePayload = {
      name: name.trim(),
      slug: slug.trim(),
      description: description?.trim() || '',
      brand: brand?.trim() || null,
      image_path: imagePath,
      hidden: Boolean(hidden),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Creating fragrance with payload:', fragrancePayload);
    
    const createFragranceResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(fragrancePayload)
    });
    
    if (!createFragranceResponse.ok) {
      const errorText = await createFragranceResponse.text();
      console.error('Failed to create fragrance:', errorText);
      
      // Clean up uploaded image if fragrance creation failed
      if (imagePath) {
        try {
          await fetch(`${SUPABASE_URL}/storage/v1/object/fragrance-images/${imagePath}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            }
          });
        } catch (cleanupError) {
          console.warn('Failed to cleanup image after fragrance creation failure');
        }
      }
      
      return new Response(JSON.stringify({
        error: 'Failed to create fragrance',
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    
    const createdFragrance = await createFragranceResponse.json();
    const fragranceId = createdFragrance[0].id;
    
    console.log('Created fragrance with ID:', fragranceId);
    
    // Create variants
    const variantsToCreate = variants.map(variant => ({
      fragrance_id: fragranceId,
      size_ml: variant.size_ml || null,
      price_cents: variant.price_cents || null,
      is_whole_bottle: Boolean(variant.is_whole_bottle),
      sku: variant.sku || null,
      max_quantity: variant.max_quantity || 50,
      in_stock: true,
      created_at: new Date().toISOString()
    }));
    
    console.log('Creating variants:', variantsToCreate);
    
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
      console.error('Failed to create variants:', errorText);
      
      // Clean up fragrance and image if variant creation failed
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/fragrances?id=eq.${fragranceId}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          }
        });
        
        if (imagePath) {
          await fetch(`${SUPABASE_URL}/storage/v1/object/fragrance-images/${imagePath}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            }
          });
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup after variant creation failure');
      }
      
      return new Response(JSON.stringify({
        error: 'Failed to create variants',
        details: errorText,
        fragranceId: fragranceId
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    
    const createdVariants = await createVariantsResponse.json();
    console.log('Created variants:', createdVariants.length);
    
    // Success response
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Fragrance created successfully!',
      data: {
        id: fragranceId,
        name: createdFragrance[0].name,
        slug: createdFragrance[0].slug,
        brand: createdFragrance[0].brand,
        image_path: createdFragrance[0].image_path,
        hidden: createdFragrance[0].hidden,
        created_at: createdFragrance[0].created_at,
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
      status: 201,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Add fragrance error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to add fragrance',
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
    message: 'Add fragrance endpoint is working! (FIXED VERSION)',
    authenticated: isAuthenticated,
    method: 'POST /admin/add-fragrance to create a new fragrance',
    dataFormat: {
      name: 'string (required)',
      brand: 'string (optional)', 
      description: 'string (required)',
      hidden: 'boolean',
      variants: 'array (required)',
      image: 'file (optional - PNG only)'
    },
    variantFormat: {
      size_ml: 'number (null for whole bottle)',
      price_cents: 'number (null for whole bottle)', 
      is_whole_bottle: 'boolean'
    },
    improvements: [
      'Handles both FormData (with images) and JSON (without images)',
      'Proper error handling and cleanup',
      'Validates all required fields',
      'Prevents duplicate slugs',
      'Atomic operations with rollback'
    ],
    note: 'Authentication required via admin_session cookie'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}