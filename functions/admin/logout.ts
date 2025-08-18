// functions/logout.ts - Handle logout
export async function onRequestPost(context: EventContext<any, any, any>): Promise<Response> {
  return new Response(JSON.stringify({ 
    success: true,
    message: "Logged out successfully" 
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'admin_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
    }
  });
}
