// functions/admin/add-fragrance.js - Save fragrances to Supabase
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Add fragrance request received');
    
    // Check authentication (middleware should handle this, but double-check)
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
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for admin operations
    
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
    
    // Parse fragrance data
    let fragranceData;
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
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid fragrance data format' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Validate required fields
    const { name, slug, description, image, variants, brand } = fragranceData;
    
    if (!name || !slug || !description || !variants || !Array.isArray(variants)) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: name, slug, description, variants',
        received: {
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

    console.log('Saving fragrance to Supabase:', { name, slug, variantCount: validVariants.length });

    // Step 1: Handle brand (if provided)
    let brandId = null;
    if (brand && brand.trim()) {
      console.log('Looking for brand:', brand);
      
      // Check if brand exists
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
          console.log('Found existing brand ID:', brandId);
        } else {
          // Create new brand
          console.log('Creating new brand:', brand);
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
            console.log('Created new brand ID:', brandId);
          } else {
            console.error('Failed to create brand:', await createBrandResponse.text());
          }
        }
      }
    }

    // Step 2: Create fragrance
    const fragrancePayload = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: description.trim(),
      image_path: image?.trim() || null, // This will be the full path like "fragrance-images/slug.png"
      brand_id: brandId,
      created_at: new Date().toISOString() // Add timestamp
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
      
      // Check if it's a duplicate slug error
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

    // Step 3: Create variants
    const variantsPayload = validVariants.map(variant => {
      if (variant.is_whole_bottle) {
        return {
          fragrance_id: fragranceId,
          size_ml: null, // Whole bottle has no specific ml size
          price_cents: null, // No price for whole bottle
          sku: variant.sku || null,
          is_whole_bottle: true
        };
      } else {
        const priceInCents = Math.round(parseFloat(variant.price) * 1000); // Convert OMR to fils (1 OMR = 1000 fils)
        
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
      
      // Fragrance was created but variants failed - this is a partial success
      return new Response(JSON.stringify({
        error: 'Fragrance created but variants failed to save',
        details: errorText,
        fragranceId: fragranceId,
        partialSuccess: true
      }), {
        status: 207, // Multi-status
        headers: corsHeaders
      });
    }

    const createdVariants = await variantsResponse.json();
    console.log('Created variants:', createdVariants.length);

    // Step 4: Initialize stock (optional)
    if (createdVariants.length > 0) {
      const stockPayload = createdVariants.map(variant => ({
        variant_id: variant.id,
        quantity: 0 // Default stock
      }));

      const stockResponse = await fetch(`${SUPABASE_URL}/rest/v1/stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify(stockPayload)
      });

      if (!stockResponse.ok) {
        console.log('Stock initialization failed (non-critical):', await stockResponse.text());
      } else {
        console.log('Stock initialized for variants');
      }
    }

    // Success response
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Fragrance added successfully to database!',
      data: {
        id: fragranceId,
        name: createdFragrance[0].name,
        slug: createdFragrance[0].slug,
        brand: brand || null,
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
  // Check if authenticated
  const cookies = context.request.headers.get('Cookie') || '';
  const sessionCookie = cookies
    .split(';')
    .find(c => c.trim().startsWith('admin_session='));
  
  const isAuthenticated = !!sessionCookie;
  
  return new Response(JSON.stringify({
    message: 'Add fragrance endpoint is working!',
    authenticated: isAuthenticated,
    method: 'POST /admin/add-fragrance to add a fragrance',
    requiredFields: ['name', 'slug', 'description', 'variants'],
    optionalFields: ['brand', 'image'],
    variantFormat: { size: 'string (e.g., "50ml")', price: 'number' },
    supabaseConfig: {
      hasUrl: !!context.env.SUPABASE_URL,
      hasServiceKey: !!context.env.SUPABASE_SERVICE_ROLE_KEY
    },
    note: 'Authentication required via admin_session cookie'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}