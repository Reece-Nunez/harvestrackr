import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Handle OAuth/email errors
  if (error) {
    console.error("Auth callback error:", error, errorDescription);
    const errorUrl = new URL("/login", requestUrl.origin);
    errorUrl.searchParams.set("error", errorDescription || error);
    return NextResponse.redirect(errorUrl);
  }

  // Exchange code for session
  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Code exchange error:", exchangeError);
      const errorUrl = new URL("/login", requestUrl.origin);
      errorUrl.searchParams.set("error", "Failed to verify your account. Please try again.");
      return NextResponse.redirect(errorUrl);
    }

    // Successful authentication - redirect to the intended destination
    const redirectUrl = new URL(next, requestUrl.origin);
    return NextResponse.redirect(redirectUrl);
  }

  // No code provided - redirect to login
  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("error", "Invalid authentication callback.");
  return NextResponse.redirect(loginUrl);
}
