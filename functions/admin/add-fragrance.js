// Fixed add-fragrance endpoint - HANDLES BOTH JSON AND FORMDATA
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
    
    // FIXED: Parse fragrance data - handle both JSON and FormData
    let fragranceData;
    let imageFile = null;
    
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // FormData with image
      try {
        const formData = await request.formData();
        const dataString = formData.get('data');
        imageFile = formData.get('image');
        
        if (!dataString) {
          return new Response(JSON.stringify({ 
            error: 'No fragrance data provided in FormData' 
          }), {
            status: 400,
            headers: corsHeaders
          });
        }
        
        fragranceData = JSON.parse(dataString);
        console.log('Parsed FormData successfully');
      } catch (parseError) {
        console.error('FormData parse error:', parseError);
        return new Response(JSON.stringify({ 
          error: 'Invalid FormData format' 
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
    } else {
      // Regular JSON
      try {
        const text = await request.text();
        if (!text || text.trim() === '') {
          return new Response(JSON.stringify({ 
            error: 'No fragrance data provided' 
          }), {
            status: 400,
            headers: corsHeaders
          });
        }
        fragranceData = JSON.parse(text);
        console.log('Parsed JSON successfully');
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return new Response(JSON.stringify({ 
          error: 'Invalid JSON format' 
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
    }
    
    console.log('Received fragrance data:', fragranceData);
    
    // Validate required fields
    const { name, slug, description, variants, brand, hidden } = fragranceData;
    
    if (!name || !slug || !description || !variants || !Array.isArray(variants)) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: name, slug, description, variants',
        received: {
          name: !!name,
          slug: !!slug,
          description: !!description,
          variants: Array.isArray(variants) ? `${variants.length} variants` : 'invalid',
          actualData: fragranceData
        }
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // FIXED: Validate variants with correct format
    const validVariants = variants.filter(v => {
      console.log('Validating variant:', v);
      if (v.is_whole_bottle) {
        return true; // Whole bottle is always valid
      }
      // Check if variant has size_ml and price
      return v.size_ml && typeof v.size_ml === 'number' && v.size_ml > 0 &&
             v.price && typeof v.price === 'number' && v.price > 0;
    });
    
    console.log('Valid variants:', validVariants.length, 'of', variants.length);
    
    if (validVariants.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'At least one valid variant is required',
        receivedVariants: variants,
        validationNote: 'Variants need size_ml (number) and price (number) for regular sizes, or is_whole_bottle: true'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Handle image upload if present
    let imagePath = null;
    if (imageFile) {
      console.log('Uploading image:', imageFile.name, imageFile.type);
      
      // Validate image
      if (!imageFile.type.includes('png')) {
        return new Response(JSON.stringify({
          error: 'Only PNG images are allowed',
          received: imageFile.type
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      
      if (imageFile.size > 5 * 1024 * 1024) {
        return new Response(JSON.stringify({
          error: 'Image too large. Maximum size is 5MB.',
          received: `${(imageFile.size / 1024 / 1024).toFixed(2)}MB`
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      
      // Generate filename
      const filename = `${slug.toLowerCase().replace(/\s+/g, '-')}.png`;
      const imageBuffer = await imageFile.arrayBuffer();
      
      // Upload to Supabase Storage
      const uploadResponse = await fetch(
        `${SUPABASE_URL}/storage/v1/object/fragrance-images/${filename}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'image/png',
            'Content-Length': imageBuffer.byteLength.toString()
          },
          body: imageBuffer
        }
      );
      
      if (uploadResponse.ok) {
        imagePath = filename;
        console.log('Image uploaded successfully:', imagePath);
      } else {
        console.warn('Image upload failed, continuing without image');
      }
    }

    console.log('Creating fragrance with variants:', validVariants.length);

    // Create fragrance
    const fragrancePayload = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: description.trim(),
      image_path: imagePath,
      brand: brand?.trim() || null,
      hidden: hidden || false,
      created_at: new Date().toISOString()
    };

    console.log('Creating fragrance with payload:', fragrancePayload);

    const fragranceResponse = await fetch(`${SUPABASE_URL}/rest/v1/fragrances`, {
      method: 'POST',
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
      console.error('Failed to create fragrance:', errorText);
      
      if (errorText.includes('unique') || errorText.includes('duplicate')) {
        return new Response(JSON.stringify({
          error: 'A fragrance with this slug already exists. Please use a different name/slug.',
          details: 'Duplicate slug error'
        }), {
          status: 409,
          headers: corsHeaders
        });
      }
      
      return new Response(JSON.stringify({
        error: 'Failed to save fragrance to database',
        details: errorText
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const createdFragrance = await fragranceResponse.json();
    const fragranceId = createdFragrance[0].id;
    console.log('Created fragrance with ID:', fragranceId);

    // Create variants
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

    console.log('Creating variants:', variantsPayload);

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
      console.error('Failed to create variants:', errorText);
      
      return new Response(JSON.stringify({
        error: 'Fragrance created but variants failed to save',
        details: errorText,
        fragranceId: fragranceId,
        partialSuccess: true
      }), {
        status: 207,
        headers: corsHeaders
      });
    }

    const createdVariants = await variantsResponse.json();
    console.log('Created variants:', createdVariants.length);

    // Success response
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Fragrance added successfully!',
      data: {
        id: fragranceId,
        name: createdFragrance[0].name,
        slug: createdFragrance[0].slug,
        brand: createdFragrance[0].brand,
        image_path: createdFragrance[0].image_path,
        created_at: createdFragrance[0].created_at,
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
    method: 'POST /admin/add-fragrance to add a fragrance',
    accepts: ['application/json', 'multipart/form-data'],
    requiredFields: ['name', 'slug', 'description', 'variants'],
    optionalFields: ['brand', 'image', 'hidden'],
    variantFormat: {
      regular: { size_ml: 'number (e.g., 5)', price: 'number (e.g., 0.025)' },
      wholeBottle: { is_whole_bottle: true }
    },
    improvements: [
      'Handles both JSON and FormData requests',
      'Proper variant validation with size_ml and price',
      'Image upload support with validation',
      'Better error messages'
    ],
    supabaseConfig: {
      hasUrl: !!context.env.SUPABASE_URL,
      hasServiceKey: !!context.env.SUPABASE_SERVICE_ROLE_KEY
    },
    note: 'Authentication required via admin_session cookie'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}