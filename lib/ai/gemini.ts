import { GoogleGenerativeAI } from "@google/generative-ai";

// Check if API key is configured
const API_KEY = process.env.GEMINI_API_KEY;
const isConfigured = !!API_KEY;

const genAI = isConfigured ? new GoogleGenerativeAI(API_KEY) : null;

export const geminiModel = genAI?.getGenerativeModel({
  model: "gemini-2.0-flash",
}) ?? null;

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        if (
          errorMsg.includes("api key") ||
          errorMsg.includes("invalid") ||
          errorMsg.includes("permission")
        ) {
          throw error; // Don't retry auth errors
        }
      }
      
      if (i < maxRetries) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

export interface ProjectSummaryResult {
  quickSummary: string;
  keyHighlights: string[];
  impactStatement: string;
  fundingInsight: string;
}

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

/**
 * Generate an AI summary for a school project
 */
export async function generateProjectSummary(project: {
  title: string;
  description: string;
  overview: string | null;
  motivation: string | null;
  objectives: string | null;
  scope: string | null;
  category: string[] | null;
  target_amount: number | null;
  current_amount: number | null;
  backers_count: number | null;
  days_remaining: number | null;
  schoolName: string;
  schoolLocation: string;
}): Promise<ProjectSummaryResult> {
  const fundingProgress = project.target_amount
    ? Math.round(
        ((project.current_amount || 0) / project.target_amount) * 100
      )
    : 0;

  // Fallback response if AI is not available
  const fallbackResponse: ProjectSummaryResult = {
    quickSummary: project.description.slice(0, 250) + (project.description.length > 250 ? "..." : ""),
    keyHighlights: [
      `Project by ${project.schoolName}${project.schoolLocation ? `, ${project.schoolLocation}` : ""}`,
      `Goal: GH₵${project.target_amount?.toLocaleString() || "N/A"}`,
      `${fundingProgress}% funded with ${project.backers_count || 0} backers`,
      ...(project.category && project.category.length > 0 ? [`Categories: ${project.category.slice(0, 2).join(", ")}`] : []),
    ].slice(0, 4),
    impactStatement:
      "Your donation directly supports educational infrastructure and student development at this school.",
    fundingInsight: `This project has raised GH₵${(project.current_amount || 0).toLocaleString()} of its GH₵${project.target_amount?.toLocaleString()} goal.${project.days_remaining ? ` ${project.days_remaining} days remaining.` : ""}`,
  };

  // Return fallback if Gemini is not configured
  if (!geminiModel) {
    console.warn("Gemini API not configured, returning fallback summary");
    return fallbackResponse;
  }

  const prompt = `You are an AI assistant for BackED, a platform connecting alumni with their schools' fundraising projects in Ghana. Generate a concise, engaging summary for an alumni reading about a project they might donate to.

PROJECT DETAILS:
- Title: ${project.title}
- School: ${project.schoolName}, ${project.schoolLocation}
- Categories: ${project.category?.join(", ") || "General"}
- Funding Goal: GH₵${project.target_amount?.toLocaleString() || "N/A"}
- Raised So Far: GH₵${(project.current_amount || 0).toLocaleString()} (${fundingProgress}%)
- Backers: ${project.backers_count || 0}
- Days Remaining: ${project.days_remaining ?? "N/A"}

DESCRIPTION: ${project.description}
${project.overview ? `OVERVIEW: ${project.overview}` : ""}
${project.motivation ? `MOTIVATION: ${project.motivation}` : ""}
${project.objectives ? `OBJECTIVES: ${project.objectives}` : ""}
${project.scope ? `SCOPE: ${project.scope}` : ""}

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{
  "quickSummary": "A clear 2-3 sentence overview of what this project is about and why it matters.",
  "keyHighlights": ["highlight 1", "highlight 2", "highlight 3"],
  "impactStatement": "One sentence about the real-world impact of supporting this project.",
  "fundingInsight": "A brief note about the funding status and what a donation could help achieve."
}`;

  try {
    const result = await retryWithBackoff(
      async () => await geminiModel.generateContent(prompt),
      2,
      1000
    );
    
    const text = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps them
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

    const parsed = JSON.parse(cleaned) as ProjectSummaryResult;
    
    // Validate the response has required fields
    if (!parsed.quickSummary || !parsed.keyHighlights || !parsed.impactStatement || !parsed.fundingInsight) {
      throw new Error("Invalid AI response structure");
    }
    
    return parsed;
  } catch (error) {
    console.error("Failed to generate AI summary, using fallback:", error);
    return fallbackResponse;
  }
}

/**
 * Chat with the BackED AI assistant about projects
 */
export async function chatWithAssistant(
  messages: ChatMessage[],
  context: {
    userName: string;
    userSchool: string | null;
    userNiches: string[] | null;
    availableProjects: {
      id: string;
      title: string;
      schoolName: string;
      category: string[] | null;
      target_amount: number | null;
      current_amount: number | null;
      status: string | null;
    }[];
  }
): Promise<string> {
  // Return helpful fallback if Gemini is not configured
  if (!geminiModel) {
    return "I'm currently unavailable. Please browse the feed to discover projects, or contact support for assistance.";
  }

  const systemPrompt = `You are the BackED AI Assistant — a friendly, helpful chatbot for the BackED alumni platform. BackED connects school alumni with their alma maters' fundraising projects in Ghana.

USER CONTEXT:
- Name: ${context.userName}
- School: ${context.userSchool || "Not specified"}
- Interests: ${context.userNiches?.join(", ") || "Not specified"}

ACTIVE PROJECTS ON PLATFORM:
${context.availableProjects
  .slice(0, 10)
  .map(
    (p) =>
      `- "${p.title}" by ${p.schoolName} [${p.category?.join(", ") || "General"}] — GH₵${(p.current_amount || 0).toLocaleString()}/${p.target_amount ? "GH₵" + p.target_amount.toLocaleString() : "N/A"} raised (${p.status})`
  )
  .join("\n")}

GUIDELINES:
- Be warm, conversational, and concise (max 150 words per response).
- Help users discover projects that match their interests.
- Answer questions about the platform (donations, bookmarks, following schools, etc.).
- If asked to recommend projects, consider their school affiliation and interests.
- Encourage donations but never pressure. Be authentic and empathetic.
- Use currency format GH₵ (Ghana Cedis).
- If you don't know something specific, say so honestly.
- Do NOT generate any links or URLs — just mention project names and let the user find them in the feed.`;

  try {
    const chat = geminiModel.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "model",
          parts: [
            {
              text: "Understood! I'm the BackED AI Assistant, ready to help alumni discover and support school projects. How can I help?",
            },
          ],
        },
        ...messages.slice(0, -1).map((msg) => ({
          role: msg.role as "user" | "model",
          parts: [{ text: msg.content }],
        })),
      ],
    });

    const lastMessage = messages[messages.length - 1];
    
    const result = await retryWithBackoff(
      async () => await chat.sendMessage(lastMessage.content),
      2,
      1000
    );
    
    const responseText = result.response.text();
    
    // Validate response is not empty
    if (!responseText || responseText.trim().length === 0) {
      throw new Error("Empty response from AI");
    }
    
    return responseText;
  } catch (error) {
    console.error("Chat error:", error);
    
    // Provide contextual fallback responses based on the user's question
    const userQuestion = messages[messages.length - 1]?.content.toLowerCase() || "";
    
    if (userQuestion.includes("interest") || userQuestion.includes("match") || userQuestion.includes("recommend")) {
      return `I'm having trouble processing your request right now. To find projects matching your interests (${context.userNiches?.join(", ") || "your selected topics"}), check out the "For You" tab in the feed!`;
    }
    
    if (userQuestion.includes("donat") || userQuestion.includes("contribute") || userQuestion.includes("give")) {
      return "I'm temporarily unavailable, but you can donate by clicking any project card, then tapping 'Back This Project' at the bottom. All donations are processed securely via Paystack.";
    }
    
    if (userQuestion.includes("how") || userQuestion.includes("what") || userQuestion.includes("work")) {
      return "I'm having technical difficulties right now. For help using BackED, you can browse active projects in the feed, save projects you like, follow schools, and donate directly to campaigns. Need more help? Contact support.";
    }
    
    return "I'm temporarily unavailable. Please try again in a moment, or browse the feed to discover projects.";
  }
}

/**
 * Score how well a project matches a user's interests.
 * Returns a number 0-100.
 */
export async function scoreProjectRelevance(
  userNiches: string[],
  project: {
    title: string;
    description: string;
    category: string[] | null;
    overview: string | null;
  }
): Promise<number> {
  // Fast path: direct category match
  const projectCategories = (project.category || []).map((c) =>
    c.toLowerCase()
  );
  const userInterests = userNiches.map((n) => n.toLowerCase());

  const directMatch = userInterests.some((interest) =>
    projectCategories.some(
      (cat) => cat.includes(interest) || interest.includes(cat)
    )
  );

  if (directMatch) return 85 + Math.floor(Math.random() * 15); // 85-100

  // Return moderate score if Gemini not configured (won't penalize projects)
  if (!geminiModel) {
    // Do text-based matching as fallback
    const text = `${project.title} ${project.description} ${project.overview || ""}`.toLowerCase();
    const partialMatch = userInterests.some((interest) =>
      text.includes(interest)
    );
    return partialMatch ? 60 : 40;
  }

  // Use Gemini for semantic matching
  const prompt = `Rate how relevant this school project is to a user with these interests on a scale of 0-100. Respond with ONLY a number.

User interests: ${userNiches.join(", ")}

Project: "${project.title}"
Categories: ${project.category?.join(", ") || "None"}
Description: ${project.description.slice(0, 200)}
${project.overview ? `Overview: ${project.overview.slice(0, 200)}` : ""}

Score (0-100):`;

  try {
    const result = await retryWithBackoff(
      async () => await geminiModel.generateContent(prompt),
      1, // Only 1 retry for scoring (not critical)
      500
    );
    
    const text = result.response.text().trim();
    const score = parseInt(text.replace(/\D/g, ""));
    
    if (isNaN(score)) {
      throw new Error("Invalid score format");
    }
    
    return Math.min(Math.max(score, 0), 100);
  } catch (error) {
    console.warn("Failed to score project relevance, using text matching:", error);
    
    // Fallback to simple text matching
    const text = `${project.title} ${project.description} ${project.overview || ""}`.toLowerCase();
    const matchCount = userInterests.filter((interest) =>
      text.includes(interest)
    ).length;
    
    // Return score based on how many interests match
    if (matchCount >= 2) return 65;
    if (matchCount === 1) return 55;
    return 45;
  }
}
