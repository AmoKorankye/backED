"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Check, X, User } from "lucide-react";

const NICHES = [
  "Technology",
  "Arts",
  "Sports",
  "Science",
  "Community Service",
  "Environment",
  "Health",
  "Education",
  "Agriculture",
  "Music",
];

interface SchoolOption {
  id: string;
  school_name: string;
  location: string;
  logo_url: string | null;
}

interface AlumniUser {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  school_id: string | null;
  school_name: string | null;
  niches: string[];
}

export default function CompleteProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [alumniUser, setAlumniUser] = useState<AlumniUser | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    selectedSchoolId: null as string | null,
    schoolName: "",
    niches: [] as string[],
  });

  const router = useRouter();
  const supabase = createClient();

  // Fetch user data and schools
  useEffect(() => {
    const fetchData = async () => {
      // Get current auth user
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/login");
        return;
      }

      // Get alumni profile
      const { data: alumni } = await supabase
        .from("alumni_users")
        .select("*")
        .eq("user_id", authUser.id)
        .single();

      if (!alumni) {
        // No alumni profile - redirect to signup
        router.push("/signup");
        return;
      }

      // Check if profile is already complete
      if (alumni.school_id || alumni.school_name) {
        // Profile already complete - redirect to feed
        router.push("/feed");
        return;
      }

      setAlumniUser(alumni);
      setFormData({
        fullName: alumni.full_name || "",
        selectedSchoolId: alumni.school_id,
        schoolName: alumni.school_name || "",
        niches: alumni.niches || [],
      });

      // Fetch supported schools
      const { data: schoolsData } = await supabase
        .from("schools")
        .select("id, school_name, location, logo_url")
        .eq("is_supported", true)
        .order("school_name");

      if (schoolsData) {
        setSchools(schoolsData);
      }

      setLoading(false);
    };

    fetchData();
  }, [supabase, router]);

  const filteredSchools = schools.filter((school) =>
    school.school_name.toLowerCase().includes(schoolSearch.toLowerCase())
  );

  const handleNicheToggle = (niche: string) => {
    setFormData((prev) => ({
      ...prev,
      niches: prev.niches.includes(niche)
        ? prev.niches.filter((n) => n !== niche)
        : [...prev.niches, niche],
    }));
  };

  const handleSchoolSelect = (school: SchoolOption | null) => {
    if (school) {
      setFormData((prev) => ({
        ...prev,
        selectedSchoolId: school.id,
        schoolName: school.school_name,
      }));
    } else {
      // User typed a school that doesn't exist
      setFormData((prev) => ({
        ...prev,
        selectedSchoolId: null,
        schoolName: schoolSearch,
      }));
    }
    setShowSchoolDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Validate school
    if (!formData.selectedSchoolId && !formData.schoolName.trim()) {
      toast.error("Please select or enter your school");
      setSaving(false);
      return;
    }

    if (!alumniUser) {
      toast.error("User not found");
      setSaving(false);
      return;
    }

    // Update alumni profile
    const { error: updateError } = await supabase
      .from("alumni_users")
      .update({
        full_name: formData.fullName,
        school_id: formData.selectedSchoolId,
        school_name: formData.schoolName,
        niches: formData.niches,
      })
      .eq("id", alumniUser.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      toast.error("Failed to update profile", {
        description: updateError.message,
      });
      setSaving(false);
      return;
    }

    // If school is not supported, create a school request
    if (!formData.selectedSchoolId && formData.schoolName) {
      await supabase.from("school_requests").insert({
        school_name: formData.schoolName,
        requested_by_user_id: alumniUser.user_id,
        requested_by_email: alumniUser.email,
        status: "pending",
      });

      toast.info(
        `Your school isn't on BackED yet. We'll reach out to ${formData.schoolName} to request they join the platform!`,
        { duration: 5000 }
      );
    }

    toast.success("Profile completed!");
    router.push("/feed?welcome=complete");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex justify-center py-6">
        <Image
          src="/BackED Black.png"
          alt="BackED"
          width={120}
          height={40}
          className="dark:invert"
          priority
        />
      </div>

      <ScrollArea className="flex-1 px-6">
        <div className="pb-8 max-w-md mx-auto">
          {/* User Avatar & Welcome */}
          <div className="text-center mb-6">
            {alumniUser?.avatar_url ? (
              <Image
                src={alumniUser.avatar_url}
                alt={alumniUser.full_name}
                width={80}
                height={80}
                className="rounded-full mx-auto mb-4"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <User className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            <h1 className="font-serif text-2xl font-medium mb-1">
              Welcome, {alumniUser?.full_name?.split(" ")[0]}!
            </h1>
            <p className="text-muted-foreground text-sm">
              Complete your profile to start supporting school projects
            </p>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                required
                className="h-11"
              />
            </div>

            {/* School Selection */}
            <div className="space-y-2">
              <Label htmlFor="school-search">Your School *</Label>
              <div className="relative">
                <Input
                  id="school-search"
                  placeholder="Search for your school..."
                  value={schoolSearch}
                  onChange={(e) => {
                    setSchoolSearch(e.target.value);
                    setShowSchoolDropdown(true);
                    if (!e.target.value) {
                      setFormData((prev) => ({
                        ...prev,
                        selectedSchoolId: null,
                        schoolName: "",
                      }));
                    }
                  }}
                  onFocus={() => setShowSchoolDropdown(true)}
                  className="h-11"
                />
                {formData.selectedSchoolId && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
              </div>

              {/* School Dropdown */}
              {showSchoolDropdown && schoolSearch && (
                <div className="relative">
                  <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto">
                    {filteredSchools.length > 0 ? (
                      filteredSchools.map((school) => (
                        <button
                          key={school.id}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-2"
                          onClick={() => {
                            handleSchoolSelect(school);
                            setSchoolSearch(school.school_name);
                          }}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {school.school_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {school.location}
                            </p>
                          </div>
                          {formData.selectedSchoolId === school.id && (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center">
                        <p className="text-sm text-muted-foreground mb-2">
                          School not found
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSchoolSelect(null)}
                        >
                          Continue with &quot;{schoolSearch}&quot;
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!formData.selectedSchoolId && formData.schoolName && (
                <p className="text-xs text-amber-600">
                  This school isn&apos;t on BackED yet. We&apos;ll reach out to
                  them!
                </p>
              )}
            </div>

            {/* Interests/Niches */}
            <div className="space-y-2">
              <Label>Your Interests (Optional)</Label>
              <p className="text-xs text-muted-foreground">
                Select topics you&apos;re interested in to personalize your feed
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {NICHES.map((niche) => (
                  <Badge
                    key={niche}
                    variant={
                      formData.niches.includes(niche) ? "default" : "outline"
                    }
                    className="cursor-pointer transition-colors"
                    onClick={() => handleNicheToggle(niche)}
                  >
                    {niche}
                    {formData.niches.includes(niche) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Complete Profile"
              )}
            </Button>
          </form>
        </div>
      </ScrollArea>
    </div>
  );
}
