"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { User } from "@supabase/supabase-js";
import { ArrowLeft, Calendar, Trash2, Loader2, Edit, Target, Wallet, Megaphone, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: string;
  title: string;
  description: string;
  overview?: string | null;
  motivation?: string | null;
  objectives?: string | null;
  scope?: string | null;
  target_amount?: number | null;
  image_url: string | null;
  type: "project" | "challenge";
  challenge_id: string | null;
  created_at: string;
  updated_at: string;
  school_id?: string | null;
}

interface ProjectUpdate {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

interface ProjectDetailContentProps {
  user: User;
  project: Project;
}

export function ProjectDetailContent({ user, project: initialProject }: ProjectDetailContentProps) {
  const router = useRouter();
  const supabase = createClient();
  const [project, setProject] = useState(initialProject);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingUpdate, setSendingUpdate] = useState(false);
  const [totalDonations, setTotalDonations] = useState(0);
  const [projectUpdates, setProjectUpdates] = useState<ProjectUpdate[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // Update form state
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");

  // Edit form state
  const [editTitle, setEditTitle] = useState(project.title);
  const [editDescription, setEditDescription] = useState(project.description);
  const [editOverview, setEditOverview] = useState(project.overview || "");
  const [editMotivation, setEditMotivation] = useState(project.motivation || "");
  const [editObjectives, setEditObjectives] = useState(project.objectives || "");
  const [editScope, setEditScope] = useState(project.scope || "");
  const [editTargetAmount, setEditTargetAmount] = useState(project.target_amount?.toString() || "");

  useEffect(() => {
    // Fetch total donations for this project from both tables
    const fetchDonations = async () => {
      // Fetch from alumni_donations (alumni app donations)
      const { data: alumniDonations, error: alumniError } = await supabase
        .from("alumni_donations")
        .select("amount")
        .eq("project_id", project.id)
        .in("status", ["completed", "completed_demo"]);

      // Fetch from donation_history (legacy/direct donations)
      const { data: historyDonations, error: historyError } = await supabase
        .from("donation_history")
        .select("amount")
        .eq("project_id", project.id);

      if (alumniError) {
        console.error("Error fetching alumni donations:", alumniError);
      }
      if (historyError) {
        console.error("Error fetching donation history:", historyError);
      }

      // Combine totals from both sources
      const alumniTotal = alumniDonations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
      const historyTotal = historyDonations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
      setTotalDonations(alumniTotal + historyTotal);
    };

    fetchDonations();
    
    // Set up realtime subscriptions to update donations from both tables
    const alumniChannel = supabase
      .channel(`alumni-donations-${project.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alumni_donations',
          filter: `project_id=eq.${project.id}`
        },
        () => {
          fetchDonations();
        }
      )
      .subscribe();

    const historyChannel = supabase
      .channel(`donation-history-${project.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'donation_history',
          filter: `project_id=eq.${project.id}`
        },
        () => {
          fetchDonations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alumniChannel);
      supabase.removeChannel(historyChannel);
    };
  }, [supabase, project.id]);

  // Fetch school ID and project updates
  useEffect(() => {
    const fetchSchoolAndUpdates = async () => {
      // Get school ID for the current user
      const { data: school } = await supabase
        .from("schools")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (school) {
        setSchoolId(school.id);
      }

      // Fetch project updates
      const { data: updates } = await supabase
        .from("project_updates")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false });

      if (updates) {
        setProjectUpdates(updates);
      }
    };

    fetchSchoolAndUpdates();
  }, [supabase, user.id, project.id]);

  const handleShareUpdate = async () => {
    if (!updateTitle.trim() || !updateMessage.trim()) {
      toast.error("Please fill in both title and message");
      return;
    }

    if (!schoolId) {
      toast.error("School information not found. Please refresh the page.");
      return;
    }

    setSendingUpdate(true);

    try {
      // Create the project update
      const { data: updateData, error: updateError } = await supabase
        .from("project_updates")
        .insert({
          project_id: project.id,
          school_id: schoolId,
          title: updateTitle.trim(),
          message: updateMessage.trim(),
        })
        .select()
        .single();

      if (updateError) {
        console.error("Error inserting project update:", updateError);
        throw new Error(updateError.message || "Failed to create update");
      }

      // Get all alumni who have donated to this project or are following the school
      const { data: donors, error: donorsError } = await supabase
        .from("alumni_donations")
        .select("alumni_user_id")
        .eq("project_id", project.id)
        .in("status", ["completed", "completed_demo"]);

      if (donorsError) {
        console.error("Error fetching donors:", donorsError);
      }

      const { data: followers, error: followersError } = await supabase
        .from("alumni_followed_schools")
        .select("alumni_user_id")
        .eq("school_id", schoolId);

      if (followersError) {
        console.error("Error fetching followers:", followersError);
      }

      // Combine and deduplicate alumni IDs
      const donorIds = donors?.map(d => d.alumni_user_id) || [];
      const followerIds = followers?.map(f => f.alumni_user_id) || [];
      const allAlumniIds = [...new Set([...donorIds, ...followerIds])];

      // Create notifications for all relevant alumni
      if (allAlumniIds.length > 0) {
        const notifications = allAlumniIds.map(alumniId => ({
          alumni_user_id: alumniId,
          project_id: project.id,
          type: "update" as const,
          title: updateTitle.trim(),
          message: updateMessage.trim(),
          metadata: { update_id: updateData.id },
        }));

        const { error: notifError } = await supabase.from("alumni_notifications").insert(notifications);
        if (notifError) {
          console.error("Error creating notifications:", notifError);
          // Don't throw - update was still created
        }
      }

      // Update local state
      setProjectUpdates([updateData, ...projectUpdates]);
      setUpdateTitle("");
      setUpdateMessage("");
      setShowUpdateDialog(false);

      toast.success(`Update shared${allAlumniIds.length > 0 ? ` with ${allAlumniIds.length} alumni` : ""}!`);
    } catch (err) {
      console.error("Error sharing update:", err);
      toast.error(err instanceof Error ? err.message : "Failed to share update");
    } finally {
      setSendingUpdate(false);
    }
  };

  const targetAmount = project.target_amount || 0;
  const progressPercentage = targetAmount > 0 ? Math.min((totalDonations / targetAmount) * 100, 100) : 0;

  const handleDelete = async () => {
    setDeleting(true);

    try {
      if (project.image_url) {
        const imagePath = project.image_url.split("/").pop();
        if (imagePath) {
          await supabase.storage
            .from("project-images")
            .remove([imagePath]);
        }
      }

      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id);

      if (error) throw error;

      toast.success("Project deleted successfully");
      router.push("/dashboard");
    } catch (err) {
      console.error("Error deleting project:", err);
      toast.error("Failed to delete project");
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from("projects")
        .update({
          title: editTitle.trim(),
          description: editDescription.trim(),
          overview: editOverview.trim() || null,
          motivation: editMotivation.trim() || null,
          objectives: editObjectives.trim() || null,
          scope: editScope.trim() || null,
          target_amount: editTargetAmount ? parseFloat(editTargetAmount) : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", project.id);

      if (error) throw error;

      setProject({
        ...project,
        title: editTitle.trim(),
        description: editDescription.trim(),
        overview: editOverview.trim() || null,
        motivation: editMotivation.trim() || null,
        objectives: editObjectives.trim() || null,
        scope: editScope.trim() || null,
        target_amount: editTargetAmount ? parseFloat(editTargetAmount) : null,
      });

      toast.success("Project updated successfully");
      setShowEditDialog(false);
    } catch (err) {
      console.error("Error updating project:", err);
      toast.error("Failed to update project");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <div className="px-12 md:px-24 lg:px-48">
      <main className="py-6 max-w-5xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Project Image & Progress */}
          <div className="lg:col-span-1 space-y-6">
            {/* Project Image - Smaller */}
            {project.image_url && (
              <Card className="overflow-hidden">
                <div className="relative aspect-square w-full max-h-[200px]">
                  <Image
                    src={project.image_url}
                    alt={project.title}
                    fill
                    className="object-cover"
                  />
                </div>
              </Card>
            )}

            {/* Funding Progress Dial */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Funding Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative w-32 h-32 mb-4">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="45"
                      stroke="currentColor"
                      strokeWidth="10"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="45"
                      stroke="currentColor"
                      strokeWidth="10"
                      fill="none"
                      strokeLinecap="round"
                      className="text-primary transition-all duration-500"
                      style={{
                        strokeDasharray: circumference,
                        strokeDashoffset: strokeDashoffset,
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{Math.round(progressPercentage)}%</span>
                  </div>
                </div>

                <div className="w-full space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Wallet className="h-4 w-4" />
                      Raised
                    </span>
                    <span className="font-medium text-primary">{formatCurrency(totalDonations)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      Target
                    </span>
                    <span className="font-medium">{formatCurrency(targetAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => setShowUpdateDialog(true)}
              >
                <Megaphone className="h-4 w-4 mr-2" />
                Share Update
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowEditDialog(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Recent Updates */}
            {projectUpdates.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Megaphone className="h-5 w-5" />
                    Recent Updates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {projectUpdates.slice(0, 3).map((update) => (
                    <div key={update.id} className="border-l-2 border-primary pl-3 py-1">
                      <p className="font-medium text-sm">{update.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{update.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(update.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Project Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-2xl">{project.title}</CardTitle>
                      <Badge variant={project.type === "challenge" ? "default" : "secondary"}>
                        {project.type === "challenge" ? "Challenge" : "Project"}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Created on {formatDate(project.created_at)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{project.description}</p>
              </CardContent>
            </Card>

            {(project.overview || project.motivation || project.objectives || project.scope) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {project.overview && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-base">Project Overview</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{project.overview}</p>
                    </div>
                  )}

                  {project.motivation && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-base">Motivation</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{project.motivation}</p>
                    </div>
                  )}

                  {project.objectives && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-base">Objectives</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{project.objectives}</p>
                    </div>
                  )}

                  {project.scope && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-base">Scope</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{project.scope}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update your project details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-target">Target Amount (GH₵)</Label>
              <Input
                id="edit-target"
                type="number"
                min="0"
                step="0.01"
                value={editTargetAmount}
                onChange={(e) => setEditTargetAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-overview">Overview</Label>
              <Textarea
                id="edit-overview"
                value={editOverview}
                onChange={(e) => setEditOverview(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-motivation">Motivation</Label>
              <Textarea
                id="edit-motivation"
                value={editMotivation}
                onChange={(e) => setEditMotivation(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-objectives">Objectives</Label>
              <Textarea
                id="edit-objectives"
                value={editObjectives}
                onChange={(e) => setEditObjectives(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-scope">Scope</Label>
              <Textarea
                id="edit-scope"
                value={editScope}
                onChange={(e) => setEditScope(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {project.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{project.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Update Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Share Project Update
            </DialogTitle>
            <DialogDescription>
              Share an update with alumni who have donated or are following your school. They will receive a notification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="update-title">Update Title</Label>
              <Input
                id="update-title"
                placeholder="e.g., Milestone Reached!"
                value={updateTitle}
                onChange={(e) => setUpdateTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="update-message">Message</Label>
              <Textarea
                id="update-message"
                placeholder="Share the latest news, progress, or gratitude message..."
                value={updateMessage}
                onChange={(e) => setUpdateMessage(e.target.value)}
                rows={4}
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                📢 This update will be sent to all alumni who have donated to this project or are following your school.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)} disabled={sendingUpdate}>
              Cancel
            </Button>
            <Button onClick={handleShareUpdate} disabled={sendingUpdate || !updateTitle.trim() || !updateMessage.trim()}>
              {sendingUpdate ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Share Update
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
