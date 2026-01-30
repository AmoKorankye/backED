import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileContent } from "./profile-content";

export default async function ProfilePage() {
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
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!school) {
    redirect("/onboarding");
  }

  return <ProfileContent user={user} school={school} />;
}
