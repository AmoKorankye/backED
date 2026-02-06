"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Bookmark,
  BookmarkX,
  School,
} from "lucide-react";
import { toast } from "sonner";
import type { Project } from "@/lib/supabase/database.types";

interface BookmarkedProject extends Project {
  schools: {
    school_name: string;
    logo_url: string | null;
    location: string;
  } | null;
  bookmark_id: string;
  bookmarked_at: string;
}

export default function SavedProjectsPage() {
  const [projects, setProjects] = useState<BookmarkedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [alumniUserId, setAlumniUserId] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchSavedProjects = async () => {
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

        // Fetch bookmarked projects with project and school details
        const { data: bookmarks, error } = await supabase
          .from("alumni_bookmarks")
          .select(
            `
            id,
            created_at,
            projects (
              *,
              schools (
                school_name,
                logo_url,
                location
              )
            )
          `
          )
          .eq("alumni_user_id", alumniUser.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching saved projects:", error);
          toast.error("Failed to load saved projects");
          return;
        }

      // Transform data
      const transformedProjects: BookmarkedProject[] = (bookmarks || [])
        .filter((b: any) => b.projects)
        .map((b: any) => ({
          ...b.projects,
          bookmark_id: b.id,
          bookmarked_at: b.created_at,
        }));

      setProjects(transformedProjects);
      } catch (err) {
        console.error("Unexpected error loading saved projects:", err);
        toast.error("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchSavedProjects();
  }, [supabase, router]);

  const handleRemoveBookmark = async (projectId: string, bookmarkId: string) => {
    const { error } = await supabase
      .from("alumni_bookmarks")
      .delete()
      .eq("id", bookmarkId);

    if (error) {
      toast.error("Failed to remove bookmark");
      return;
    }

    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    toast.success("Removed from saved");
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "₵0";
    return `₵${amount.toLocaleString()}`;
  };

  const getProgress = (current: number | null, target: number | null) => {
    if (!current || !target || target === 0) return 0;
    return Math.min((current / target) * 100, 100);
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
            <h1 className="font-semibold text-lg">Saved Projects</h1>
            {projects.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {projects.length} project{projects.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Projects List */}
      <ScrollArea className="h-[calc(100vh-64px)]">
        {loading ? (
          <ProjectsSkeleton />
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bookmark className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No saved projects</h3>
            <p className="text-muted-foreground text-sm max-w-[250px] mb-4">
              Save projects you&apos;re interested in to easily find them later.
            </p>
            <Link href="/feed">
              <Button>Browse Projects</Button>
            </Link>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
              >
                <Link href={`/project/${project.id}`}>
                  {/* Project Image */}
                  <div className="relative aspect-video bg-muted">
                    {project.image_url ? (
                      <Image
                        src={project.image_url}
                        alt={project.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <School className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}

                    {/* School Badge */}
                    {project.schools && (
                      <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={project.schools.logo_url || ""} />
                          <AvatarFallback className="text-[10px]">
                            {project.schools.school_name
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium truncate max-w-[100px]">
                          {project.schools.school_name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-base mb-1 line-clamp-1">
                      {project.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {project.description}
                    </p>

                    {/* Progress */}
                    <div className="space-y-2">
                      <Progress
                        value={getProgress(
                          project.current_amount,
                          project.target_amount
                        )}
                        className="h-2"
                      />
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">
                          {formatCurrency(project.current_amount)}
                        </span>
                        <span className="text-muted-foreground">
                          of {formatCurrency(project.target_amount)}
                        </span>
                      </div>
                    </div>

                    {/* Tags */}
                    {project.category && project.category.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {project.category.slice(0, 3).map((cat) => (
                          <Badge
                            key={cat}
                            variant="secondary"
                            className="text-xs"
                          >
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>

                {/* Remove Button */}
                <div className="px-4 pb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={() =>
                      handleRemoveBookmark(project.id, project.bookmark_id)
                    }
                  >
                    <BookmarkX className="h-4 w-4 mr-2" />
                    Remove from saved
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function ProjectsSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-xl overflow-hidden"
        >
          <Skeleton className="aspect-video w-full" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
