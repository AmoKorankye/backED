import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  try {
    if (code) {
      const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      
      const getRedirectUrl = (path: string) => {
        if (isLocalEnv) {
          return `${origin}${path}`;
        } else if (forwardedHost) {
          return `https://${forwardedHost}${path}`;
        } else {
          return `${origin}${path}`;
        }
      };

      // Get query params for flow type
      const type = searchParams.get("type"); // 'alumni' for signup via Google

      // If explicit next path is /feed, this is an alumni login/signup via Google
      if (next === "/feed") {
        // Check if this is a school user trying to use alumni app
        const { data: schoolUser } = await supabase
          .from("schools")
          .select("id")
          .eq("user_id", data.user.id)
          .single();

        if (schoolUser) {
          // School user trying to use alumni app - redirect to error
          return NextResponse.redirect(getRedirectUrl("/login?error=school_account"));
        }

        // Check if alumni profile exists
        const { data: alumniUser } = await supabase
          .from("alumni_users")
          .select("id, school_id, school_name")
          .eq("user_id", data.user.id)
          .single();

        if (alumniUser) {
          // Existing alumni user - check if profile is complete (has school)
          if (alumniUser.school_id || alumniUser.school_name) {
            return NextResponse.redirect(getRedirectUrl("/feed"));
          }
          // Profile incomplete - redirect to complete profile
          return NextResponse.redirect(getRedirectUrl("/complete-profile"));
        }

        // No alumni user found - this could be a new signup or a login attempt
        // Check if this is a newly created user (created within last 5 minutes)
        // This handles the case where Google OAuth doesn't preserve custom query params
        const userCreatedAt = new Date(data.user.created_at);
        const now = new Date();
        const timeDiffMinutes = (now.getTime() - userCreatedAt.getTime()) / (1000 * 60);
        const isNewUser = timeDiffMinutes < 5;

        if (!isNewUser) {
          // This is a login attempt but user doesn't exist - sign them out and redirect
          await supabase.auth.signOut();
          return NextResponse.redirect(getRedirectUrl("/login?error=no_account"));
        }

        // Create new alumni user profile from Google data (minimal - no school yet)
        const fullName = data.user.user_metadata?.full_name || 
                         data.user.user_metadata?.name || 
                         data.user.email?.split("@")[0] || 
                         "Alumni User";
        
        const { error: insertError } = await supabase
          .from("alumni_users")
          .insert({
            user_id: data.user.id,
            email: data.user.email!,
            full_name: fullName,
            profile_picture_url: data.user.user_metadata?.avatar_url || null,
            niches: [],
          });

        if (insertError) {
          console.error("Error creating alumni profile:", insertError);
          // Still redirect to complete profile
        }

        // New user via Google signup - redirect to complete profile to select school
        return NextResponse.redirect(getRedirectUrl("/complete-profile"));
      }

      // If next is /onboarding or /dashboard, this is a school login
      if (next === "/onboarding" || next === "/dashboard") {
        // Check if user is a school
        const { data: school } = await supabase
          .from("schools")
          .select("onboarding_completed")
          .eq("user_id", data.user.id)
          .single();

        if (school) {
          // School user - redirect based on onboarding status
          const redirectPath = school.onboarding_completed ? "/dashboard" : "/onboarding";
          return NextResponse.redirect(getRedirectUrl(redirectPath));
        }

        // Check if this is an alumni user trying to use school app
        const { data: alumniUser } = await supabase
          .from("alumni_users")
          .select("id")
          .eq("user_id", data.user.id)
          .single();

        if (alumniUser) {
          // Alumni user trying to use school app - redirect to error
          return NextResponse.redirect(getRedirectUrl("/auth?error=alumni_account"));
        }

        // New school user signing up via Google - check if recently created
        const userCreatedAt = new Date(data.user.created_at);
        const now = new Date();
        const timeDiffMinutes = (now.getTime() - userCreatedAt.getTime()) / (1000 * 60);
        const isNewUser = timeDiffMinutes < 5;

        if (!isNewUser) {
          // This is a login attempt but user doesn't have a school record
          await supabase.auth.signOut();
          return NextResponse.redirect(getRedirectUrl("/auth?error=no_account"));
        }

        // Create a new school record for this user
        const fullName = data.user.user_metadata?.full_name || 
                         data.user.user_metadata?.name || 
                         data.user.email?.split("@")[0] || 
                         "School Admin";

        const { error: insertError } = await supabase
          .from("schools")
          .insert({
            user_id: data.user.id,
            admin_email: data.user.email!,
            admin_name: fullName,
            school_name: "",
            location: "",
            population: "",
            staff_count: "",
            overview: "",
            onboarding_completed: false,
          });

        if (insertError) {
          console.error("Error creating school record:", insertError);
          return NextResponse.redirect(getRedirectUrl("/auth?error=signup_failed"));
        }

        // New school user - redirect to onboarding
        return NextResponse.redirect(getRedirectUrl("/onboarding"));
      }

      // Default fallback - check what type of user this is
      // Check school first so school users always go to dashboard, not feed
      const { data: school } = await supabase
        .from("schools")
        .select("onboarding_completed")
        .eq("user_id", data.user.id)
        .single();

      if (school) {
        // School user - redirect based on onboarding status
        const redirectPath = school.onboarding_completed ? "/dashboard" : "/onboarding";
        return NextResponse.redirect(getRedirectUrl(redirectPath));
      }

      const { data: alumniUser } = await supabase
        .from("alumni_users")
        .select("id, school_id, school_name")
        .eq("user_id", data.user.id)
        .single();

      if (alumniUser) {
        // Alumni user - check if profile is complete (has school)
        if (alumniUser.school_id || alumniUser.school_name) {
          return NextResponse.redirect(getRedirectUrl("/feed"));
        }
        // Profile incomplete - redirect to complete profile
        return NextResponse.redirect(getRedirectUrl("/complete-profile"));
      }

      // No profile found - redirect to landing page to choose
      return NextResponse.redirect(getRedirectUrl("/"));
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent("Could not authenticate user")}`);
  } catch (err) {
    console.error("Auth callback error:", err);
    return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent("An unexpected error occurred during authentication")}`);
  }
}
