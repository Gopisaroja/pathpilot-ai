import { NextRequest, NextResponse } from "next/server";

export interface ResumeAnalysis {
  score: number;
  missingSkills: string[];
  improvements: string[];
  aiRewrittenBullets: string[];
}

export interface RoadmapItem {
  year: string;
  milestone: string;
  skills: string[];
  action: string;
}

export interface StudyPlannerItem {
  day: string;
  topic: string;
  task: string;
}

export interface ProjectItem {
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tech: string;
  description: string;
}

export interface MockInterviewItem {
  id: number;
  question: string;
  hint: string;
  answer: string;
}

export interface CareerAnalysisResponse {
  careerReadinessScore: number;
  resumeAnalysis: ResumeAnalysis;
  roadmap: RoadmapItem[];
  studyPlanner: StudyPlannerItem[];
  projects: ProjectItem[];
  mockInterviews: MockInterviewItem[];
}

interface GenerateRequestBody {
  year: string;
  department: string;
  company: string;
  role: string;
  skills: string;
  resumeText: string;
}

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

function buildPrompt(body: GenerateRequestBody): string {
  return `You are PathPilot AI, an elite student career copilot. Analyze the student profile and resume, then return a comprehensive career action plan.

STUDENT PROFILE:
- Academic Year: ${body.year}
- Department: ${body.department}
- Dream Company: ${body.company}
- Target Role: ${body.role}
- Current Skills: ${body.skills}

RESUME TEXT:
${body.resumeText || "(No resume provided — infer gaps from profile and target role)"}

Return ONLY valid JSON matching this exact schema (no markdown, no extra keys):
{
  "careerReadinessScore": <number 0-100>,
  "resumeAnalysis": {
    "score": <number 0-100>,
    "missingSkills": [<strings>],
    "improvements": [<strings>],
    "aiRewrittenBullets": [<3-5 improved resume bullet strings>]
  },
  "roadmap": [
    { "year": "<year label>", "milestone": "<title>", "skills": [<strings>], "action": "<concrete action>" }
  ],
  "studyPlanner": [
    { "day": "<Day 1 etc>", "topic": "<topic>", "task": "<specific task>" }
  ],
  "projects": [
    { "title": "<name>", "difficulty": "Easy"|"Medium"|"Hard", "tech": "<stack>", "description": "<2-3 sentences>" }
  ],
  "mockInterviews": [
    { "id": <number>, "question": "<question>", "hint": "<hint>", "answer": "<reference answer>" }
  ]
}

Requirements:
- careerReadinessScore reflects overall fit for ${body.role} at ${body.company}
- resumeAnalysis.score is resume quality vs target role
- roadmap: 4-6 milestones aligned to ${body.year} student timeline toward ${body.role}
- studyPlanner: exactly 7 days of focused learning
- projects: exactly 6 portfolio projects (mix of Easy/Medium/Hard)
- mockInterviews: exactly 5 questions for ${body.role} at ${body.company}
- Be specific, actionable, and tailored to ${body.department} students`;
}

function parseGeminiJson(raw: string): CareerAnalysisResponse {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned) as CareerAnalysisResponse;

  if (
    typeof parsed.careerReadinessScore !== "number" ||
    !parsed.resumeAnalysis ||
    !Array.isArray(parsed.roadmap) ||
    !Array.isArray(parsed.studyPlanner) ||
    !Array.isArray(parsed.projects) ||
    !Array.isArray(parsed.mockInterviews)
  ) {
    throw new Error("Invalid response structure from Gemini");
  }

  return parsed;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as GenerateRequestBody;

    if (!body.year || !body.department || !body.company || !body.role) {
      return NextResponse.json(
        { error: "Missing required fields: year, department, company, role" },
        { status: 400 }
      );
    }

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: buildPrompt(body) }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return NextResponse.json(
        { error: "Failed to generate career analysis" },
        { status: 502 }
      );
    }

    const geminiData = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const textContent =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!textContent) {
      return NextResponse.json(
        { error: "Empty response from Gemini" },
        { status: 502 }
      );
    }

    const analysis = parseGeminiJson(textContent);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Generate route error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
