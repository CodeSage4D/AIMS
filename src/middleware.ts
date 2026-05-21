import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login");

  // 1. If accessing the login page and already logged in, redirect to dashboard
  if (isAuthPage) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/", req.nextUrl));
    }
    return;
  }

  // 2. If not logged in and trying to access protected paths, redirect to login
  if (!isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  matcher: [
    /*
     * Protect all standard pages (dashboard, attendance, tasks, profiles)
     * while explicitly exempting NextAuth API callbacks, static files, images, and public assets.
     */
    "/((?!api|_next/static|_next/image|assets|favicon.ico).*)",
  ],
};
