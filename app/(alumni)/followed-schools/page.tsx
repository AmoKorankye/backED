"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Heart,
  HeartOff,
  MapPin,
  Users,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import type { School } from "@/lib/supabase/database.types";

interface FollowedSchool extends School {
  follow_id: string;
  followed_at: string;
  project_count?: number;
}

export default function FollowedSchoolsPage() {
  const [schools, setSchools] = useState<FollowedSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [alumniUserId, setAlumniUserId] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchFollowedSchools = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        // Get alumni user
        const { data: alumniUser } = await supabase
          .from("alumni_users")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!alumniUser) {
          // User is authenticated but has no alumni profile - complete signup
          router.push("/signup");
          return;
        }

        setAlumniUserId(alumniUser.id);

        // Fetch followed schools with school details
        const { data: follows, error } = await supabase
          .from("alumni_followed_schools")
          .select(
            `
            id,
            created_at,
            schools (*)
          `
          )
          .eq("alumni_user_id", alumniUser.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching followed schools:", error);
          toast.error("Failed to load followed schools");
          return;
        }

        // Transform and get project counts
        const transformedSchools: FollowedSchool[] = await Promise.all(
          (follows || [])
            .filter((f: any) => f.schools)
            .map(async (f: any) => {
              // Get project count for each school
              const { count } = await supabase
                .from("projects")
                .select("*", { count: "exact", head: true })
                .eq("school_id", f.schools.id)
                .eq("status", "active");

              return {
                ...f.schools,
                follow_id: f.id,
                followed_at: f.created_at,
                project_count: count || 0,
              };
            })
        );

        setSchools(transformedSchools);
      } catch (err) {
        console.error("Unexpected error loading followed schools:", err);
        toast.error("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchFollowedSchools();
  }, [supabase, router]);

  const handleUnfollow = async (schoolId: string, followId: string) => {
    const { error } = await supabase
      .from("alumni_followed_schools")
      .delete()
      .eq("id", followId);

    if (error) {
      toast.error("Failed to unfollow school");
      return;
    }

    setSchools((prev) => prev.filter((s) => s.id !== schoolId));
    toast.success("Unfollowed school");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-lg">Schools I Follow</h1>
            {schools.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {schools.length} school{schools.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Schools List */}
      <ScrollArea className="h-[calc(100vh-64px)]">
        {loading ? (
          <SchoolsSkeleton />
        ) : schools.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Heart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No schools followed</h3>
            <p className="text-muted-foreground text-sm max-w-[250px] mb-4">
              Follow schools to get notified about their new projects.
            </p>
            <Link href="/feed">
              <Button>Browse Schools</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {schools.map((school) => (
              <div
                key={school.id}
                className="px-4 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex gap-3">
                  <Avatar className="h-14 w-14 rounded-xl flex-shrink-0">
                    <AvatarImage src={school.logo_url || ""} />
                    <AvatarFallback className="rounded-xl text-lg">
                      {school.school_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">
                      {school.school_name}
                    </h3>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{school.location}</span>
                    </div>

                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {school.project_count} active project
                        {school.project_count !== 1 ? "s" : ""}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Following since {formatDate(school.followed_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-pink-500 hover:text-pink-600 hover:bg-pink-50"
                      onClick={() => handleUnfollow(school.id, school.follow_id)}
                    >
                      <HeartOff className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function SchoolsSkeleton() {
  return (
    <div className="divide-y divide-border">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="px-4 py-4 flex gap-3">
          <Skeleton className="h-14 w-14 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  );
}
