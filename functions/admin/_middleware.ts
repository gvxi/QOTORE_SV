import type { PagesFunction } from "@cloudflare/workers-types";

export const onRequest: PagesFunction = async ({ request, next }) => {
  const cookie = request.headers.get("Cookie") || "";

  if (!cookie.includes("admin_session=valid")) {
    // Not logged in → redirect to login page
    return Response.redirect("/login.html", 302);
  }

  // Logged in → continue to requested page
  return next();
};
