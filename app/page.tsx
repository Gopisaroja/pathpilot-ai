"use client";

import { useCallback, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Home,
  Lightbulb,
  Loader2,
  Map,
  Menu,
  Mic,
  Star,
  Target,
  Upload,
  X,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface ResumeAnalysis {
  score: number;
  missingSkills: string[];
  improvements: string[];
  aiRewrittenBullets: string[];
}

interface RoadmapItem {
  year: string;
  milestone: string;
  skills: string[];
  action: string;
}

interface StudyPlannerItem {
  day: string;
  topic: string;
  task: string;
}

interface ProjectItem {
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tech: string;
  description: string;
}

interface MockInterviewItem {
  id: number;
  question: string;
  hint: string;
  answer: string;
}

interface CareerAnalysisResponse {
  careerReadinessScore: number;
  resumeAnalysis: ResumeAnalysis;
  roadmap: RoadmapItem[];
  studyPlanner: StudyPlannerItem[];
  projects: ProjectItem[];
  mockInterviews: MockInterviewItem[];
}

type TabId =
  | "resume-analyzer"
  | "career-dashboard"
  | "career-roadmap"
  | "study-planner"
  | "project-recommender"
  | "mock-interview";

interface TabConfig {
  id: TabId;
  label: string;
  emoji: string;
  hero?: boolean;
}

/* ─── Constants ─────────────────────────────────────────────────────────── */

const TABS: TabConfig[] = [
  { id: "resume-analyzer", label: "Resume Analyzer", emoji: "⭐", hero: true },
  { id: "career-dashboard", label: "Career Dashboard", emoji: "🏠" },
  { id: "career-roadmap", label: "Career Roadmap", emoji: "🎯" },
  { id: "study-planner", label: "Study Planner", emoji: "📚" },
  { id: "project-recommender", label: "Project Recommender", emoji: "💡" },
  { id: "mock-interview", label: "Mock Interview", emoji: "🎤" },
];

const ACADEMIC_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

const TAB_EMPTY_LABELS: Record<TabId, string> = {
  "resume-analyzer": "Resume Analyzer",
  "career-dashboard": "Career Dashboard",
  "career-roadmap": "Career Roadmap",
  "study-planner": "Study Planner",
  "project-recommender": "Project Recommender",
  "mock-interview": "Mock Interview",
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

function scoreBarColor(score: number): string {
  if (score >= 75) return "bg-emerald-400";
  if (score >= 50) return "bg-yellow-400";
  return "bg-red-400";
}

function difficultyStyles(difficulty: ProjectItem["difficulty"]): string {
  switch (difficulty) {
    case "Easy":
      return "bg-emerald-400/10 text-emerald-400 border-emerald-400/30";
    case "Medium":
      return "bg-yellow-400/10 text-yellow-400 border-yellow-400/30";
    case "Hard":
      return "bg-red-400/10 text-red-400 border-red-400/30";
  }
}

function extractPdfText(buffer: ArrayBuffer): string {
  const raw = new TextDecoder("latin1").decode(new Uint8Array(buffer));
  const parts: string[] = [];
  const regex = /\((?:\\.|[^\\)])*\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    const text = match[0]
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\");
    if (text.trim().length > 1) parts.push(text);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

async function readResumeFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "txt") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read text file"));
      reader.readAsText(file);
    });
  }

  if (ext === "pdf") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const buffer = reader.result as ArrayBuffer;
        const text = extractPdfText(buffer);
        if (!text) {
          reject(new Error("Could not extract text from PDF"));
          return;
        }
        resolve(text);
      };
      reader.onerror = () => reject(new Error("Failed to read PDF file"));
      reader.readAsArrayBuffer(file);
    });
  }

  throw new Error("Unsupported file type");
}

/* ─── Sub-components ────────────────────────────────────────────────────── */

function EmptyState({ tabName }: { tabName: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-[#1E2A45] bg-[#121829] p-12 text-center">
      <p className="max-w-md text-slate-400">
        Run the Career Analysis Pipeline to see your{" "}
        <span className="text-slate-300">{tabName}</span>
      </p>
      <p className="mt-4 flex items-center gap-1 text-sm text-indigo-400">
        Fill in your profile above and click the CTA
        <ArrowRight className="h-4 w-4" />
      </p>
    </div>
  );
}

function ResumeAnalyzerView({ data }: { data: CareerAnalysisResponse }) {
  const { resumeAnalysis } = data;
  const color = scoreColor(resumeAnalysis.score);

  return (
    <div className="space-y-8">
      <div className="flex items-end gap-2">
        <span className={`text-8xl font-bold leading-none ${color}`}>
          {resumeAnalysis.score}
        </span>
        <span className="mb-3 text-2xl text-slate-500">/100</span>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Missing Skills
        </h3>
        <div className="flex flex-wrap gap-2">
          {resumeAnalysis.missingSkills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-sm text-red-400"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Improvements
        </h3>
        <div className="space-y-3">
          {resumeAnalysis.improvements.map((item, i) => (
            <div
              key={i}
              className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-4 text-slate-300"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          AI Rewritten Bullets
        </h3>
        <div className="space-y-3">
          {resumeAnalysis.aiRewrittenBullets.map((bullet, i) => (
            <div
              key={i}
              className="relative rounded-lg border border-[#1E2A45] border-l-4 border-l-emerald-400 bg-[#121829] p-4 pl-5"
            >
              <div className="mb-2 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400">
                  AI-Enhanced ✦
                </span>
              </div>
              <p className="text-slate-300">{bullet}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Match Score vs Dream Role
          </h3>
          <span className={`text-lg font-bold ${color}`}>
            {resumeAnalysis.score}%
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full rounded-full transition-all duration-700 ${scoreBarColor(resumeAnalysis.score)}`}
            style={{ width: `${resumeAnalysis.score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function CareerDashboardView({ data }: { data: CareerAnalysisResponse }) {
  const stats = [
    {
      icon: Map,
      value: data.roadmap.length,
      label: "Roadmap Years",
    },
    {
      icon: Calendar,
      value: data.studyPlanner.length,
      label: "Study Days Planned",
    },
    {
      icon: Lightbulb,
      value: data.projects.length,
      label: "Projects Suggested",
    },
    {
      icon: Mic,
      value: data.mockInterviews.length,
      label: "Interview Questions",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center rounded-xl border border-[#1E2A45] bg-[#121829] p-10">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Career Readiness Score
        </p>
        <div className="relative flex h-40 w-40 items-center justify-center">
          <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="#1E2A45"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${data.careerReadinessScore * 2.64} 264`}
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#4f46e5" />
              </linearGradient>
            </defs>
          </svg>
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-5xl font-bold text-transparent">
            {data.careerReadinessScore}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ icon: Icon, value, label }) => (
          <div
            key={label}
            className="rounded-xl border border-[#1E2A45] bg-[#121829] p-6"
          >
            <Icon className="mb-3 h-6 w-6 text-indigo-400" />
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="mt-1 text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CareerRoadmapView({ data }: { data: CareerAnalysisResponse }) {
  return (
    <div className="relative pl-8">
      <div className="absolute bottom-0 left-[15px] top-0 w-0.5 bg-indigo-600" />
      <div className="space-y-8">
        {data.roadmap.map((item, i) => (
          <div
            key={i}
            className="animate-fade-in-up relative opacity-0"
            style={{ animationDelay: `${i * 100}ms`, animationFillMode: "forwards" }}
          >
            <div className="absolute -left-8 top-1 h-3 w-3 rounded-full border-2 border-indigo-600 bg-[#090D16]" />
            <div className="rounded-xl border border-[#1E2A45] bg-[#121829] p-6">
              <span className="mb-2 inline-block rounded-full bg-indigo-600/20 px-3 py-0.5 text-xs font-semibold text-indigo-400">
                {item.year}
              </span>
              <h3 className="mt-2 text-lg font-bold text-white">{item.milestone}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md bg-slate-700 px-2 py-1 text-xs text-slate-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm italic text-slate-400">{item.action}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudyPlannerView({ data }: { data: CareerAnalysisResponse }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#1E2A45]">
      <table className="w-full min-w-[500px] text-left text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <th className="px-4 py-3 font-semibold">Day</th>
            <th className="px-4 py-3 font-semibold">Topic</th>
            <th className="px-4 py-3 font-semibold">Task</th>
          </tr>
        </thead>
        <tbody>
          {data.studyPlanner.map((row, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? "bg-[#121829]" : "bg-[#0F1423]"}
            >
              <td className="px-4 py-3">
                <span className="inline-block rounded-full bg-indigo-600/20 px-3 py-0.5 text-xs font-semibold text-indigo-400">
                  {row.day}
                </span>
              </td>
              <td className="px-4 py-3 font-medium text-white">{row.topic}</td>
              <td className="px-4 py-3 text-slate-300">{row.task}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectRecommenderView({ data }: { data: CareerAnalysisResponse }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.projects.map((project, i) => (
        <div
          key={i}
          className="flex flex-col rounded-xl border border-[#1E2A45] bg-[#121829] p-6"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <h3 className="font-bold text-white">{project.title}</h3>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${difficultyStyles(project.difficulty)}`}
            >
              {project.difficulty}
            </span>
          </div>
          <p className="mb-2 text-xs text-slate-400">{project.tech}</p>
          <p className="mb-4 flex-1 text-sm text-slate-300">{project.description}</p>
          <button
            type="button"
            className="self-start text-sm text-indigo-400 transition-colors hover:text-indigo-300"
          >
            View Details →
          </button>
        </div>
      ))}
    </div>
  );
}

function MockInterviewView({ data }: { data: CareerAnalysisResponse }) {
  return (
    <div className="space-y-3">
      {data.mockInterviews.map((item) => (
        <details
          key={item.id}
          className="group overflow-hidden rounded-xl border border-[#1E2A45] bg-[#121829] transition-all"
        >
          <summary className="flex cursor-pointer items-center gap-3 p-5 transition-colors hover:bg-[#1a2236]">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-bold text-indigo-400">
              {item.id}
            </span>
            <span className="flex-1 font-medium text-white">{item.question}</span>
            <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-3 border-t border-[#1E2A45] px-5 pb-5 pt-4">
            <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-4">
              <p className="mb-1 text-xs font-semibold text-yellow-400">💡 Hint:</p>
              <p className="text-sm text-slate-300">{item.hint}</p>
            </div>
            <div className="rounded-lg border border-[#1E2A45] bg-[#0F1423] p-4">
              <p className="mb-1 text-xs font-semibold text-emerald-400">
                ✓ Reference Answer:
              </p>
              <p className="text-sm text-slate-300">{item.answer}</p>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>("resume-analyzer");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [year, setYear] = useState("3rd Year");
  const [department, setDepartment] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [skills, setSkills] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CareerAnalysisResponse | null>(null);

  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "txt") {
      setResumeError("Only .pdf and .txt files are supported");
      return;
    }

    setResumeError(null);
    try {
      const text = await readResumeFile(file);
      setResumeText(text);
      setResumeFileName(file.name);
    } catch {
      setResumeError("Failed to read resume file. Try a .txt export.");
      setResumeFileName(null);
      setResumeText("");
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile]
  );

  const runAnalysis = async () => {
    if (!department.trim() || !company.trim() || !role.trim()) {
      setError("Please fill in Department, Dream Company, and Target Role.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          department,
          company,
          role,
          skills,
          resumeText,
        }),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      const data = (await res.json()) as CareerAnalysisResponse;
      setAnalysis(data);
      setActiveTab("resume-analyzer");
      setSidebarOpen(false);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectTab = (id: TabId) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  const renderTabContent = () => {
    if (!analysis) {
      return <EmptyState tabName={TAB_EMPTY_LABELS[activeTab]} />;
    }

    switch (activeTab) {
      case "resume-analyzer":
        return <ResumeAnalyzerView data={analysis} />;
      case "career-dashboard":
        return <CareerDashboardView data={analysis} />;
      case "career-roadmap":
        return <CareerRoadmapView data={analysis} />;
      case "study-planner":
        return <StudyPlannerView data={analysis} />;
      case "project-recommender":
        return <ProjectRecommenderView data={analysis} />;
      case "mock-interview":
        return <MockInterviewView data={analysis} />;
    }
  };

  const inputClass =
    "w-full rounded-lg border border-[#1E2A45] bg-[#0F1423] px-4 py-2.5 text-slate-300 placeholder-slate-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";

  return (
    <div className="flex min-h-screen bg-[#090D16]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[#1E2A45] bg-[#0F1423] transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-6 lg:block">
          <div>
            <h1 className="text-xl font-bold">
              <span className="mr-1">✈</span>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                PathPilot AI
              </span>
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              From Dream Job to Action Plan
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-slate-400 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-blue-600 font-medium text-white"
                    : "text-slate-400 hover:bg-[#121829] hover:text-slate-200"
                }`}
              >
                <span>{tab.emoji}</span>
                <span className="flex-1">{tab.label}</span>
                {tab.hero && (
                  <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    Hero
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex items-center gap-3 border-b border-[#1E2A45] bg-[#0F1423] px-4 py-3 lg:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-lg font-bold text-transparent">
            ✈ PathPilot AI
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Onboarding Input Card */}
          <div className="mb-8 rounded-xl border border-[#1E2A45] bg-[#121829] p-6">
            <h2 className="mb-6 text-lg font-semibold text-white">
              Career Profile Setup
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Academic Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className={inputClass}
                >
                  {ACADEMIC_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Dream Company
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Google"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Target Role
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Current Skills
                </label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. Python, React, SQL"
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Resume Upload
                </label>
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      fileInputRef.current?.click();
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
                    dragOver
                      ? "border-indigo-500 bg-indigo-500/5"
                      : "border-[#1E2A45] hover:border-indigo-500/50"
                  }`}
                >
                  <Upload className="mb-2 h-8 w-8 text-slate-500" />
                  <p className="text-sm text-slate-400">
                    Drag & drop your resume here, or{" "}
                    <span className="text-indigo-400">browse</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Accepts .pdf and .txt
                  </p>
                  {resumeFileName && (
                    <p className="mt-3 text-sm font-medium text-emerald-400">
                      ✓ {resumeFileName} loaded
                    </p>
                  )}
                  {resumeError && (
                    <p className="mt-2 text-sm text-red-400">{resumeError}</p>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => void runAnalysis()}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  Trigger Career Analysis Pipeline
                  <ChevronRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>

          {/* Loading / Error states */}
          {loading && (
            <p className="mb-6 text-center text-sm text-slate-400">
              Analyzing your career profile...
            </p>
          )}

          {error && (
            <div className="mb-6 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-center text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Active tab view */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              {activeTab === "resume-analyzer" && (
                <FileText className="h-5 w-5 text-indigo-400" />
              )}
              {activeTab === "career-dashboard" && (
                <Home className="h-5 w-5 text-indigo-400" />
              )}
              {activeTab === "career-roadmap" && (
                <Target className="h-5 w-5 text-indigo-400" />
              )}
              {activeTab === "study-planner" && (
                <BookOpen className="h-5 w-5 text-indigo-400" />
              )}
              {activeTab === "project-recommender" && (
                <Briefcase className="h-5 w-5 text-indigo-400" />
              )}
              {activeTab === "mock-interview" && (
                <Mic className="h-5 w-5 text-indigo-400" />
              )}
              <h2 className="text-xl font-bold text-white">
                {TABS.find((t) => t.id === activeTab)?.emoji}{" "}
                {TAB_EMPTY_LABELS[activeTab]}
              </h2>
            </div>
            {renderTabContent()}
          </section>
        </main>
      </div>
    </div>
  );
}
