"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Share2,
  Heart,
  Users,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import type { AlumniUser, Project, School } from "@/lib/supabase/database.types";
import AIProjectSummary from "@/components/ai-project-summary";

interface ProjectWithSchool extends Project {
  schools: School | null;
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [project, setProject] = useState<ProjectWithSchool | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AlumniUser | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFollowingSchool, setIsFollowingSchool] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Donation flow states
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationStep, setDonationStep] = useState<"amount" | "invoice" | "processing" | "success">("amount");
  const [donationAmount, setDonationAmount] = useState<string>("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [donationId, setDonationId] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);

        // Get current user
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          const { data: alumniUser } = await supabase
            .from("alumni_users")
            .select("*")
            .eq("user_id", authUser.id)
            .single();

          if (alumniUser) {
            setUser(alumniUser);

            // Check if project is bookmarked
            const { data: bookmark } = await supabase
              .from("alumni_bookmarks")
              .select("id")
              .eq("alumni_user_id", alumniUser.id)
              .eq("project_id", resolvedParams.id)
              .single();

            setIsBookmarked(!!bookmark);
          }
        }

        // Fetch project details
        const { data: projectData, error } = await supabase
          .from("projects")
          .select(
            `
            *,
            schools (*)
          `
          )
          .eq("id", resolvedParams.id)
          .single();

        if (error) {
          console.error("Error fetching project:", error);
          toast.error("Project not found or could not be loaded");
          router.push("/feed");
          return;
        }

        setProject(projectData);

        // Check if following school
        if (projectData.schools && user) {
          const { data: follow } = await supabase
            .from("alumni_followed_schools")
            .select("id")
            .eq("alumni_user_id", user.id)
            .eq("school_id", projectData.schools.id)
            .single();

          setIsFollowingSchool(!!follow);
        }
      } catch (err) {
        console.error("Unexpected error loading project:", err);
        toast.error("Something went wrong loading this project. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [resolvedParams.id, supabase, router]);

  const handleBookmark = async () => {
    // Check if we have an alumni user profile
    let currentUser = user;
    if (!currentUser) {
      // Check if user is authenticated but just doesn't have a profile yet
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { data: alumniUser } = await supabase
          .from("alumni_users")
          .select("*")
          .eq("user_id", authUser.id)
          .single();

        if (alumniUser) {
          setUser(alumniUser);
          currentUser = alumniUser;
        } else {
          toast.error("Please complete your profile to save projects", {
            action: {
              label: "Complete Profile",
              onClick: () => router.push("/signup"),
            },
          });
          return;
        }
      } else {
        toast.error("Please login to save projects", {
          action: {
            label: "Login",
            onClick: () => router.push("/login"),
          },
        });
        return;
      }
    }

    if (isBookmarked) {
      const { error } = await supabase
        .from("alumni_bookmarks")
        .delete()
        .eq("alumni_user_id", currentUser!.id)
        .eq("project_id", resolvedParams.id);

      if (error) {
        toast.error("Failed to remove bookmark. Please try again.");
      } else {
        setIsBookmarked(false);
        toast.success("Removed from saved");
      }
    } else {
      const { error } = await supabase.from("alumni_bookmarks").insert({
        alumni_user_id: currentUser!.id,
        project_id: resolvedParams.id,
      });

      if (error) {
        toast.error("Failed to save project. Please try again.");
      } else {
        setIsBookmarked(true);
        toast.success("Project saved!");
      }
    }
  };

  const handleFollowSchool = async () => {
    // Check if we have an alumni user profile
    let currentUser = user;
    if (!currentUser || !project?.schools) {
      if (!project?.schools) {
        toast.error("Unable to follow school");
        return;
      }

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { data: alumniUser } = await supabase
          .from("alumni_users")
          .select("*")
          .eq("user_id", authUser.id)
          .single();

        if (alumniUser) {
          setUser(alumniUser);
          currentUser = alumniUser;
        } else {
          toast.error("Please complete your profile to follow schools", {
            action: {
              label: "Complete Profile",
              onClick: () => router.push("/signup"),
            },
          });
          return;
        }
      } else {
        toast.error("Please login to follow schools", {
          action: {
            label: "Login",
            onClick: () => router.push("/login"),
          },
        });
        return;
      }
    }

    if (isFollowingSchool) {
      const { error } = await supabase
        .from("alumni_followed_schools")
        .delete()
        .eq("alumni_user_id", currentUser!.id)
        .eq("school_id", project.schools.id);

      if (error) {
        toast.error("Failed to unfollow school. Please try again.");
      } else {
        setIsFollowingSchool(false);
        toast.success("Unfollowed school");
      }
    } else {
      const { error } = await supabase.from("alumni_followed_schools").insert({
        alumni_user_id: currentUser!.id,
        school_id: project.schools.id,
      });

      if (error) {
        toast.error("Failed to follow school. Please try again.");
      } else {
        setIsFollowingSchool(true);
        toast.success("Now following this school!");
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: project?.title,
          text: `Support ${project?.title} on BackED`,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleDonate = async () => {
    // Check if we have an alumni user profile
    if (!user) {
      // Check if user is authenticated but just doesn't have a profile yet
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        // User is authenticated but doesn't have an alumni profile
        // Try to fetch or create their profile
        const { data: alumniUser } = await supabase
          .from("alumni_users")
          .select("*")
          .eq("user_id", authUser.id)
          .single();

        if (alumniUser) {
          setUser(alumniUser);
          // Continue with donation
          setShowDonationModal(true);
          setDonationStep("amount");
          setDonationAmount("");
          return;
        } else {
          // User is authenticated but has no alumni profile - redirect to complete signup
          toast.error("Please complete your profile to donate", {
            action: {
              label: "Complete Profile",
              onClick: () => router.push("/signup"),
            },
          });
          return;
        }
      } else {
        // User is not authenticated at all
        toast.error("Please login to donate", {
          action: {
            label: "Login",
            onClick: () => router.push("/login"),
          },
        });
        return;
      }
    }
    setShowDonationModal(true);
    setDonationStep("amount");
    setDonationAmount("");
    setIsAnonymous(false);
  };

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    setDonationAmount(sanitized);
  };

  const getParsedAmount = () => {
    const parsed = parseFloat(donationAmount);
    return !isNaN(parsed) && parsed > 0 ? parsed : null;
  };

  const getRemainingAmount = () => {
    if (!project?.target_amount) return null;
    const remaining = project.target_amount - (project.current_amount || 0);
    return Math.max(remaining, 0);
  };

  const handleProceedToInvoice = () => {
    const amount = getParsedAmount();
    const remaining = getRemainingAmount();
    
    if (!amount || amount <= 0) return;
    
    if (remaining !== null && amount > remaining) {
      toast.error(`Donation amount exceeds remaining target. Maximum: ${formatCurrency(remaining)}`);
      return;
    }
    
    setDonationStep("invoice");
  };

  const handleConfirmDonation = async () => {
    const amount = getParsedAmount();
    if (!user || !project || !amount) return;

    // Double-check amount doesn't exceed remaining target
    const remaining = getRemainingAmount();
    if (remaining !== null && amount > remaining) {
      toast.error(`Donation amount exceeds remaining target. Maximum: ${formatCurrency(remaining)}`);
      setDonationStep("amount");
      return;
    }

    setDonationStep("processing");
    setIsProcessing(true);

    try {
      // Simulate Paystack payment processing (demo mode - all donations succeed)
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Generate a demo transaction reference
      const transactionRef = `BACKED_DEMO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const receiptNumber = `RCP-${Date.now().toString().slice(-8)}`;

      // Create donation record with demo status
      const { data: donation, error } = await supabase
        .from("alumni_donations")
        .insert({
          alumni_user_id: user.id,
          project_id: project.id,
          amount: amount,
          is_anonymous: isAnonymous,
          status: "completed_demo",
          payment_provider: "paystack",
          payment_reference: transactionRef,
          receipt_number: receiptNumber,
        })
        .select()
        .single();

      if (error) {
        console.error("Donation insert error:", error);
        toast.error("Your donation could not be recorded. Please try again.", {
          description: "No payment has been charged.",
        });
        setIsProcessing(false);
        setDonationStep("amount");
        return;
      }

      setDonationId(donation.id);
      setIsProcessing(false);
      setDonationStep("success");

      // The DB trigger `update_project_funding_stats` automatically updates
      // current_amount, backers_count, and status on the projects table.
      // We just need to refresh the local state to reflect the new values.
      const { data: updatedProject } = await supabase
        .from("projects")
        .select("*, schools (*)")
        .eq("id", project.id)
        .single();

      if (updatedProject) {
        setProject(updatedProject);
      }
    } catch (err) {
      console.error("Unexpected donation error:", err);
      toast.error("Something went wrong processing your donation.", {
        description: "Please check your donation history or try again.",
      });
      setIsProcessing(false);
      setDonationStep("amount");
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "₵0";
    return `₵${amount.toLocaleString()}`;
  };

  const getProgress = (current: number | null, target: number | null) => {
    if (!current || !target || target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Gallery images (fallback to single image)
  const images: string[] = project?.image_urls?.length
    ? project.image_urls
    : project?.image_url
    ? [project.image_url]
    : [];

  if (loading) {
    return <ProjectDetailSkeleton />;
  }

  if (!project) {
    return null;
  }

  const progress = getProgress(project.current_amount, project.target_amount);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBookmark}>
              {isBookmarked ? (
                <BookmarkCheck className="h-5 w-5 text-amber-500 fill-amber-500" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="relative aspect-video bg-muted">
          <Image
            src={images[currentImageIndex]}
            alt={project.title}
            fill
            className="object-cover"
          />

          {images.length > 1 && (
            <>
              {/* Previous Button */}
              <button
                onClick={() =>
                  setCurrentImageIndex((prev) =>
                    prev === 0 ? images.length - 1 : prev - 1
                  )
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-background/80 backdrop-blur-sm rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Next Button */}
              <button
                onClick={() =>
                  setCurrentImageIndex((prev) =>
                    prev === images.length - 1 ? 0 : prev + 1
                  )
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-background/80 backdrop-blur-sm rounded-full"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Dots Indicator */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      idx === currentImageIndex
                        ? "bg-white"
                        : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-5">
        {/* Title & School */}
        <h1 className="text-xl font-bold mb-2">{project.title}</h1>

        {project.schools && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={project.schools.logo_url || ""} />
                <AvatarFallback>
                  {project.schools.school_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">
                  {project.schools.school_name}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {project.schools.location}
                </p>
              </div>
            </div>
            <Button
              variant={isFollowingSchool ? "secondary" : "outline"}
              size="sm"
              onClick={handleFollowSchool}
            >
              <Heart
                className={`h-4 w-4 mr-1 ${
                  isFollowingSchool ? "fill-current" : ""
                }`}
              />
              {isFollowingSchool ? "Following" : "Follow"}
            </Button>
          </div>
        )}

        {/* Progress */}
        <div className="bg-card border rounded-xl p-4 mb-5">
          <div className="flex justify-between mb-2">
            <span className="text-2xl font-bold">
              {formatCurrency(project.current_amount)}
            </span>
            <span className="text-muted-foreground">
              of {formatCurrency(project.target_amount)}
            </span>
          </div>
          <Progress value={progress} className="h-3 mb-3" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {project.backers_count || 0} backers
            </span>
            {project.end_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(project.end_date)}
              </span>
            )}
          </div>
        </div>

        {/* Categories */}
        {project.category && project.category.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {project.category.map((cat) => (
              <Badge key={cat} variant="secondary">
                {cat}
              </Badge>
            ))}
          </div>
        )}

        {/* AI Summary */}
        <div className="mb-6">
          <AIProjectSummary projectId={resolvedParams.id} />
        </div>

        {/* Description */}
        <div className="mb-6">
          <h2 className="font-semibold mb-2">About this project</h2>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {project.description}
          </p>
        </div>

        {/* Project Overview */}
        {project.overview && (
          <div className="mb-6">
            <h2 className="font-semibold mb-2">Project Overview</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {project.overview}
            </p>
          </div>
        )}

        {/* Motivation */}
        {project.motivation && (
          <div className="mb-6">
            <h2 className="font-semibold mb-2">Motivation</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {project.motivation}
            </p>
          </div>
        )}

        {/* Objectives */}
        {project.objectives && (
          <div className="mb-6">
            <h2 className="font-semibold mb-2">Objectives</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {project.objectives}
            </p>
          </div>
        )}

        {/* Scope */}
        {project.scope && (
          <div className="mb-6">
            <h2 className="font-semibold mb-2">Scope</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {project.scope}
            </p>
          </div>
        )}

        {/* Challenge Info */}
        {project.challenge_id && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-5">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              🏆 This project is part of a challenge
            </p>
          </div>
        )}
      </div>

      {/* Floating Donate Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <div className="max-w-md mx-auto">
          <Button
            className="w-full h-12 text-lg"
            onClick={handleDonate}
            disabled={
              project.status !== "active" ||
              (getRemainingAmount() !== null && getRemainingAmount()! <= 0)
            }
          >
            {project.status !== "active"
              ? project.status === "funded"
                ? "Fully Funded!"
                : "Project Closed"
              : getRemainingAmount() !== null && getRemainingAmount()! <= 0
              ? "Fully Funded!"
              : "Back This Project"}
          </Button>
        </div>
      </div>

      {/* Donation Modal */}
      <Dialog open={showDonationModal} onOpenChange={setShowDonationModal}>
        <DialogContent className="sm:max-w-md">
          {donationStep === "amount" && (
            <>
              <DialogHeader>
                <DialogTitle>Back this project</DialogTitle>
                <DialogDescription>
                  Enter the amount you&apos;d like to donate to {project.title}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Amount Input */}
                <div className="space-y-2">
                  <Label>Donation Amount (GHS)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      ₵
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={donationAmount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className="pl-8 text-lg h-12"
                      autoFocus
                    />
                  </div>
                  {getRemainingAmount() !== null && getRemainingAmount()! > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Remaining to reach goal: {formatCurrency(getRemainingAmount())}
                    </p>
                  )}
                  {getRemainingAmount() === 0 && (
                    <p className="text-xs text-green-600 dark:text-green-500">
                      ✓ Project is fully funded!
                    </p>
                  )}
                </div>

                {/* Anonymous Donation Option */}
                <div className="flex items-center space-x-3 py-2">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="anonymous" className="text-sm font-normal cursor-pointer">
                    Donate anonymously (your name won&apos;t be displayed)
                  </Label>
                </div>

                {/* Payment Notice */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    ⚠️ <strong>Demo Mode:</strong> This is a simulated donation. In production, payments are processed securely via Paystack. All donations are final and non-refundable.
                  </p>
                </div>

                <Button
                  className="w-full h-11"
                  onClick={handleProceedToInvoice}
                  disabled={!getParsedAmount() || getParsedAmount()! <= 0}
                >
                  Continue
                </Button>
              </div>
            </>
          )}

          {donationStep === "invoice" && (
            <>
              <DialogHeader>
                <DialogTitle>Confirm Donation</DialogTitle>
                <DialogDescription>Review your donation details before proceeding</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Project</span>
                    <span className="font-medium text-right max-w-[200px] truncate">
                      {project.title}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">School</span>
                    <span className="font-medium">
                      {project.schools?.school_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Donor</span>
                    <span className="font-medium">
                      {isAnonymous ? "Anonymous" : user?.full_name || "You"}
                    </span>
                  </div>
                  <hr />
                  <div className="flex justify-between text-lg">
                    <span className="font-medium">Amount</span>
                    <span className="font-bold">
                      {formatCurrency(getParsedAmount())}
                    </span>
                  </div>
                </div>

                {/* Final Notice */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    🔒 Your payment will be securely processed by Paystack. By confirming, you agree that this donation is <strong>final and non-refundable</strong>.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setDonationStep("amount")}
                  >
                    Back
                  </Button>
                  <Button className="flex-1" onClick={handleConfirmDonation}>
                    Confirm & Pay
                  </Button>
                </div>
              </div>
            </>
          )}

          {donationStep === "processing" && (
            <div className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="font-medium">Processing your donation via Paystack...</p>
              <p className="text-sm text-muted-foreground">
                Please wait while we securely process your payment
              </p>
            </div>
          )}

          {donationStep === "success" && (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <PartyPopper className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Thank you for your support!</h3>
              <p className="text-muted-foreground mb-2">
                Your donation of {formatCurrency(getParsedAmount())} to {project.title} has been successfully processed.
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                A confirmation receipt has been sent to your email. This donation is final and processed via Paystack.
              </p>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDonationModal(false);
                    router.push("/donations");
                  }}
                >
                  View Receipt
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setShowDonationModal(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <Skeleton className="h-8 w-8 rounded" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
      <Skeleton className="aspect-video w-full" />
      <div className="px-4 py-5 space-y-4">
        <Skeleton className="h-7 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
