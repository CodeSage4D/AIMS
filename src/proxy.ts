import { auth } from "@/lib/auth";

export async function proxy(req: any) {
  const authMiddleware = auth((authReq: any) => {
    const isLoggedIn = !!authReq.auth;
    const isAuthPage =
      authReq.nextUrl.pathname.startsWith("/login") ||
      authReq.nextUrl.pathname.startsWith("/signup") ||
      authReq.nextUrl.pathname.startsWith("/recovery");

    const isVerifyPage = authReq.nextUrl.pathname.startsWith("/verify");

    // 0. Public certificate verification page is accessible without authentication
    if (isVerifyPage) {
      return;
    }

    // 1. If accessing the login page and already logged in, redirect to dashboard
    if (isAuthPage) {
      if (isLoggedIn) {
        return Response.redirect(new URL("/", authReq.nextUrl));
      }
      return;
    }

    // 2. If not logged in and trying to access protected paths, redirect to login
    if (!isLoggedIn) {
      return Response.redirect(new URL("/login", authReq.nextUrl));
    }
  });

  return authMiddleware(req, {} as any);
}

export const config = {
  matcher: [
    /*
     * Protect all standard pages (dashboard, attendance, tasks, profiles)
     * while explicitly exempting NextAuth API callbacks, static files, images, and public assets.
     */
    "/((?!api|_next/static|_next/image|assets|favicon.ico).*)",
  ],
};
