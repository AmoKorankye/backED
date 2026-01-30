"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, FolderPlus, Calendar } from "lucide-react";

interface Project {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  type: "project" | "challenge";
  challenge_id: string | null;
  created_at: string;
  target_amount?: number | null;
  total_raised?: number | null;
}

interface ProjectsFeedProps {
  projects: Project[];
  onProjectClick: (projectId: string) => void;
  onCreateProject: () => void;
}

export function ProjectsFeed({
  projects,
  onProjectClick,
  onCreateProject,
}: ProjectsFeedProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;

    const query = searchQuery.toLowerCase();
    return projects.filter(
      (project) =>
        project.title.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        project.type.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Search */}
      <div className="flex-shrink-0 space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Projects</h2>
          <Button
            size="sm"
            onClick={onCreateProject}
            className="gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Project</span>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/30 border-muted focus:bg-background transition-colors"
          />
        </div>
      </div>

      {/* Projects Feed */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1">
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FolderPlus className="h-8 w-8 text-muted-foreground" />
            </div>
            {searchQuery ? (
              <>
                <h3 className="font-medium text-lg mb-1">No results found</h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  No projects match &quot;{searchQuery}&quot;. Try a different search term.
                </p>
              </>
            ) : (
              <>
                <h3 className="font-medium text-lg mb-1">No projects yet</h3>
                <p className="text-muted-foreground text-sm mb-4 max-w-xs">
                  Create your first project to showcase your school&apos;s initiatives
                </p>
                <Button onClick={onCreateProject} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Project
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProjects.map((project, index) => (
              <Card
                key={project.id}
                className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:ring-1 hover:ring-primary/20 animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => onProjectClick(project.id)}
              >
                {/* Project Image */}
                <div className="relative aspect-[16/9] bg-muted overflow-hidden">
                  {project.image_url ? (
                    <Image
                      src={project.image_url}
                      alt={project.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-muted to-muted/50">
                      <FolderPlus className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                  )}
                  
                  {/* Challenge Badge */}
                  {project.type === "challenge" && (
                    <Badge className="absolute top-3 left-3 bg-primary/90 backdrop-blur-sm shadow-sm">
                      Challenge
                    </Badge>
                  )}
                </div>

                {/* Project Content */}
                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {project.description}
                  </p>

                  {/* Funding Progress Bar */}
                  {typeof project.target_amount === "number" && project.target_amount > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Funding Progress</span>
                        <span className="text-[10px] font-semibold text-primary">
                          {Math.round(
                            Math.min(
                              ((project.total_raised || 0) / project.target_amount) * 100,
                              100
                            )
                          )}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-2 bg-primary transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              ((project.total_raised || 0) / project.target_amount) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(project.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button (Mobile) */}
      <Button
        size="icon"
        onClick={onCreateProject}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg sm:hidden z-50 animate-fade-in"
        aria-label="Create new project"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
