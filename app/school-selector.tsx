"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { School, Search, Check, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

interface SchoolOption {
  id: string;
  school_name: string;
  location: string;
  logo_url: string | null;
}

interface SchoolSelectorProps {
  schools: SchoolOption[];
  userId: string;
}

export function SchoolSelector({ schools, userId }: SchoolSelectorProps) {
  const [search, setSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const filteredSchools = schools.filter(
    (school) =>
      school.school_name.toLowerCase().includes(search.toLowerCase()) ||
      school.location.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveSchool = async () => {
    if (!selectedSchool) {
      toast.error("Please select a school");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("alumni_users")
      .update({
        school_id: selectedSchool.id,
        school_name: selectedSchool.school_name,
      })
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating school:", error);
      toast.error("Failed to save school");
      setSaving(false);
      return;
    }

    toast.success("School saved successfully!");
    router.push("/feed");
    router.refresh();
  };

  return (
    <div className="w-full max-w-md mb-8">
      <div className="bg-card border-2 border-primary rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <School className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Select Your School</h2>
            <p className="text-sm text-muted-foreground">
              Choose your alma mater to see relevant projects
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search schools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Schools List */}
        <ScrollArea className="h-[200px] mb-4 border rounded-lg">
          {filteredSchools.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
              <School className="h-8 w-8 mb-2" />
              <p className="text-sm">No schools found</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredSchools.map((school) => (
                <button
                  key={school.id}
                  onClick={() => setSelectedSchool(school)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                    selectedSchool?.id === school.id
                      ? "bg-primary/10 border border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={school.logo_url || ""} />
                    <AvatarFallback className="text-xs bg-primary/10">
                      {school.school_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{school.school_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {school.location}
                    </p>
                  </div>
                  {selectedSchool?.id === school.id && (
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Selected School Display */}
        {selectedSchool && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg mb-4">
            <Check className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{selectedSchool.school_name}</span>
          </div>
        )}

        {/* Continue Button */}
        <Button
          onClick={handleSaveSchool}
          disabled={!selectedSchool || saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Continue to Feed →"
          )}
        </Button>
      </div>
    </div>
  );
}
