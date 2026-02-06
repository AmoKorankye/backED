import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "./dashboard-content";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?mode=signup");
  }

  // Check if onboarding is completed via user metadata
  let hasCompletedOnboarding = user.user_metadata?.onboarding_completed;
  
  // Also check if school exists in database with onboarding_completed flag
  if (!hasCompletedOnboarding) {
    const { data: school } = await supabase
      .from("schools")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .single();
    
    hasCompletedOnboarding = school?.onboarding_completed ?? false;
  }
  
  if (!hasCompletedOnboarding) {
    redirect("/onboarding");
  }

  return <DashboardContent user={user} />;
}
