import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationsContent } from "./notifications-content";

export default async function NotificationsPage() {
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

  // Fetch notifications
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <NotificationsContent
      user={user}
      school={school}
      notifications={notifications || []}
    />
  );
}
