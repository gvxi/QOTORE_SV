// functions/_middleware.js
export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  console.log('Middleware checking path:', url.pathname);
  
  // Only protect admin HTML pages (not API endpoints or login)
  if (url.pathname.startsWith('/admin/') && 
      url.pathname.endsWith('.html') && 
      !url.pathname.includes('login')) {
    
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
    if (!sessionToken) {
      console.log('Empty session token, redirecting to reject');
      return Response.redirect(new URL('/reject.html', request.url).toString(), 302);
    }
    
    console.log('Valid session found, allowing access');
  }
  
  // Continue to next middleware/handler
  return next();
}