"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Camera,
  Edit2,
  School,
  Heart,
  Gift,
  Settings,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { AlumniUser, School as SchoolType } from "@/lib/supabase/database.types";

const NICHE_OPTIONS = [
  "Technology",
  "Science",
  "Arts",
  "Sports",
  "Music",
  "Mathematics",
  "Literature",
  "Environment",
  "Health",
  "Social Sciences",
  "Engineering",
  "Business",
  "Agriculture",
];

export default function ProfilePage() {
  const [user, setUser] = useState<AlumniUser | null>(null);
  const [school, setSchool] = useState<SchoolType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({
    totalDonations: 0,
    projectsBacked: 0,
    schoolsFollowed: 0,
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: "",
    niches: [] as string[],
  });

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/login");
        return;
      }

      // Get alumni user with school
      const { data: alumniUser, error } = await supabase
        .from("alumni_users")
        .select("*")
        .eq("user_id", authUser.id)
        .single();

      if (error || !alumniUser) {
        // User is authenticated but no alumni profile - they need to complete signup
        router.push("/signup");
        return;
      }

      setUser(alumniUser);
      setEditForm({
        full_name: alumniUser.full_name,
        niches: alumniUser.niches || [],
      });

      // Get school if exists
      if (alumniUser.school_id) {
        const { data: schoolData } = await supabase
          .from("schools")
          .select("*")
          .eq("id", alumniUser.school_id)
          .single();

        if (schoolData) {
          setSchool(schoolData);
        }
      }

      // Get stats
      const [donationsResult, schoolsResult] = await Promise.all([
        supabase
          .from("alumni_donations")
          .select("amount, project_id")
          .eq("alumni_user_id", alumniUser.id)
          .eq("payment_status", "completed"),
        supabase
          .from("alumni_followed_schools")
          .select("id", { count: "exact", head: true })
          .eq("alumni_user_id", alumniUser.id),
      ]);

      const donations = donationsResult.data || [];
      const totalAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
      const uniqueProjects = new Set(donations.map((d) => d.project_id)).size;

      setStats({
        totalDonations: totalAmount,
        projectsBacked: uniqueProjects,
        schoolsFollowed: schoolsResult.count || 0,
      });

      setLoading(false);
    };

    fetchProfile();
  }, [supabase, router]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);

    const { error } = await supabase
      .from("alumni_users")
      .update({
        full_name: editForm.full_name,
        niches: editForm.niches,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update profile");
      setSaving(false);
      return;
    }

    setUser((prev) =>
      prev
        ? {
            ...prev,
            full_name: editForm.full_name,
            niches: editForm.niches,
          }
        : null
    );

    toast.success("Profile updated successfully");
    setSaving(false);
    setShowEditModal(false);
  };

  const handleNicheToggle = (niche: string) => {
    setEditForm((prev) => ({
      ...prev,
      niches: prev.niches.includes(niche)
        ? prev.niches.filter((n) => n !== niche)
        : [...prev.niches, niche],
    }));
  };

  const formatCurrency = (amount: number) => {
    return `₵${amount.toLocaleString()}`;
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold text-lg">Profile</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/settings")}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-64px)]">
        {/* Profile Header */}
        <div className="relative">
          {/* Cover */}
          <div className="h-24 bg-gradient-to-r from-primary/20 to-primary/5" />

          {/* Avatar */}
          <div className="px-4 -mt-12 mb-4">
            <div className="relative inline-block">
              <Avatar className="h-24 w-24 border-4 border-background">
                <AvatarImage src={user.profile_picture_url || ""} />
                <AvatarFallback className="text-2xl">
                  {user.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full">
                <Camera className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* User Info */}
          <div className="px-4 pb-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2 className="text-xl font-bold">{user.full_name}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(true)}
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>

            {/* School */}
            {school && (
              <div className="flex items-center gap-2 mb-3">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={school.logo_url || ""} />
                  <AvatarFallback className="text-xs">
                    {school.school_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{school.school_name}</span>
                <Badge variant="secondary" className="text-xs">
                  Alumni
                </Badge>
              </div>
            )}

            {/* Niches */}
            {user.niches && user.niches.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {user.niches.map((niche) => (
                  <Badge key={niche} variant="outline" className="text-xs">
                    {niche}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 border-y border-border">
          <div className="py-4 text-center">
            <p className="text-xl font-bold">
              {formatCurrency(stats.totalDonations)}
            </p>
            <p className="text-xs text-muted-foreground">Total Donated</p>
          </div>
          <div className="py-4 text-center border-x border-border">
            <p className="text-xl font-bold">{stats.projectsBacked}</p>
            <p className="text-xs text-muted-foreground">Projects Backed</p>
          </div>
          <div className="py-4 text-center">
            <p className="text-xl font-bold">{stats.schoolsFollowed}</p>
            <p className="text-xs text-muted-foreground">Schools Following</p>
          </div>
        </div>

        {/* Menu Items */}
        <div className="mt-4">
          <MenuItem
            icon={<Gift className="h-5 w-5 text-green-500" />}
            label="Donation History"
            href="/donations"
          />
          <MenuItem
            icon={<Heart className="h-5 w-5 text-pink-500" />}
            label="Followed Schools"
            href="/followed-schools"
          />
          <MenuItem
            icon={<School className="h-5 w-5 text-blue-500" />}
            label="Saved Projects"
            href="/saved"
          />
        </div>

        {/* Member Since */}
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            Member since{" "}
            {user.created_at ? new Date(user.created_at).toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric",
            }) : ""}
          </p>
        </div>
      </ScrollArea>

      {/* Edit Profile Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={editForm.full_name}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    full_name: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Interests</Label>
              <div className="flex flex-wrap gap-2">
                {NICHE_OPTIONS.map((niche) => (
                  <Badge
                    key={niche}
                    variant={
                      editForm.niches.includes(niche) ? "default" : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => handleNicheToggle(niche)}
                  >
                    {niche}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveProfile}
                disabled={saving || !editForm.full_name.trim()}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(href)}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-3 border-b flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="h-24 bg-muted" />
      <div className="px-4 -mt-12 mb-4">
        <Skeleton className="h-24 w-24 rounded-full" />
      </div>
      <div className="px-4 space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}
