"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LogOut, Plus, X, Loader2, Upload, ChevronLeft, ChevronRight } from "lucide-react";

const POPULATION_OPTIONS = [
  { value: "0-500", label: "0 - 500 students" },
  { value: "500-1000", label: "500 - 1,000 students" },
  { value: "1000-2000", label: "1,000 - 2,000 students" },
  { value: "2000-5000", label: "2,000 - 5,000 students" },
  { value: "5000+", label: "5,000+ students" },
];

const STAFF_COUNT_OPTIONS = [
  { value: "0-50", label: "0 - 50 staff" },
  { value: "50-100", label: "50 - 100 staff" },
  { value: "100-250", label: "100 - 250 staff" },
  { value: "250-500", label: "250 - 500 staff" },
  { value: "500+", label: "500+ staff" },
];

interface SchoolFormData {
  adminName: string;
  schoolName: string;
  location: string;
  population: string;
  staffCount: string;
  overview: string;
}

interface Challenge {
  id: string;
  text: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentCard, setCurrentCard] = useState(1);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const [isAnimating, setIsAnimating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // Card 1 - School Info
  const [formData, setFormData] = useState<SchoolFormData>({
    adminName: "",
    schoolName: "",
    location: "",
    population: "",
    staffCount: "",
    overview: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof SchoolFormData, string>>>({});

  // Card 2 - Challenges & Image
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [newChallenge, setNewChallenge] = useState("");
  const [addingChallenge, setAddingChallenge] = useState(false);
  const [schoolImage, setSchoolImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Check if all required fields in Card 1 are filled
  const isCard1Valid = (): boolean => {
    return (
      formData.adminName.trim() !== "" &&
      formData.schoolName.trim() !== "" &&
      formData.location.trim() !== "" &&
      formData.population !== "" &&
      formData.staffCount !== "" &&
      formData.overview.trim() !== ""
    );
  };

  const validateCard1 = (): boolean => {
    const errors: Partial<Record<keyof SchoolFormData, string>> = {};

    if (!formData.adminName.trim()) errors.adminName = "Name is required";
    if (!formData.schoolName.trim()) errors.schoolName = "School name is required";
    if (!formData.location.trim()) errors.location = "Location is required";
    if (!formData.population) errors.population = "Population is required";
    if (!formData.staffCount) errors.staffCount = "Staff count is required";
    if (!formData.overview.trim()) errors.overview = "Overview is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (formErrors[name as keyof SchoolFormData]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (name: keyof SchoolFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/auth");
  };

  const saveCard1Data = async (): Promise<boolean> => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if school already exists for this user
      const { data: existingSchool } = await supabase
        .from("schools")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existingSchool) {
        // Update existing school
        const { error: updateError } = await supabase
          .from("schools")
          .update({
            admin_name: formData.adminName,
            school_name: formData.schoolName,
            location: formData.location,
            population: formData.population,
            staff_count: formData.staffCount,
            overview: formData.overview,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSchool.id);

        if (updateError) throw updateError;
        setSchoolId(existingSchool.id);
      } else {
        // Insert new school
        const { data: newSchool, error: insertError } = await supabase
          .from("schools")
          .insert({
            user_id: user.id,
            admin_name: formData.adminName,
            school_name: formData.schoolName,
            location: formData.location,
            population: formData.population,
            staff_count: formData.staffCount,
            overview: formData.overview,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        setSchoolId(newSchool.id);
      }

      return true;
    } catch (err) {
      console.error("Error saving school data:", err);
      toast.error("Failed to save school information", {
        description: "Please try again or contact support if the issue persists."
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleNextCard = async () => {
    if (!validateCard1()) return;

    const saved = await saveCard1Data();
    if (saved) {
      setSlideDirection("right");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentCard(2);
        setIsAnimating(false);
      }, 300);
    }
  };

  const handlePrevCard = () => {
    setSlideDirection("left");
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentCard(1);
      setIsAnimating(false);
    }, 300);
  };

  const addChallenge = async () => {
    if (!newChallenge.trim() || !schoolId) return;

    setAddingChallenge(true);
    try {
      const { data, error: insertError } = await supabase
        .from("challenges")
        .insert({
          school_id: schoolId,
          challenge_text: newChallenge.trim(),
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      setChallenges((prev) => [
        ...prev,
        { id: data.id, text: newChallenge.trim() },
      ]);
      setNewChallenge("");
      toast.success("Challenge added successfully");
    } catch (err) {
      console.error("Error adding challenge:", err);
      toast.error("Failed to add challenge", {
        description: "Please try again."
      });
    } finally {
      setAddingChallenge(false);
    }
  };

  const removeChallenge = async (challengeId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("challenges")
        .delete()
        .eq("id", challengeId);

      if (deleteError) throw deleteError;

      setChallenges((prev) => prev.filter((c) => c.id !== challengeId));
      toast.success("Challenge removed");
    } catch (err) {
      console.error("Error removing challenge:", err);
      toast.error("Failed to remove challenge", {
        description: "Please try again."
      });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSchoolImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadSchoolImage = async (): Promise<string | null> => {
    if (!schoolImage || !schoolId) return null;

    setUploadingImage(true);
    try {
      const fileExt = schoolImage.name.split(".").pop();
      const fileName = `${schoolId}.${fileExt}`;
      const filePath = `school-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("school-images")
        .upload(filePath, schoolImage, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("school-images")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error("Error uploading image:", err);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);

    try {
      // Upload image if selected
      let imageUrl = null;
      if (schoolImage) {
        imageUrl = await uploadSchoolImage();
      }

      // Update school with image URL and mark onboarding as complete
      const { error: updateError } = await supabase
        .from("schools")
        .update({
          school_image_url: imageUrl,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", schoolId);

      if (updateError) throw updateError;

      // Update user metadata
      await supabase.auth.updateUser({
        data: { onboarding_completed: true },
      });

      toast.success("Onboarding completed!", {
        description: "Redirecting to your dashboard..."
      });
      
      router.push("/dashboard");
    } catch (err) {
      console.error("Error completing onboarding:", err);
      toast.error("Failed to complete onboarding", {
        description: "Please try again or contact support."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
  };

  // Load existing data on mount
  useEffect(() => {
    const loadExistingData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Set admin name from user metadata or email
      const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "";
      setFormData((prev) => ({ ...prev, adminName: userName }));

      // Check for existing school data
      const { data: school } = await supabase
        .from("schools")
        .select("*, challenges(*)")
        .eq("user_id", user.id)
        .single();

      if (school) {
        setSchoolId(school.id);
        setFormData({
          adminName: school.admin_name,
          schoolName: school.school_name,
          location: school.location,
          population: school.population,
          staffCount: school.staff_count,
          overview: school.overview,
        });
        if (school.challenges) {
          setChallenges(
            school.challenges.map((c: { id: string; challenge_text: string }) => ({
              id: c.id,
              text: c.challenge_text,
            }))
          );
        }
        if (school.school_image_url) {
          setImagePreview(school.school_image_url);
        }
      }
    };

    loadExistingData();
  }, [supabase]);

  const getSlideClass = () => {
    if (!isAnimating) return "translate-x-0 opacity-100";
    if (slideDirection === "right") {
      return currentCard === 1
        ? "-translate-x-full opacity-0"
        : "translate-x-full opacity-0";
    } else {
      return currentCard === 2
        ? "translate-x-full opacity-0"
        : "-translate-x-full opacity-0";
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundImage: "url('/onboarding.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/60" />
      
      {/* Content container */}
      <div className="relative z-10 w-full max-w-2xl min-h-screen flex flex-col p-4 md:p-8">
          {/* Sign Out Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-24 right-4 z-20 gap-2 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
                disabled={signingOut}
              >
                {signingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Sign Out
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your progress will be saved, but you&apos;ll need to sign in again to continue.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSignOut}>
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Form Content */}
          <div
            className={`flex-1 flex flex-col justify-center transition-all duration-300 ease-in-out ${getSlideClass()}`}
          >
            {currentCard === 1 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-serif text-3xl md:text-4xl font-normal italic mb-2 tracking-tight text-white">
                    Lets get you onboarded onto backED
                  </h1>
                  <p className="text-white/80 text-sm">
                    Tell us about your school to get started
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="adminName" className="text-white">
                        Your Name <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="adminName"
                        name="adminName"
                        placeholder="John Doe"
                        value={formData.adminName}
                        onChange={handleInputChange}
                        className={`bg-white/90 backdrop-blur-sm ${formErrors.adminName ? "border-destructive" : ""}`}
                      />
                      {formErrors.adminName && (
                        <p className="text-xs text-red-400">{formErrors.adminName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schoolName" className="text-white">
                        School Name <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="schoolName"
                        name="schoolName"
                        placeholder="Springfield Academy"
                        value={formData.schoolName}
                        onChange={handleInputChange}
                        className={`bg-white/90 backdrop-blur-sm ${formErrors.schoolName ? "border-destructive" : ""}`}
                      />
                      {formErrors.schoolName && (
                        <p className="text-xs text-red-400">{formErrors.schoolName}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-white">
                      Location <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="location"
                      name="location"
                      placeholder="123 Education Street, City, Country"
                      value={formData.location}
                      onChange={handleInputChange}
                      className={`bg-white/90 backdrop-blur-sm ${formErrors.location ? "border-destructive" : ""}`}
                    />
                    {formErrors.location && (
                      <p className="text-xs text-red-400">{formErrors.location}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white">
                        Student Population <span className="text-red-400">*</span>
                      </Label>
                      <Select
                        value={formData.population}
                        onValueChange={(value) => handleSelectChange("population", value)}
                      >
                        <SelectTrigger
                          className={`w-full bg-white/90 backdrop-blur-sm ${formErrors.population ? "border-destructive" : ""}`}
                        >
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                          {POPULATION_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.population && (
                        <p className="text-xs text-red-400">{formErrors.population}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">
                        Staff Count <span className="text-red-400">*</span>
                      </Label>
                      <Select
                        value={formData.staffCount}
                        onValueChange={(value) => handleSelectChange("staffCount", value)}
                      >
                        <SelectTrigger
                          className={`w-full bg-white/90 backdrop-blur-sm ${formErrors.staffCount ? "border-destructive" : ""}`}
                        >
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                          {STAFF_COUNT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.staffCount && (
                        <p className="text-xs text-red-400">{formErrors.staffCount}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="overview" className="text-white">
                      School Overview <span className="text-red-400">*</span>
                    </Label>
                    <Textarea
                      id="overview"
                      name="overview"
                      placeholder="Tell us about your school's mission, values, and what makes it unique..."
                      value={formData.overview}
                      onChange={handleInputChange}
                      rows={4}
                      className={`bg-white/90 backdrop-blur-sm ${formErrors.overview ? "border-destructive" : ""}`}
                    />
                    {formErrors.overview && (
                      <p className="text-xs text-red-400">{formErrors.overview}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleNextCard}
                    disabled={loading || !isCard1Valid()}
                    className="gap-2 bg-white/90 hover:bg-white text-foreground backdrop-blur-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Continue
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {currentCard === 2 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-serif text-3xl md:text-4xl font-normal italic mb-2 tracking-tight text-white">
                    Challenges & Image
                  </h1>
                  <p className="text-white/80 text-sm">
                    Share your school&apos;s challenges and add a photo (optional)
                  </p>
                </div>

                {/* Challenges Section */}
                <div className="space-y-4">
                  <Label className="text-white">School Challenges</Label>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Describe a challenge your school faces..."
                      value={newChallenge}
                      onChange={(e) => setNewChallenge(e.target.value)}
                      rows={2}
                      className="flex-1 bg-white/90 backdrop-blur-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={addChallenge}
                      disabled={!newChallenge.trim() || addingChallenge}
                      className="shrink-0 self-end bg-white/90 hover:bg-white backdrop-blur-sm"
                    >
                      {addingChallenge ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {challenges.length > 0 && (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {challenges.map((challenge) => (
                        <div
                          key={challenge.id}
                          className="flex items-start gap-2 bg-white/90 backdrop-blur-sm p-3 rounded-md"
                        >
                          <p className="text-sm flex-1">{challenge.text}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-6 w-6"
                            onClick={() => removeChallenge(challenge.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Image Upload Section */}
                <div className="space-y-4">
                  <Label className="text-white">
                    School Image <span className="text-white/60">(Optional)</span>
                  </Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  {imagePreview ? (
                    <div className="relative w-full h-40 rounded-md overflow-hidden bg-white/10 backdrop-blur-sm">
                      <Image
                        src={imagePreview}
                        alt="School preview"
                        fill
                        className="object-cover"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-2 right-2 bg-white/90 hover:bg-white backdrop-blur-sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Change Image
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-40 flex flex-col gap-2 bg-white/90 hover:bg-white backdrop-blur-sm border-dashed"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-muted-foreground">Click to upload school image</span>
                    </Button>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handlePrevCard} className="gap-2 bg-white/90 hover:bg-white backdrop-blur-sm">
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={handleSkip} disabled={loading} className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm">
                      Skip
                    </Button>
                    <Button onClick={completeOnboarding} disabled={loading} className="bg-white/90 hover:bg-white text-foreground backdrop-blur-sm">
                      {loading || uploadingImage ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          {uploadingImage ? "Uploading..." : "Saving..."}
                        </>
                      ) : (
                        "Complete Setup"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Indicator */}
            <div className="flex justify-center gap-2 mt-6">
              <div
                className={`h-2 w-8 rounded-full transition-colors ${
                  currentCard === 1 ? "bg-white" : "bg-white/30"
                }`}
              />
              <div
                className={`h-2 w-8 rounded-full transition-colors ${
                  currentCard === 2 ? "bg-white" : "bg-white/30"
                }`}
              />
            </div>
          </div>
        </div>
      </div>
  );
}
