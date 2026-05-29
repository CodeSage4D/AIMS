import { auth } from "@/lib/auth";

export async function proxy(req: any) {
  const authMiddleware = auth((authReq: any) => {
    const { nextUrl } = authReq;
    const isLoggedIn = !!authReq.auth;

    // 1. Check if it's an API route
    const isApi = nextUrl.pathname.startsWith("/api");

    // Public API exclusions:
    // - /api/auth/*
    // - /api/verify/*
    // - /api/location/*
    // - /api/health
    const isPublicApi =
      nextUrl.pathname.startsWith("/api/auth") ||
      nextUrl.pathname.startsWith("/api/verify") ||
      nextUrl.pathname.startsWith("/api/location") ||
      nextUrl.pathname.startsWith("/api/health");

    if (isApi) {
      if (!isPublicApi && !isLoggedIn) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // CSRF Protection for state-changing API requests (POST, PUT, DELETE, PATCH)
      if (["POST", "PUT", "DELETE", "PATCH"].includes(authReq.method)) {
        const origin = authReq.headers.get("origin");
        const host = authReq.headers.get("host") || nextUrl.host;
        
        if (origin) {
          try {
            const originUrl = new URL(origin);
            const hostPart = host.split(":")[0];
            const originHostPart = originUrl.hostname;
            if (originHostPart !== hostPart && originHostPart !== "localhost" && originHostPart !== "127.0.0.1") {
              return new Response(
                JSON.stringify({ error: "CSRF verification failed: Origin mismatch." }),
                { status: 403, headers: { "Content-Type": "application/json" } }
              );
            }
          } catch (e) {
            return new Response(
              JSON.stringify({ error: "CSRF verification failed: Invalid origin." }),
              { status: 403, headers: { "Content-Type": "application/json" } }
            );
          }
        }
      }
      return;
    }

    // 2. Page route protection
    const isAuthPage =
      nextUrl.pathname.startsWith("/login") ||
      nextUrl.pathname.startsWith("/signup") ||
      nextUrl.pathname.startsWith("/recovery");

    const isVerifyPage = nextUrl.pathname.startsWith("/verify");

    if (isVerifyPage) {
      return;
    }

    if (isAuthPage) {
      if (isLoggedIn) {
        return Response.redirect(new URL("/", authReq.nextUrl));
      }
      return;
    }

    if (!isLoggedIn) {
      return Response.redirect(new URL("/login", authReq.nextUrl));
    }
  });

  return authMiddleware(req, {} as any);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - assets (image assets)
     * - Logo-AIMS (logo folder)
     * - favicon.ico (favicon file)
     * - manifest.json (web manifest)
     */
    "/((?!_next/static|_next/image|assets|favicon.ico|Logo-AIMS|manifest.json).*)",
  ],
};
