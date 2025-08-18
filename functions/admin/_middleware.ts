// functions/_middleware.ts - Protects admin routes
export async function onRequest(context: EventContext<any, any, any>): Promise<Response | void> {
  const request = context.request;
  const url = new URL(request.url);
  
  // Only protect admin paths (except login)
  if (url.pathname.startsWith('/admin') && !url.pathname.includes('/login')) {
    const cookies = request.headers.get('Cookie') || '';
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('admin_session='));
    
    if (!sessionCookie) {
      // Redirect to login if no session
      return Response.redirect(new URL('/login.html', request.url).toString(), 302);
    }
    
    // In a real app, you'd validate the session token here
    // For now, just check if it exists
    const sessionToken = sessionCookie.split('=')[1];
    if (!sessionToken) {
      return Response.redirect(new URL('/reject.html', request.url).toString(), 302);
    }
  }
  
  // Continue to next middleware/handler
  return context.next();
}
