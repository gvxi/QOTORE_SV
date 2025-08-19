// functions/admin/add-fragrance.js - Complete admin function for adding fragrances
export async function onRequestPost(context) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('Add fragrance request received');
    
    // Double-check authentication (middleware should handle this, but be safe)
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
    const { name, slug, description, image, variants } = fragranceData;
    
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
    const validVariants = variants.filter(v => v.size && v.price && !isNaN(v.price));
    if (validVariants.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'At least one valid variant (size and price) is required' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Create the complete fragrance object
    const completeFragrance = {
      id: Date.now().toString(), // Simple ID generation
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: description.trim(),
      image: image ? image.trim() : '',
      variants: validVariants.map(v => ({
        size: v.size.trim(),
        price: parseFloat(v.price)
      })),
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    
    // Here you would typically save to your database
    // For now, just log and return success
    console.log('Fragrance to be added:', completeFragrance);
    
    // TODO: Save to database (Supabase, D1, KV, etc.)
    // Example: await context.env.DB.prepare("INSERT INTO fragrances...").bind(...).run()
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Fragrance added successfully!',
      data: {
        id: completeFragrance.id,
        name: completeFragrance.name,
        slug: completeFragrance.slug,
        variantCount: completeFragrance.variants.length
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
export function onRequestOptions() {
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

// Test GET endpoint
export function onRequestGet(context) {
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
    variantFormat: { size: 'string', price: 'number' },
    note: 'Authentication required via admin_session cookie'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}