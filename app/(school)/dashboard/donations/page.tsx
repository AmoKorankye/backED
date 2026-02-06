import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DonationsContent } from "./donations-content";

export default async function DonationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Fetch school data
  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("id, admin_name, school_name")
    .eq("user_id", user.id)
    .single();

  if (schoolError || !school) {
    console.error("School fetch error:", schoolError);
    return (
      <DonationsContent
        user={user}
        school={null}
        donations={[]}
      />
    );
  }

  // Fetch donations received by this school from alumni_donations
  const { data: donations, error: donationsError } = await supabase
    .from("alumni_donations")
    .select(`
      id,
      amount,
      message,
      created_at,
      is_anonymous,
      alumni_users(full_name, email),
      projects(title)
    `)
    .eq("school_id", school.id)
    .in("status", ["completed", "completed_demo"])
    .order("created_at", { ascending: false });

  if (donationsError) {
    console.error("Donations fetch error:", donationsError);
  }

  return (
    <DonationsContent
      user={user}
      school={school}
      donations={donations || []}
    />
  );
}
