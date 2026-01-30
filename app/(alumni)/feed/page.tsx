"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bell,
  Menu,
  Bookmark,
  BookmarkCheck,
  School,
  Heart,
  LogOut,
  User,
  Settings,
  HelpCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import type { AlumniUser, Project, School as SchoolType } from "@/lib/supabase/database.types";

interface ProjectWithSchool extends Project {
  schools: {
    school_name: string;
    logo_url: string | null;
    location: string;
  } | null;
  isBookmarked?: boolean;
}

function FeedPageContent() {
  const [activeTab, setActiveTab] = useState("my-school");
  const [projects, setProjects] = useState<ProjectWithSchool[]>([]);
  const [mySchoolProjects, setMySchoolProjects] = useState<ProjectWithSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AlumniUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Show welcome message based on URL params
  useEffect(() => {
    const welcome = searchParams.get("welcome");
    if (welcome === "signup") {
      toast.success("Welcome to BackED! 🎉", {
        description: "Start exploring projects from your school.",
      });
      // Clear the param from URL
      router.replace("/feed");
    } else if (welcome === "complete") {
      toast.success("Profile completed! 🎉", {
        description: "You're all set to start supporting projects.",
      });
      // Clear the param from URL
      router.replace("/feed");
    }
  }, [searchParams, router]);

  // Fetch user data and projects
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Get current user
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        // Allow browsing without auth
        await fetchAllProjects();
        setLoading(false);
        return;
      }

      // Get alumni user profile
      const { data: alumniUser } = await supabase
        .from("alumni_users")
        .select("*")
        .eq("user_id", authUser.id)
        .single();

      if (alumniUser) {
        setUser(alumniUser);

        // Get bookmarked project IDs
        const { data: bookmarks } = await supabase
          .from("alumni_bookmarks")
          .select("project_id")
          .eq("alumni_user_id", alumniUser.id);

        if (bookmarks) {
          setBookmarkedIds(new Set(bookmarks.map((b) => b.project_id)));
        }

        // Get unread notification count
        const { count } = await supabase
          .from("alumni_notifications")
          .select("*", { count: "exact", head: true })
          .eq("alumni_user_id", alumniUser.id)
          .eq("is_read", false);

        setUnreadCount(count || 0);

        // Fetch my school projects
        if (alumniUser.school_id) {
          await fetchMySchoolProjects(alumniUser.school_id);
        }
      }

      await fetchAllProjects();
      setLoading(false);
    };

    fetchData();
  }, [supabase]);

  const fetchAllProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select(
        `
        *,
        schools (
          school_name,
          logo_url,
          location
        )
      `
      )
      .in("status", ["active", "funded"])
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching projects:", error);
      return;
    }

    setProjects(data || []);
  };

  const fetchMySchoolProjects = async (schoolId: string) => {
    const { data, error } = await supabase
      .from("projects")
      .select(
        `
        *,
        schools (
          school_name,
          logo_url,
          location
        )
      `
      )
      .eq("school_id", schoolId)
      .in("status", ["active", "funded"])
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching my school projects:", error);
      return;
    }

    setMySchoolProjects(data || []);
  };

  const handleBookmark = async (projectId: string) => {
    if (!user) {
      toast.error("Please login to save projects", {
        action: {
          label: "Login",
          onClick: () => router.push("/login"),
        },
      });
      return;
    }

    const isBookmarked = bookmarkedIds.has(projectId);

    if (isBookmarked) {
      // Remove bookmark
      const { error } = await supabase
        .from("alumni_bookmarks")
        .delete()
        .eq("alumni_user_id", user.id)
        .eq("project_id", projectId);

      if (error) {
        toast.error("Failed to remove bookmark");
        return;
      }

      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
      toast.success("Removed from saved");
    } else {
      // Add bookmark
      const { error } = await supabase.from("alumni_bookmarks").insert({
        alumni_user_id: user.id,
        project_id: projectId,
      });

      if (error) {
        toast.error("Failed to save project");
        return;
      }

      setBookmarkedIds((prev) => new Set(prev).add(projectId));
      toast.success("Project saved!");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <Image
            src="/BackED Black.png"
            alt="BackED"
            width={100}
            height={32}
            className="dark:invert"
          />

          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Hamburger Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <SheetHeader>
                  <SheetTitle className="text-left">Menu</SheetTitle>
                </SheetHeader>

                {user ? (
                  <div className="mt-6">
                    {/* Profile Section */}
                    <div className="flex items-center gap-3 pb-4 border-b">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.profile_picture_url || ""} />
                        <AvatarFallback>
                          {user.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <nav className="mt-4 space-y-1">
                      <Link href="/profile">
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                        >
                          <User className="mr-3 h-4 w-4" />
                          My Profile
                        </Button>
                      </Link>
                      <Link href="/saved">
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                        >
                          <Bookmark className="mr-3 h-4 w-4" />
                          Saved Projects
                        </Button>
                      </Link>
                      <Link href="/followed-schools">
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                        >
                          <Heart className="mr-3 h-4 w-4" />
                          Schools I Follow
                        </Button>
                      </Link>
                      <Link href="/donations">
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                        >
                          <School className="mr-3 h-4 w-4" />
                          Donation History
                        </Button>
                      </Link>

                      <div className="py-2">
                        <hr />
                      </div>

                      <Link href="/settings">
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                        >
                          <Settings className="mr-3 h-4 w-4" />
                          Settings
                        </Button>
                      </Link>
                      <Link href="/help">
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                        >
                          <HelpCircle className="mr-3 h-4 w-4" />
                          Help & Support
                        </Button>
                      </Link>
                      <Link href="/about">
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                        >
                          <Info className="mr-3 h-4 w-4" />
                          About BackED
                        </Button>
                      </Link>

                      <div className="py-2">
                        <hr />
                      </div>

                      <Button
                        variant="ghost"
                        className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={handleLogout}
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        Log Out
                      </Button>
                    </nav>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    <p className="text-muted-foreground">
                      Sign in to save projects and donate
                    </p>
                    <Link href="/login">
                      <Button className="w-full">Login</Button>
                    </Link>
                    <Link href="/signup">
                      <Button variant="outline" className="w-full">
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Feed Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <div className="sticky top-[57px] z-40 bg-background border-b border-border">
          <TabsList className="w-full h-12 rounded-none bg-transparent p-0">
            <TabsTrigger
              value="my-school"
              className="flex-1 h-full rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
            >
              My School
            </TabsTrigger>
            <TabsTrigger
              value="all-schools"
              className="flex-1 h-full rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
            >
              All Schools
            </TabsTrigger>
          </TabsList>
        </div>

        {/* My School Feed */}
        <TabsContent value="my-school" className="flex-1 mt-0 p-4">
          <ScrollArea className="h-[calc(100vh-180px)]">
            {loading ? (
              <ProjectCardsSkeleton />
            ) : !user?.school_id ? (
              <EmptyState
                title="No school connected"
                description="Your school isn't on BackED yet. Browse all schools to find projects to support."
                action={
                  <Button onClick={() => setActiveTab("all-schools")}>
                    Browse All Schools
                  </Button>
                }
              />
            ) : mySchoolProjects.length === 0 ? (
              <EmptyState
                title="No projects yet"
                description="Your school hasn't posted any projects yet. Check back later!"
              />
            ) : (
              <div className="space-y-4 pb-4">
                {mySchoolProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isBookmarked={bookmarkedIds.has(project.id)}
                    onBookmark={() => handleBookmark(project.id)}
                    formatCurrency={formatCurrency}
                    getProgress={getProgress}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* All Schools Feed */}
        <TabsContent value="all-schools" className="flex-1 mt-0 p-4">
          <ScrollArea className="h-[calc(100vh-180px)]">
            {loading ? (
              <ProjectCardsSkeleton />
            ) : projects.length === 0 ? (
              <EmptyState
                title="No projects available"
                description="There are no active projects at the moment. Check back later!"
              />
            ) : (
              <div className="space-y-4 pb-4">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isBookmarked={bookmarkedIds.has(project.id)}
                    onBookmark={() => handleBookmark(project.id)}
                    formatCurrency={formatCurrency}
                    getProgress={getProgress}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Project Card Component
function ProjectCard({
  project,
  isBookmarked,
  onBookmark,
  formatCurrency,
  getProgress,
}: {
  project: ProjectWithSchool;
  isBookmarked: boolean;
  onBookmark: () => void;
  formatCurrency: (amount: number | null) => string;
  getProgress: (current: number | null, target: number | null) => number;
}) {
  const progress = getProgress(project.current_amount, project.target_amount);

  return (
    <Link href={`/project/${project.id}`}>
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
                  {project.schools.school_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium truncate max-w-[100px]">
                {project.schools.school_name}
              </span>
            </div>
          )}

          {/* Bookmark Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBookmark();
            }}
            className="absolute top-2 right-2 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors"
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-5 w-5 text-amber-500 fill-amber-500" />
            ) : (
              <Bookmark className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-base mb-1 line-clamp-1">
            {project.title}
          </h3>
          {project.schools && (
            <p className="text-sm text-muted-foreground mb-2">
              {project.schools.school_name}
            </p>
          )}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {project.description}
          </p>

          {/* Progress */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                {formatCurrency(project.current_amount)}
              </span>
              <span className="text-muted-foreground">
                of {formatCurrency(project.target_amount)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{project.backers_count || 0} backers</span>
              {project.days_remaining !== null && project.days_remaining > 0 && (
                <span>{project.days_remaining} days left</span>
              )}
            </div>
          </div>

          {/* Tags */}
          {project.category && project.category.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {project.category.slice(0, 3).map((cat) => (
                <Badge key={cat} variant="secondary" className="text-xs">
                  {cat}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<ProjectCardsSkeleton />}>
      <FeedPageContent />
    </Suspense>
  );
}

// Empty State Component
function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <School className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-[250px] mb-4">
        {description}
      </p>
      {action}
    </div>
  );
}

// Skeleton Loading
function ProjectCardsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-xl overflow-hidden"
        >
          <Skeleton className="aspect-video w-full" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
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
