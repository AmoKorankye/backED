"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard-header";
import { ProfileEditModal } from "@/components/profile-edit-modal";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

interface SchoolData {
  id: string;
  admin_name: string;
  school_name: string;
  location: string;
  population: string;
  staff_count: string;
  overview: string;
  school_image_url: string | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    const fetchUserAndSchool = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth");
        return;
      }
      
      setUser(user);

      const { data: school } = await supabase
        .from("schools")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (school) {
        setSchoolData(school);
      }

      setLoading(false);
    };

    fetchUserAndSchool();
  }, [supabase, router]);

  const displayName = schoolData?.admin_name || user?.user_metadata?.full_name || user?.email || "User";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-12 md:px-24 lg:px-48 pt-8">
        <DashboardHeader
          userName={displayName}
          onOpenProfile={() => setShowProfileModal(true)}
        />
      </div>
      
      {children}

      {/* Profile Edit Modal */}
      {schoolData && user && (
        <ProfileEditModal
          open={showProfileModal}
          onOpenChange={setShowProfileModal}
          user={user}
          school={schoolData}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
