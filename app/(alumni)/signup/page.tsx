"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Check, X, Eye, EyeOff } from "lucide-react";

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

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);

  // Alumni form state
  const [alumniForm, setAlumniForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    selectedSchoolId: null as string | null,
    schoolName: "", // For unsupported schools
    niches: [] as string[],
  });

  const router = useRouter();
  const supabase = createClient();

  // Fetch supported schools
  useEffect(() => {
    const fetchSchools = async () => {
      const { data } = await supabase
        .from("schools")
        .select("id, school_name, location, logo_url")
        .eq("is_supported", true)
        .order("school_name");

      if (data) {
        setSchools(data);
      }
    };

    fetchSchools();
  }, [supabase]);

  const filteredSchools = schools.filter((school) =>
    school.school_name.toLowerCase().includes(schoolSearch.toLowerCase())
  );

  const handleNicheToggle = (niche: string) => {
    setAlumniForm((prev) => ({
      ...prev,
      niches: prev.niches.includes(niche)
        ? prev.niches.filter((n) => n !== niche)
        : [...prev.niches, niche],
    }));
  };

  const handleSchoolSelect = (school: SchoolOption | null) => {
    if (school) {
      setAlumniForm((prev) => ({
        ...prev,
        selectedSchoolId: school.id,
        schoolName: school.school_name,
      }));
    } else {
      // User typed a school that doesn't exist
      setAlumniForm((prev) => ({
        ...prev,
        selectedSchoolId: null,
        schoolName: schoolSearch,
      }));
    }
    setShowSchoolDropdown(false);
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(alumniForm.password);

  const handleAlumniSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // School selection is required
    if (!alumniForm.selectedSchoolId && !alumniForm.schoolName.trim()) {
      toast.error("Please select or enter your school");
      setLoading(false);
      return;
    }

    if (alumniForm.password !== alumniForm.confirmPassword) {
      toast.error("Passwords don't match");
      setLoading(false);
      return;
    }

    if (alumniForm.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: alumniForm.email,
      password: alumniForm.password,
      options: {
        data: {
          full_name: alumniForm.fullName,
          user_type: "alumni",
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/feed`,
      },
    });

    if (authError) {
      toast.error("Sign Up Failed", {
        description: authError.message,
      });
      setLoading(false);
      return;
    }

    if (!authData.user) {
      toast.error("Sign Up Failed", {
        description: "No user returned from signup",
      });
      setLoading(false);
      return;
    }

    // Check if school is supported
    const isSchoolSupported = alumniForm.selectedSchoolId !== null;

    // Create alumni user profile
    const { error: profileError } = await supabase.from("alumni_users").insert({
      user_id: authData.user.id,
      email: alumniForm.email,
      full_name: alumniForm.fullName,
      school_id: alumniForm.selectedSchoolId,
      school_name: alumniForm.schoolName,
      niches: alumniForm.niches,
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      toast.error("Failed to create profile", {
        description: profileError.message,
      });
      setLoading(false);
      return;
    }

    // If school is not supported, create a school request
    if (!isSchoolSupported && alumniForm.schoolName) {
      await supabase.from("school_requests").insert({
        school_name: alumniForm.schoolName,
        requested_by_user_id: authData.user.id,
        requested_by_email: alumniForm.email,
        status: "pending",
      });

      toast.info(
        `Your school isn't on BackED yet. We'll reach out to ${alumniForm.schoolName} to request they join the platform!`,
        { duration: 5000 }
      );
    }

    toast.success("Account created successfully!", {
      description: "Welcome to BackED!",
    });

    // Redirect to feed with welcome message
    router.push("/feed?welcome=signup");
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=/feed&type=alumni`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      toast.error("Google Sign In Failed", {
        description: error.message,
      });
      setLoading(false);
    }
  };

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
        <div className="pb-8">
          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="font-serif text-2xl font-medium mb-1">
              Create Account
            </h1>
            <p className="text-muted-foreground text-sm">
              Join BackED to support school projects
            </p>
          </div>

          {/* Alumni Signup Form */}
          <form onSubmit={handleAlumniSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alumni-name">Full Name</Label>
              <Input
                id="alumni-name"
                placeholder="John Doe"
                value={alumniForm.fullName}
                onChange={(e) =>
                  setAlumniForm({ ...alumniForm, fullName: e.target.value })
                }
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alumni-email">Email</Label>
              <Input
                id="alumni-email"
                type="email"
                placeholder="your@email.com"
                value={alumniForm.email}
                onChange={(e) =>
                  setAlumniForm({ ...alumniForm, email: e.target.value })
                }
                required
                className="h-11"
              />
            </div>

            {/* School Selection */}
            <div className="space-y-2">
              <Label htmlFor="school-search">Your School</Label>
              <div className="relative">
                <Input
                  id="school-search"
                  placeholder="Search for your school..."
                  value={schoolSearch}
                  onChange={(e) => {
                    setSchoolSearch(e.target.value);
                    setShowSchoolDropdown(true);
                    if (!e.target.value) {
                      setAlumniForm((prev) => ({
                        ...prev,
                        selectedSchoolId: null,
                        schoolName: "",
                      }));
                    }
                  }}
                  onFocus={() => setShowSchoolDropdown(true)}
                  className="h-11"
                />
                {alumniForm.selectedSchoolId && (
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
                          {alumniForm.selectedSchoolId === school.id && (
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

              {!alumniForm.selectedSchoolId && alumniForm.schoolName && (
                <p className="text-xs text-amber-600">
                  This school isn&apos;t on BackED yet. We&apos;ll reach out to
                  them!
                </p>
              )}
            </div>

            {/* Interests/Niches */}
            <div className="space-y-2">
              <Label>Your Interests</Label>
              <div className="flex flex-wrap gap-2">
                {NICHES.map((niche) => (
                  <Badge
                    key={niche}
                    variant={
                      alumniForm.niches.includes(niche) ? "default" : "outline"
                    }
                    className="cursor-pointer transition-colors"
                    onClick={() => handleNicheToggle(niche)}
                  >
                    {niche}
                    {alumniForm.niches.includes(niche) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="alumni-password">Password</Label>
              <div className="relative">
                <Input
                  id="alumni-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={alumniForm.password}
                  onChange={(e) =>
                    setAlumniForm({
                      ...alumniForm,
                      password: e.target.value,
                    })
                  }
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {/* Password Strength Indicator */}
              {alumniForm.password && (
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full ${
                        passwordStrength >= level
                          ? level <= 2
                            ? "bg-red-500"
                            : level <= 3
                            ? "bg-yellow-500"
                            : "bg-green-500"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="alumni-confirm-password">Confirm Password</Label>
              <Input
                id="alumni-confirm-password"
                type="password"
                placeholder="••••••••"
                value={alumniForm.confirmPassword}
                onChange={(e) =>
                  setAlumniForm({
                    ...alumniForm,
                    confirmPassword: e.target.value,
                  })
                }
                required
                className="h-11"
              />
              {alumniForm.confirmPassword &&
                alumniForm.password !== alumniForm.confirmPassword && (
                  <p className="text-xs text-red-500">
                    Passwords don&apos;t match
                  </p>
                )}
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Sign In */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Login Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary font-medium hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}
