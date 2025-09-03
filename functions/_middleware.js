// functions/_middleware.js - FIXED to allow admin function endpoints
export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  console.log('Middleware checking path:', url.pathname);
  
  // NEVER interfere with function endpoints
  if (url.pathname.startsWith('/loginf') || 
      url.pathname.startsWith('/logout') ||
      url.pathname.startsWith('/hello') ||
      url.pathname.startsWith('/test') ||
      url.pathname.startsWith('/api/')) {
    console.log('Allowing function endpoint:', url.pathname);
    return next();
  }
  
  // FIXED: Allow admin function endpoints (they need to handle their own auth)
  const adminFunctionPaths = [
    '/admin/orders',
    '/admin/fragrances', 
    '/admin/add-fragrance',
    '/admin/update-fragrance',
    '/admin/delete-fragrance',
    '/admin/toggle-fragrance',
    '/admin/add-order',
    '/admin/update-order-status',
    '/admin/delete-order',
    '/admin/toggle-order',
    '/admin/toggle-order-review',
    '/admin/mark-order-reviewed',
    '/admin/upload-image',
    '/admin/delete-image'
  ];
  
  const isAdminFunction = adminFunctionPaths.some(path => url.pathname === path || url.pathname.startsWith(path + '/'));
  
  if (isAdminFunction) {
    console.log('Allowing admin function endpoint:', url.pathname);
    return next();
  }
  
  // Only protect admin HTML pages and admin API endpoints (not function endpoints)
  const isAdminPage = url.pathname.startsWith('/admin/') && 
                     (url.pathname.endsWith('.html') || url.pathname.endsWith('/'));
  const isAdminAPI = url.pathname.startsWith('/admin/api/'); // Keep this for any future API routes
  
  if (isAdminPage || isAdminAPI) {
    console.log('Checking auth for admin resource:', url.pathname);
    
    // Check for session cookie
    const cookies = request.headers.get('Cookie') || '';
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('admin_session='));
    
    if (!sessionCookie) {
      console.log('No session cookie found, redirecting to login');
      
      // For API requests, return JSON error instead of redirect
      if (isAdminAPI) {
        return new Response(JSON.stringify({ 
          error: 'Authentication required',
          redirectUrl: '/login.html'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // For HTML pages, redirect to login
      return Response.redirect(new URL('/login.html', request.url).toString(), 302);
    }
    
    const sessionToken = sessionCookie.split('=')[1];
    if (!sessionToken || sessionToken.trim() === '') {
      console.log('Invalid session token, redirecting to reject');
      
      if (isAdminAPI) {
        return new Response(JSON.stringify({ 
          error: 'Invalid session',
          redirectUrl: '/reject.html'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return Response.redirect(new URL('/reject.html', request.url).toString(), 302);
    }
    
    console.log('Valid session found, allowing access to:', url.pathname);
  }
  
  // Continue to next middleware/handler for all other routes
  return next();
}