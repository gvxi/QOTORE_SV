// functions/_middleware.js
export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  console.log('Middleware checking path:', url.pathname);
  
  // NEVER interfere with /functions/* routes - let them handle themselves
  if (url.pathname.startsWith('/functions/')) {
    console.log('Allowing function route:', url.pathname);
    return next();
  }
  
  // Only protect /admin/* HTML pages (not the login page itself)
  if (url.pathname.startsWith('/admin/') && 
      url.pathname !== '/admin/login.html' &&
      !url.pathname.startsWith('/admin/api/')) {
    
    console.log('Checking auth for admin page:', url.pathname);
    
    // Check for session cookie
    const cookies = request.headers.get('Cookie') || '';
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('admin_session='));
    
    if (!sessionCookie) {
      console.log('No session cookie found, redirecting to login');
      return Response.redirect(new URL('/login.html', request.url).toString(), 302);
    }
    
    const sessionToken = sessionCookie.split('=')[1];
    if (!sessionToken || sessionToken.trim() === '') {
      console.log('Invalid session token, redirecting to reject');
      return Response.redirect(new URL('/reject.html', request.url).toString(), 302);
    }
    
    console.log('Valid session found, allowing access to:', url.pathname);
  }
  
  // Continue to next middleware/handler for all other routes
  return next();
}