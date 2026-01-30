"use client";

import { useState } from "react";
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
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

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

interface SchoolData {
  id: string;
  admin_name: string;
  school_name: string;
  location: string;
  population: string;
  staff_count: string;
  overview: string;
}

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  school: SchoolData;
  onSuccess: () => void;
}

interface FormData {
  adminName: string;
  schoolName: string;
  location: string;
  population: string;
  staffCount: string;
  overview: string;
}

export function ProfileEditModal({
  open,
  onOpenChange,
  user,
  school,
  onSuccess,
}: ProfileEditModalProps) {
  const supabase = createClient();

  const [formData, setFormData] = useState<FormData>({
    adminName: school.admin_name,
    schoolName: school.school_name,
    location: school.location,
    population: school.population,
    staffCount: school.staff_count,
    overview: school.overview,
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof FormData]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (name: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.adminName.trim()) errors.adminName = "Name is required";
    if (!formData.schoolName.trim()) errors.schoolName = "School name is required";
    if (!formData.location.trim()) errors.location = "Location is required";
    if (!formData.population) errors.population = "Population is required";
    if (!formData.staffCount) errors.staffCount = "Staff count is required";
    if (!formData.overview.trim()) errors.overview = "Overview is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      const { error } = await supabase
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
        .eq("id", school.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error("Failed to update profile", {
        description: "Please try again or contact support.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset form data when closing
      setFormData({
        adminName: school.admin_name,
        schoolName: school.school_name,
        location: school.location,
        population: school.population,
        staffCount: school.staff_count,
        overview: school.overview,
      });
      setFormErrors({});
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Edit Profile</DialogTitle>
          <DialogDescription>
            Update your school information and profile details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Admin Name */}
          <div className="space-y-2">
            <Label htmlFor="adminName">
              Your Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="adminName"
              name="adminName"
              value={formData.adminName}
              onChange={handleInputChange}
              placeholder="Enter your name"
            />
            {formErrors.adminName && (
              <p className="text-xs text-destructive">{formErrors.adminName}</p>
            )}
          </div>

          {/* School Name */}
          <div className="space-y-2">
            <Label htmlFor="schoolName">
              School Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="schoolName"
              name="schoolName"
              value={formData.schoolName}
              onChange={handleInputChange}
              placeholder="Enter school name"
            />
            {formErrors.schoolName && (
              <p className="text-xs text-destructive">{formErrors.schoolName}</p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">
              Location <span className="text-destructive">*</span>
            </Label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="City, Region, Country"
            />
            {formErrors.location && (
              <p className="text-xs text-destructive">{formErrors.location}</p>
            )}
          </div>

          {/* Population */}
          <div className="space-y-2">
            <Label htmlFor="population">
              Student Population <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.population}
              onValueChange={(value) => handleSelectChange("population", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select population range" />
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
              <p className="text-xs text-destructive">{formErrors.population}</p>
            )}
          </div>

          {/* Staff Count */}
          <div className="space-y-2">
            <Label htmlFor="staffCount">
              Staff Count <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.staffCount}
              onValueChange={(value) => handleSelectChange("staffCount", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select staff count range" />
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
              <p className="text-xs text-destructive">{formErrors.staffCount}</p>
            )}
          </div>

          {/* Overview */}
          <div className="space-y-2">
            <Label htmlFor="overview">
              School Overview <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="overview"
              name="overview"
              value={formData.overview}
              onChange={handleInputChange}
              placeholder="Tell us about your school..."
              rows={4}
            />
            {formErrors.overview && (
              <p className="text-xs text-destructive">{formErrors.overview}</p>
            )}
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
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
  );
}
