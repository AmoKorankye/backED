import { createClient } from "@/lib/supabase/server";
import { chatWithAssistant, type ChatMessage } from "@/lib/ai/gemini";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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

    const body = await request.json();
    const messages: ChatMessage[] = body.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    // Fetch alumni profile
    const { data: alumniUser } = await supabase
      .from("alumni_users")
      .select("full_name, school_name, niches")
      .eq("user_id", user.id)
      .single();

    // Fetch active projects for context
    const { data: projects } = await supabase
      .from("projects")
      .select(
        `
        id, title, category, target_amount, current_amount, status,
        schools ( school_name )
      `
      )
      .in("status", ["active", "funded"])
      .order("created_at", { ascending: false })
      .limit(15);

    const availableProjects = (projects || []).map((p) => ({
      id: p.id,
      title: p.title,
      schoolName:
        ((p.schools as { school_name: string }[] | null)?.[0])?.school_name || "School",
      category: p.category,
      target_amount: p.target_amount,
      current_amount: p.current_amount,
      status: p.status,
    }));

    const reply = await chatWithAssistant(messages, {
      userName: alumniUser?.full_name || "Alumni",
      userSchool: alumniUser?.school_name || null,
      userNiches: alumniUser?.niches || null,
      availableProjects,
    });

    return NextResponse.json({ message: reply });
  } catch (error) {
    console.error("Chat error:", error);
    
    // Return a helpful fallback message instead of a generic error
    return NextResponse.json(
      {
        message: "I'm temporarily unavailable. Please try again in a moment, or browse the feed to discover projects."
      },
      { status: 200 } // Return 200 so the chatbot can display the fallback
    );
  }
}
