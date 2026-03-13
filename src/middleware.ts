import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request);

  const { pathname, searchParams } = request.nextUrl;

  // Handle auth callback - allow it to proceed
  if (pathname.startsWith("/auth/callback")) {
    return supabaseResponse;
  }

  // Catch auth codes landing on wrong pages (e.g., Supabase redirecting to root)
  // and route them through the proper auth callback
  const code = searchParams.get("code");
  if (code && pathname !== "/api/auth/callback" && !pathname.startsWith("/api/")) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/api/auth/callback";
    // Preserve the code param; default next to reset-password if coming from root
    callbackUrl.searchParams.set("code", code);
    if (!callbackUrl.searchParams.has("next")) {
      callbackUrl.searchParams.set("next", pathname === "/" ? "/reset-password" : pathname);
    }
    return NextResponse.redirect(callbackUrl);
  }

  // Protect /dashboard/* and /team/* routes - redirect to login if not authenticated
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/team")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
