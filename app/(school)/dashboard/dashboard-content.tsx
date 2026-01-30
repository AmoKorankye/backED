"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProjectsFeed } from "@/components/projects-feed";
import { NotificationsCard } from "@/components/notifications-card";
import { DonationHistoryCard } from "@/components/donation-history-card";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { CreateChallengeDialog } from "@/components/create-challenge-dialog";
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
  challenges: { id: string; challenge_text: string }[];
}

interface Project {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  type: "project" | "challenge";
  challenge_id: string | null;
  created_at: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

interface Donation {
  id: string;
  amount: number;
  donor_name: string | null;
  donor_email: string | null;
  message: string | null;
  created_at: string;
  status?: "completed" | "pending" | "failed";
  project?: { title: string } | null;
}

interface DashboardContentProps {
  user: User;
}

export function DashboardContent({ user }: DashboardContentProps) {
  const router = useRouter();
  const supabase = createClient();
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showChallengeDialog, setShowChallengeDialog] = useState(false);

  const fetchData = useCallback(async () => {
    // Fetch school data with challenges
    const { data: school } = await supabase
      .from("schools")
      .select("*, challenges(*)")
      .eq("user_id", user.id)
      .single();

    if (school) {
      setSchoolData(school);
    }

    // Fetch projects
    const { data: projectsData } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (projectsData) {
      // Fetch donation totals for each project
      const projectsWithDonations = await Promise.all(
        projectsData.map(async (project) => {
          const { data: donations } = await supabase
            .from("donation_history")
            .select("amount")
            .eq("project_id", project.id);

          const total_raised = donations
            ? donations.reduce((sum, d) => sum + Number(d.amount), 0)
            : 0;

          return {
            ...project,
            total_raised,
          };
        })
      );

      setProjects(projectsWithDonations);
    }

    // Fetch notifications
    const { data: notificationsData } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (notificationsData) {
      setNotifications(notificationsData);
    }

    // Fetch donations
    const { data: donationsData } = await supabase
      .from("donation_history")
      .select("*, projects(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (donationsData) {
      // Map the data to include project info
      const mappedDonations = donationsData.map((d) => ({
        ...d,
        project: d.projects ? { title: d.projects.title } : null,
        status: "completed" as const,
      }));
      setDonations(mappedDonations);
    }

    setLoading(false);
  }, [supabase, user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const displayName = schoolData?.admin_name || user.user_metadata?.full_name || user.email;

  const handleProjectSuccess = () => {
    fetchData();
  };

  const handleChallengeSuccess = () => {
    fetchData();
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/dashboard/project/${projectId}`);
  };

  const handleNotificationsUpdate = (updatedNotifications: Notification[]) => {
    setNotifications(updatedNotifications);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Dashboard Container with side margins */}
      <div className="mx-auto px-12 sm:px-16 md:px-24 lg:px-40 xl:px-48 max-w-[1400px]">
        {/* Main Content - Two Column Layout */}
        <main className="py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Left Column - Projects Feed (Primary) */}
            <div className="lg:col-span-7 xl:col-span-7">
              <div className="lg:sticky lg:top-6" style={{ height: "calc(100vh - 120px)" }}>
                <ProjectsFeed
                  projects={projects}
                  onProjectClick={handleProjectClick}
                  onCreateProject={() => setShowProjectDialog(true)}
                />
              </div>
            </div>

            {/* Right Column - Notifications & Donations */}
            <div className="lg:col-span-5 xl:col-span-5 space-y-6">
              {/* Notifications Card */}
              <NotificationsCard
                notifications={notifications}
                userId={user.id}
                onNotificationsUpdate={handleNotificationsUpdate}
                loading={loading}
              />

              {/* Donation History Card */}
              <DonationHistoryCard donations={donations} loading={loading} />
            </div>
          </div>
        </main>
      </div>

      {/* Create Project Dialog */}
      {schoolData && (
        <CreateProjectDialog
          open={showProjectDialog}
          onOpenChange={setShowProjectDialog}
          schoolId={schoolData.id}
          challenges={schoolData.challenges || []}
          onSuccess={handleProjectSuccess}
        />
      )}

      {/* Create Challenge Dialog */}
      {schoolData && (
        <CreateChallengeDialog
          open={showChallengeDialog}
          onOpenChange={setShowChallengeDialog}
          schoolId={schoolData.id}
          onSuccess={handleChallengeSuccess}
        />
      )}
    </>
  );
}
