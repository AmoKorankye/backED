import { createClient } from "@/lib/supabase/server";
import { scoreProjectRelevance } from "@/lib/ai/gemini";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get alumni profile with niches
    const { data: alumniUser, error: profileError } = await supabase
      .from("alumni_users")
      .select("id, niches, school_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !alumniUser) {
      return NextResponse.json(
        { error: "Alumni profile not found" },
        { status: 404 }
      );
    }

    const userNiches = alumniUser.niches || [];

    if (userNiches.length === 0) {
      // No interests set — return all projects in default order
      const { data: projects } = await supabase
        .from("projects")
        .select(
          `*, schools ( school_name, logo_url, location )`
        )
        .in("status", ["active", "funded"])
        .order("created_at", { ascending: false })
        .limit(20);

      return NextResponse.json({
        projects: (projects || []).map((p) => ({ ...p, relevanceScore: 50 })),
        personalized: false,
      });
    }

    // Fetch all active projects
    const { data: allProjects, error: projectsError } = await supabase
      .from("projects")
      .select(
        `*, schools ( school_name, logo_url, location )`
      )
      .in("status", ["active", "funded"])
      .order("created_at", { ascending: false })
      .limit(30);

    if (projectsError || !allProjects) {
      return NextResponse.json(
        { error: "Failed to fetch projects" },
        { status: 500 }
      );
    }

    // Score each project for relevance using a hybrid approach:
    // 1. Direct category matching (fast, no API call)
    // 2. Boost for user's own school
    const scoredProjects = allProjects.map((project) => {
      let score = 0;

      // Category matching (primary signal)
      const projectCategories = (project.category || []).map((c: string) =>
        c.toLowerCase()
      );
      const interests = userNiches.map((n: string) => n.toLowerCase());

      const matchCount = interests.filter((interest: string) =>
        projectCategories.some(
          (cat: string) => cat.includes(interest) || interest.includes(cat)
        )
      ).length;

      if (matchCount > 0) {
        score = 60 + Math.min(matchCount * 15, 35); // 75-95 for matches
      } else {
        // Partial text match in title/description
        const text =
          `${project.title} ${project.description}`.toLowerCase();
        const partialMatch = interests.some((interest: string) =>
          text.includes(interest)
        );
        score = partialMatch ? 55 : 30;
      }

      // Boost for user's own school
      if (
        alumniUser.school_id &&
        project.school_id === alumniUser.school_id
      ) {
        score = Math.min(score + 10, 100);
      }

      // Boost for actively funded (not yet fully funded)
      if (project.status === "active" && project.days_remaining && project.days_remaining > 0) {
        score = Math.min(score + 5, 100);
      }

      return { ...project, relevanceScore: score };
    });

    // Sort by relevance score descending, then by date
    scoredProjects.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      );
    });

    return NextResponse.json({
      projects: scoredProjects.slice(0, 20),
      personalized: true,
      matchedInterests: userNiches,
    });
  } catch (error) {
    console.error("Personalized feed error:", error);
    
    // Fallback: return all active projects without personalization
    try {
      const supabase = await createClient();
      const { data: fallbackProjects } = await supabase
        .from("projects")
        .select(`*, schools ( school_name, logo_url, location )`)
        .in("status", ["active", "funded"])
        .order("created_at", { ascending: false })
        .limit(20);
      
      return NextResponse.json({
        projects: (fallbackProjects || []).map((p) => ({ ...p, relevanceScore: 50 })),
        personalized: false,
        message: "Showing all projects (personalization temporarily unavailable)"
      });
    } catch (fallbackError) {
      console.error("Fallback feed error:", fallbackError);
      return NextResponse.json(
        { error: "Failed to load feed" },
        { status: 500 }
      );
    }
  }
}
