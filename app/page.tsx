import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { SchoolSelector } from "./school-selector";

export default async function Page() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get list of schools for the selector
  const { data: schools } = await supabase
    .from("schools")
    .select("id, school_name, location, logo_url")
    .eq("is_supported", true)
    .order("school_name");

  if (user) {
    // Check if alumni user
    const { data: alumniUser } = await supabase
      .from("alumni_users")
      .select("id, school_id")
      .eq("user_id", user.id)
      .single();

    if (alumniUser) {
      // If alumni has a school, go to feed
      if (alumniUser.school_id) {
        redirect("/feed");
      }
      // Otherwise show school selection below
    } else {
      // Check if school user
      const { data: schoolUser } = await supabase
        .from("schools")
        .select("id, onboarding_completed")
        .eq("user_id", user.id)
        .single();

      if (schoolUser) {
        if (schoolUser.onboarding_completed) {
          redirect("/dashboard");
        } else {
          redirect("/onboarding");
        }
      }
    }
  }

  // Show landing page with portal selection (and school selector for logged-in alumni without school)
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <Image
          src="/BackED Black.png"
          alt="BackED"
          width={120}
          height={40}
          className="dark:invert"
        />
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center max-w-2xl mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Connecting Alumni with School Projects
          </h1>
          <p className="text-lg text-muted-foreground">
            Help your alma mater thrive by funding meaningful projects, or showcase your school&apos;s needs to a supportive alumni network.
          </p>
        </div>

        {/* School Selector for logged-in alumni without school */}
        {user && (
          <SchoolSelector schools={schools || []} userId={user.id} />
        )}

        {/* Portal Selection - only show if not logged in */}
        {!user && (
          <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl">
            {/* Alumni Portal */}
            <Link
              href="/login"
              className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-8 transition-all hover:border-primary hover:shadow-lg"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2">Alumni</h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Discover and fund projects from your school. Make a lasting impact on future generations.
                </p>
                <span className="text-primary font-medium text-sm group-hover:underline">
                  Enter Alumni App →
                </span>
              </div>
            </Link>

            {/* School Portal */}
            <Link
              href="/auth"
              className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-8 transition-all hover:border-primary hover:shadow-lg"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="h-14 w-14 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7 text-amber-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2">Schools</h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Create and manage projects, connect with alumni, and track funding progress.
                </p>
                <span className="text-amber-600 font-medium text-sm group-hover:underline">
                  Enter School Portal →
                </span>
              </div>
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} BackED. Empowering education through community.
      </footer>
    </div>
  );
}