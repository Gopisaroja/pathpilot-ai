export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

/* ---------------- TYPES ---------------- */

interface GenerateRequestBody {
  year: string;
  department: string;
  company: string;
  role: string;
  skills: string;
  resumeText: string;
}

/* ---------------- CONFIG ---------------- */

const MODEL = "gemini-1.5-flash";

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/* ---------------- PROMPT ---------------- */

function buildPrompt(body: GenerateRequestBody): string {
  return `
You are PathPilot AI, a FAANG-level resume evaluator.

RULES:
- Be strict and realistic
- No generic advice
- Focus: DSA, System Design, Projects, ATS
- If resume is weak → low score

OUTPUT MUST BE VALID JSON ONLY.

Keep response under 2000 tokens.

STUDENT:
Year: ${body.year}
Dept: ${body.department}
Company: ${body.company}
Role: ${body.role}
Skills: ${body.skills}

RESUME:
${body.resumeText || "EMPTY"}

Return JSON only:
{
  "careerReadinessScore": number,
  "resumeAnalysis": {
    "score": number,
    "missingSkills": string[],
    "improvements": string[],
    "aiRewrittenBullets": string[]
  },
  "roadmap": [],
  "studyPlanner": [],
  "projects": [],
  "mockInterviews": []
}
`;
}

/* ---------------- FALLBACK ---------------- */

function fallbackResponse() {
  return {
    careerReadinessScore: 50,
    resumeAnalysis: {
      score: 50,
      missingSkills: ["Data Structures", "System Design", "GitHub"],
      improvements: ["Improve resume structure", "Add real projects"],
      aiRewrittenBullets: [
        "Built Python-based problem solving projects",
        "Practiced DSA regularly on coding platforms",
        "Improved logical thinking through hands-on coding"
      ]
    },
    roadmap: [
      {
        phase: "DSA Phase",
        milestone: "Master Arrays to Graphs",
        skills: ["Arrays", "Linked List", "Trees"],
        action: "Solve 50–100 LeetCode problems"
      }
    ],
    studyPlanner: [
      { day: "Day 1", topic: "Arrays", task: "Solve 10 problems" },
      { day: "Day 2", topic: "Strings", task: "Practice problems" },
      { day: "Day 3", topic: "Linked List", task: "Implement + problems" }
    ],
    projects: [
      {
        title: "Resume Analyzer",
        difficulty: "Medium",
        tech: "Next.js + API",
        description: "AI-based resume scoring system"
      }
    ],
    mockInterviews: [
      {
        id: 1,
        question: "Explain time complexity of sorting algorithms",
        hint: "Compare best/worst case",
        answer: "Depends on algorithm like merge sort O(n log n)"
      }
    ],
    fallback: true
  };
}

/* ---------------- SAFE PARSER ---------------- */

function safeParse(text: string) {
  try {
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1) return fallbackResponse();

    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return fallbackResponse();
  }
}

/* ---------------- GEMINI CALL ---------------- */

async function callGemini(payload: any, apiKey: string) {
  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) return null;

    return data;
  } catch {
    return null;
  }
}

/* ---------------- MAIN API ---------------- */

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    const body: GenerateRequestBody = await request.json();

    if (!apiKey) return NextResponse.json(fallbackResponse(), { status: 200 });

    if (!body?.resumeText || body.resumeText.length < 20) {
      body.resumeText = "EMPTY RESUME";
    }

    const payload = {
      contents: [{ parts: [{ text: buildPrompt(body) }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    };

    const gemini = await callGemini(payload, apiKey);

    const text =
      gemini?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return NextResponse.json(safeParse(text));
  } catch {
    return NextResponse.json(fallbackResponse(), { status: 200 });
  }
}