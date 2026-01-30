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
  const { data: school } = await supabase
    .from("schools")
    .select("admin_name, school_name")
    .eq("user_id", user.id)
    .single();

  // Fetch donation history with project names
  const { data: donations } = await supabase
    .from("donation_history")
    .select("*, projects(title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <DonationsContent
      user={user}
      school={school}
      donations={donations || []}
    />
  );
}
