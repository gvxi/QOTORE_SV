// functions/_middleware.js - Fixed authentication middleware
export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  console.log('Middleware checking path:', url.pathname);
  
  // NEVER interfere with function endpoints and specific paths
  if (url.pathname.startsWith('/loginf') || 
      url.pathname.startsWith('/logout') ||
      url.pathname.startsWith('/hello') ||
      url.pathname.startsWith('/test') ||
      url.pathname.startsWith('/api/') ||
      url.pathname === '/login.html' ||
      url.pathname === '/reject.html' ||
      url.pathname === '/index.html' ||
      url.pathname === '/' ||
      url.pathname.startsWith('/images/') ||
      url.pathname.startsWith('/css/') ||
      url.pathname.startsWith('/js/')) {
    console.log('Allowing unprotected path:', url.pathname);
    return next();
  }
  
  // Specifically protect admin HTML pages and admin directories
  const isAdminPage = (
    url.pathname.startsWith('/admin/') && 
    (url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname === '/admin')
  ) || url.pathname === '/admin/index.html';
  
  const isAdminAPI = url.pathname.startsWith('/admin/api/');
  
  if (isAdminPage || isAdminAPI) {
    console.log('Checking auth for admin resource:', url.pathname);
    
    // Check for session cookie
    const cookies = request.headers.get('Cookie') || '';
    console.log('Cookies received:', cookies);
    
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('admin_session='));
    
    console.log('Session cookie found:', !!sessionCookie);
    
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
      const loginUrl = new URL('/login.html', request.url).toString();
      console.log('Redirecting to:', loginUrl);
      return Response.redirect(loginUrl, 302);
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
      
      const rejectUrl = new URL('/reject.html', request.url).toString();
      return Response.redirect(rejectUrl, 302);
    }
    
    console.log('Valid session found, allowing access to:', url.pathname);
  }
  
  // Continue to next middleware/handler for all other routes
  return next();
}