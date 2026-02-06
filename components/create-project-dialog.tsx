"use client";

import { useState, useRef } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Upload, X } from "lucide-react";

interface Challenge {
  id: string;
  challenge_text: string;
}

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  challenges: Challenge[];
  onSuccess: () => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  schoolId,
  challenges,
  onSuccess,
}: CreateProjectDialogProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [overview, setOverview] = useState("");
  const [motivation, setMotivation] = useState("");
  const [objectives, setObjectives] = useState("");
  const [scope, setScope] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [selectedChallenge, setSelectedChallenge] = useState<string>("");
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);
  const [newChallengeText, setNewChallengeText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ 
    title?: string; 
    description?: string; 
    overview?: string;
    motivation?: string;
    objectives?: string;
    scope?: string;
    targetAmount?: string;
    newChallenge?: string;
    image?: string 
  }>({});
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setOverview("");
    setMotivation("");
    setObjectives("");
    setScope("");
    setTargetAmount("");
    setSelectedChallenge("");
    setIsCreatingChallenge(false);
    setNewChallengeText("");
    setImage(null);
    setImagePreview(null);
    setErrors({});
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, image: "Image must be less than 5MB" }));
        return;
      }

      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        setErrors((prev) => ({ ...prev, image: "Only JPEG, PNG, and WebP images are allowed" }));
        return;
      }

      setImage(file);
      setErrors((prev) => ({ ...prev, image: undefined }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validate = (): boolean => {
    const newErrors: { 
      title?: string; 
      description?: string; 
      overview?: string;
      motivation?: string;
      objectives?: string;
      scope?: string;
      targetAmount?: string;
      newChallenge?: string;
      image?: string 
    } = {};

    if (!title.trim()) newErrors.title = "Title is required";
    if (!description.trim()) newErrors.description = "Description is required";
    if (description.length > 500) newErrors.description = "Description must be less than 500 characters";
    if (!overview.trim()) newErrors.overview = "Project overview is required";
    if (overview.length > 1000) newErrors.overview = "Overview must be less than 1000 characters";
    if (!motivation.trim()) newErrors.motivation = "Project motivation is required";
    if (motivation.length > 1000) newErrors.motivation = "Motivation must be less than 1000 characters";
    if (!objectives.trim()) newErrors.objectives = "Objectives are required";
    if (objectives.length > 1000) newErrors.objectives = "Objectives must be less than 1000 characters";
    if (!scope.trim()) newErrors.scope = "Project scope is required";
    if (scope.length > 1000) newErrors.scope = "Scope must be less than 1000 characters";
    if (!targetAmount.trim()) newErrors.targetAmount = "Target amount is required";
    if (targetAmount && isNaN(parseFloat(targetAmount))) newErrors.targetAmount = "Please enter a valid amount";
    if (targetAmount && parseFloat(targetAmount) <= 0) newErrors.targetAmount = "Amount must be greater than 0";
    if (isCreatingChallenge && !newChallengeText.trim()) newErrors.newChallenge = "Challenge text is required";
    if (isCreatingChallenge && newChallengeText.length > 500) newErrors.newChallenge = "Challenge must be less than 500 characters";
    if (!image) newErrors.image = "Image is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate unique ID for the project
      const projectId = crypto.randomUUID();

      // Upload image
      let imageUrl = null;
      if (image) {
        const fileExt = image.name.split(".").pop();
        const fileName = `${projectId}.${fileExt}`;
        const filePath = `${fileName}`;

        // Use upsert to replace existing file if it exists
        const { error: uploadError } = await supabase.storage
          .from("project-images")
          .upload(filePath, image, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error("Failed to upload image", {
            description: uploadError.message || "Please try again.",
          });
          setSubmitting(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("project-images")
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Create new challenge if needed
      let challengeId = (selectedChallenge && selectedChallenge !== "none") ? selectedChallenge : null;
      if (isCreatingChallenge && newChallengeText.trim()) {
        const newChallengeId = crypto.randomUUID();
        const { error: challengeError } = await supabase
          .from("challenges")
          .insert({
            id: newChallengeId,
            school_id: schoolId,
            challenge_text: newChallengeText.trim(),
          });

        if (challengeError) {
          console.error("Challenge creation error:", challengeError);
          toast.error("Failed to create challenge", {
            description: challengeError.message || "Please try again.",
          });
          setSubmitting(false);
          return;
        }

        challengeId = newChallengeId;
      }

      // Create project
      const { error: insertError } = await supabase
        .from("projects")
        .insert({
          id: projectId,
          user_id: user.id,
          school_id: schoolId,
          title: title.trim(),
          description: description.trim(),
          overview: overview.trim(),
          motivation: motivation.trim(),
          objectives: objectives.trim(),
          scope: scope.trim(),
          target_amount: parseFloat(targetAmount),
          image_url: imageUrl,
          challenge_id: challengeId,
          type: "project",
        });

      if (insertError) throw insertError;

      toast.success("Project created successfully!");
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error("Error creating project:", err);
      toast.error("Failed to create project", {
        description: "Please try again or contact support.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create New Project</DialogTitle>
          <DialogDescription>
            Add a new project to showcase your school&apos;s initiatives
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="project-title">
              Project Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              placeholder="Enter project title"
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Target Amount */}
          <div className="space-y-2">
            <Label htmlFor="project-target">
              Target Amount (GH₵) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-target"
              type="number"
              min="0"
              step="0.01"
              value={targetAmount}
              onChange={(e) => {
                setTargetAmount(e.target.value);
                if (errors.targetAmount) setErrors((prev) => ({ ...prev, targetAmount: undefined }));
              }}
              placeholder="e.g., 5000"
            />
            {errors.targetAmount && (
              <p className="text-xs text-destructive">{errors.targetAmount}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="project-description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              placeholder="Describe your project (2-3 lines recommended)"
              rows={3}
            />
            <div className="flex justify-between">
              {errors.description ? (
                <p className="text-xs text-destructive">{errors.description}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Keep it concise for better display</p>
              )}
              <p className="text-xs text-muted-foreground">{description.length}/500</p>
            </div>
          </div>

          {/* Project Overview */}
          <div className="space-y-2">
            <Label htmlFor="project-overview">
              Project Overview <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="project-overview"
              value={overview}
              onChange={(e) => {
                setOverview(e.target.value);
                if (errors.overview) setErrors((prev) => ({ ...prev, overview: undefined }));
              }}
              placeholder="Provide a detailed overview of the project"
              rows={4}
            />
            <div className="flex justify-between">
              {errors.overview && (
                <p className="text-xs text-destructive">{errors.overview}</p>
              )}
              <p className="text-xs text-muted-foreground">{overview.length}/1000</p>
            </div>
          </div>

          {/* Project Motivation */}
          <div className="space-y-2">
            <Label htmlFor="project-motivation">
              Project Motivation <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="project-motivation"
              value={motivation}
              onChange={(e) => {
                setMotivation(e.target.value);
                if (errors.motivation) setErrors((prev) => ({ ...prev, motivation: undefined }));
              }}
              placeholder="Explain why this project is important"
              rows={4}
            />
            <div className="flex justify-between">
              {errors.motivation && (
                <p className="text-xs text-destructive">{errors.motivation}</p>
              )}
              <p className="text-xs text-muted-foreground">{motivation.length}/1000</p>
            </div>
          </div>

          {/* Objectives */}
          <div className="space-y-2">
            <Label htmlFor="project-objectives">
              Objectives <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="project-objectives"
              value={objectives}
              onChange={(e) => {
                setObjectives(e.target.value);
                if (errors.objectives) setErrors((prev) => ({ ...prev, objectives: undefined }));
              }}
              placeholder="List the key objectives of this project"
              rows={4}
            />
            <div className="flex justify-between">
              {errors.objectives && (
                <p className="text-xs text-destructive">{errors.objectives}</p>
              )}
              <p className="text-xs text-muted-foreground">{objectives.length}/1000</p>
            </div>
          </div>

          {/* Scope of the Project */}
          <div className="space-y-2">
            <Label htmlFor="project-scope">
              Scope of the Project <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="project-scope"
              value={scope}
              onChange={(e) => {
                setScope(e.target.value);
                if (errors.scope) setErrors((prev) => ({ ...prev, scope: undefined }));
              }}
              placeholder="Define the boundaries and extent of this project"
              rows={4}
            />
            <div className="flex justify-between">
              {errors.scope && (
                <p className="text-xs text-destructive">{errors.scope}</p>
              )}
              <p className="text-xs text-muted-foreground">{scope.length}/1000</p>
            </div>
          </div>

          {/* Challenge Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Challenge (Optional)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsCreatingChallenge(!isCreatingChallenge);
                  setSelectedChallenge("");
                  setNewChallengeText("");
                  setErrors((prev) => ({ ...prev, newChallenge: undefined }));
                }}
              >
                {isCreatingChallenge ? "Select Existing" : "Create New"}
              </Button>
            </div>

            {isCreatingChallenge ? (
              <div className="space-y-2">
                <Textarea
                  id="new-challenge"
                  value={newChallengeText}
                  onChange={(e) => {
                    setNewChallengeText(e.target.value);
                    if (errors.newChallenge) setErrors((prev) => ({ ...prev, newChallenge: undefined }));
                  }}
                  placeholder="Describe the challenge this project addresses"
                  rows={3}
                />
                <div className="flex justify-between">
                  {errors.newChallenge && (
                    <p className="text-xs text-destructive">{errors.newChallenge}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{newChallengeText.length}/500</p>
                </div>
              </div>
            ) : challenges.length > 0 ? (
              <Select
                value={selectedChallenge}
                onValueChange={setSelectedChallenge}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a challenge or leave empty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Challenge</SelectItem>
                  {challenges.map((challenge) => (
                    <SelectItem key={challenge.id} value={challenge.id}>
                      {challenge.challenge_text.substring(0, 50)}
                      {challenge.challenge_text.length > 50 ? "..." : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                No existing challenges. Click &quot;Create New&quot; to add one.
              </p>
            )}
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>
              Project Image <span className="text-destructive">*</span>
            </Label>
            {imagePreview ? (
              <div className="relative aspect-video rounded-lg overflow-hidden border">
                <Image
                  src={imagePreview}
                  alt="Project preview"
                  fill
                  className="object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload an image
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPEG, PNG, or WebP (max 5MB)
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageSelect}
            />
            {errors.image && (
              <p className="text-xs text-destructive">{errors.image}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Project"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
