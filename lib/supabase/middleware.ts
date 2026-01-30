import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Always refresh the auth token first
  // This keeps the session alive and prevents random logouts
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Define protected routes for school dashboard
  const schoolProtectedRoutes = ["/dashboard", "/onboarding"];
  // Define protected routes for alumni - these require authentication
  const alumniProtectedRoutes = ["/profile", "/donations", "/saved", "/notifications", "/followed-schools", "/complete-profile"];
  // Auth routes
  const schoolAuthRoutes = ["/auth"];
  const alumniAuthRoutes = ["/login", "/signup"];

  const isSchoolProtectedRoute = schoolProtectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAlumniProtectedRoute = alumniProtectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isSchoolAuthRoute = schoolAuthRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAlumniAuthRoute = alumniAuthRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Redirect unauthenticated users to appropriate auth page
  if (!user && isSchoolProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  if (!user && isAlumniProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // For authenticated users on auth pages, check their user type and redirect
  if (user && isSchoolAuthRoute) {
    // Only check if they're a school user
    const { data: school } = await supabase
      .from("schools")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .single();
    
    if (school) {
      const url = request.nextUrl.clone();
      url.pathname = school.onboarding_completed ? "/dashboard" : "/onboarding";
      return NextResponse.redirect(url);
    }
    // If not a school user, let them access the auth page (they might want to create a school account)
  }

  if (user && isAlumniAuthRoute) {
    // Only check if they're an alumni user with a complete profile
    const { data: alumniUser } = await supabase
      .from("alumni_users")
      .select("id, school_id, school_name")
      .eq("user_id", user.id)
      .single();
    
    if (alumniUser) {
      // Check if profile is complete (has school)
      if (alumniUser.school_id || alumniUser.school_name) {
        // Fully registered alumni - redirect to feed
        const url = request.nextUrl.clone();
        url.pathname = "/feed";
        return NextResponse.redirect(url);
      } else {
        // Alumni exists but profile incomplete - redirect to complete profile
        const url = request.nextUrl.clone();
        url.pathname = "/complete-profile";
        return NextResponse.redirect(url);
      }
    }
    // If not an alumni user, let them access signup to complete their profile
  }

  // CRITICAL: Return the supabaseResponse to ensure cookies are properly set
  // This maintains the session across page navigations
  return supabaseResponse;
}
