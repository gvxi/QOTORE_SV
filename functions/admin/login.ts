import type { PagesFunction } from "@cloudflare/workers-types";

export const onRequestPost: PagesFunction = async ({ request }) => {
  try {
    // Force the expected shape of the JSON body
    const { username, password } = (await request.json()) as {
      username: string;
      password: string;
    };

    if (!username || !password) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Example: check against static admin (replace with Supabase later)
    if (username === "admin" && password === "1234") {
      const response = new Response(
        JSON.stringify({ message: "Login successful" }),
        { headers: { "Content-Type": "application/json" } }
      );

      // Set cookie (valid for 1 hour)
      response.headers.append(
        "Set-Cookie",
        "admin_session=valid; HttpOnly; Path=/; Max-Age=3600"
      );

      return response;
    }

    return new Response(JSON.stringify({ error: "Invalid credentials" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
