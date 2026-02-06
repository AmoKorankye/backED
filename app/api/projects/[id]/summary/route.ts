import { createClient } from "@/lib/supabase/server";
import { generateProjectSummary } from "@/lib/ai/gemini";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch project with school info
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(
        `
        id, title, description, overview, motivation, objectives, scope,
        category, target_amount, current_amount, backers_count, days_remaining,
        schools (
          school_name,
          location
        )
      `
      )
      .eq("id", id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const schoolArr = project.schools as
      | { school_name: string; location: string }[]
      | null;
    const school = schoolArr?.[0] ?? null;

    const summary = await generateProjectSummary({
      title: project.title,
      description: project.description,
      overview: project.overview,
      motivation: project.motivation,
      objectives: project.objectives,
      scope: project.scope,
      category: project.category,
      target_amount: project.target_amount,
      current_amount: project.current_amount,
      backers_count: project.backers_count,
      days_remaining: project.days_remaining,
      schoolName: school?.school_name || "School",
      schoolLocation: school?.location || "",
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error generating project summary:", error);
    
    // Return a user-friendly error that the frontend can handle
    return NextResponse.json(
      { 
        error: "Unable to generate AI summary",
        message: "The AI service is temporarily unavailable. Please try again later."
      },
      { status: 503 } // Service Unavailable
    );
  }
}
