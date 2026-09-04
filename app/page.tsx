"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";

type NavTab = "Home" | "Practice" | "Advanced" | "Dashboard" | "Feedback" | "Interview Room" | "API";
type QuestionType = "MCQ" | "Subjective" | "Numerical" | "Formula" | "Model Review" | "Case" | "Interview" | "Judgment";
type Difficulty = "Easy" | "Medium" | "Hard" | "MD";

type Question = {
  id: string;
  category: string;
  title: string;
  prompt: string;
  type: QuestionType;
  difficulty: Difficulty;
  xp: number;
  options?: string[];
  correct?: string;
  numeric?: number;
  solution: string;
  rubric: string[];
};

type Attempt = {
  id: string;
  questionId: string;
  title: string;
  category: string;
  score: number;
  correct: boolean;
  answer: string;
  createdAt: string;
};

type Store = {
  xp: number;
  attempts: Attempt[];
  bookmarks: string[];
  notes: string[];
  launchedModules: string[];
};

type NewsItem = {
  id: string;
  tag: string;
  tone: "blue" | "red" | "green" | "black";
  title: string;
  summary: string;
  time: string;
  visual: string;
};

type ShortCase = {
  id: string;
  category: string;
  title: string;
  summary: string;
  difficulty: Difficulty;
  time: string;
  tone: "blue" | "red" | "green" | "black";
};

type Module = {
  name: string;
  bucket: string;
  description: string;
  required: string;
  quickPrompt: string;
};

type Health = {
  app?: string;
  phase?: string;
  status?: string;
  safeMode?: boolean;
  modules?: number;
  keyStatus?: Record<string, boolean>;
  generatedAt?: string;
  message?: string;
};

const storeKey = "capital-forge-phase-c-open-app";
const navTabs: NavTab[] = ["Home", "Practice", "Advanced", "Dashboard", "Feedback", "Interview Room", "API"];
const baseStore: Store = { xp: 0, attempts: [], bookmarks: [], notes: [], launchedModules: [] };

const newsBank: NewsItem[] = [
  { id: "n1", tag: "Markets", tone: "blue", title: "Equities rally as inflation expectations cool", summary: "Use the move to practice discount-rate sensitivity and exit multiple compression.", time: "2h ago", visual: "📈" },
  { id: "n2", tag: "AI & Tech", tone: "black", title: "AI spending cycle raises valuation discipline questions", summary: "Compare revenue growth with cash conversion, capex intensity and terminal margins.", time: "3h ago", visual: "🤖" },
  { id: "n3", tag: "PE / M&A", tone: "red", title: "Sponsors stay selective as dry powder meets high entry multiples", summary: "A good mini-case for LBO entry leverage, value creation and downside structure.", time: "4h ago", visual: "🏦" },
  { id: "n4", tag: "Credit", tone: "green", title: "Private credit terms tighten for cyclical borrowers", summary: "Think through DSCR, covenants, cash sweep and downside recovery.", time: "5h ago", visual: "🧾" },
  { id: "n5", tag: "Macro", tone: "blue", title: "Currency volatility changes imported inflation assumptions", summary: "Build a 5-minute sensitivity around FX, gross margin and working capital.", time: "6h ago", visual: "🌐" },
  { id: "n6", tag: "Restructuring", tone: "red", title: "Highly levered borrowers face maturity-wall pressure", summary: "Practice fulcrum-security thinking and recovery waterfall logic.", time: "7h ago", visual: "⚠️" },
  { id: "n7", tag: "VC", tone: "green", title: "Growth investors demand cleaner unit economics", summary: "Move beyond TAM and focus on CAC payback, NDR, gross margin and burn multiple.", time: "8h ago", visual: "🚀" },
  { id: "n8", tag: "IB", tone: "black", title: "Boards revisit strategic alternatives in slower growth pockets", summary: "Frame a sell-side pitch: buyer universe, valuation range, timing and process risk.", time: "9h ago", visual: "📊" }
];

const caseBank: ShortCase[] = [
  { id: "c1", category: "Financial Modeling", title: "Build a 3-statement bridge", summary: "Forecast revenue, EBITDA, working capital, capex and debt paydown for a consumer company.", difficulty: "Medium", time: "45 min", tone: "blue" },
  { id: "c2", category: "Valuation", title: "DCF valuation under rate shock", summary: "Rebuild intrinsic value after WACC rises and terminal growth compresses.", difficulty: "Medium", time: "40 min", tone: "red" },
  { id: "c3", category: "M&A", title: "Buy-side acquisition screen", summary: "Assess synergy, accretion/dilution and integration risk before recommending a bid.", difficulty: "Hard", time: "60 min", tone: "green" },
  { id: "c4", category: "Private Equity", title: "Paper LBO return test", summary: "Calculate entry equity, debt paydown, exit equity value, MOIC and IRR.", difficulty: "Hard", time: "35 min", tone: "black" },
  { id: "c5", category: "Private Credit", title: "Term sheet from credit memo", summary: "Design pricing, covenants, amortization and downside protection for a borrower.", difficulty: "MD", time: "55 min", tone: "red" },
  { id: "c6", category: "VC", title: "Series B dilution and preference stack", summary: "Model post-money, option pool refresh, liquidation preference and founder dilution.", difficulty: "Medium", time: "30 min", tone: "green" },
  { id: "c7", category: "Capital Markets", title: "IPO readiness memo", summary: "Evaluate growth, margin profile, governance, market window and investor story.", difficulty: "Hard", time: "45 min", tone: "blue" },
  { id: "c8", category: "Restructuring", title: "Recovery waterfall mini-case", summary: "Allocate enterprise value across secured debt, unsecured notes and equity.", difficulty: "MD", time: "50 min", tone: "black" }
];

const modules: Module[] = [
  { name: "Recruiter Mode", bucket: "Career", description: "Score your project like an IB/PE recruiter across technical depth, clarity and proof.", required: "AI_API_KEY", quickPrompt: "Rate my finance project like a PE recruiter and give 10 improvement points." },
  { name: "MD Pressure Room", bucket: "Interview", description: "Turn any answer into a senior-level pressure round with skeptical follow-ups.", required: "AI_API_KEY", quickPrompt: "Pressure test my answer as a managing director interviewing me." },
  { name: "Deal Teardown Library", bucket: "Deals", description: "Break a deal into thesis, valuation, risks, financing and exit logic.", required: "NEWS_API_KEY + AI_API_KEY", quickPrompt: "Create a deal teardown checklist for a sponsor-to-sponsor acquisition." },
  { name: "Excel Muscle Memory", bucket: "Modeling", description: "Timed shortcut and modeling-speed drills for analyst execution.", required: "No key", quickPrompt: "Give me a 10-minute Excel shortcut sprint for financial modeling." },
  { name: "Model Error Hunter", bucket: "Modeling", description: "Find formula, sign, circularity, hardcode and assumption mistakes.", required: "AI_API_KEY", quickPrompt: "Audit this model logic for common financial modeling mistakes." },
  { name: "IC Memo Builder", bucket: "PE", description: "Turn raw investment thinking into a structured IC memo.", required: "AI_API_KEY", quickPrompt: "Convert this rough thesis into an IC memo structure." },
  { name: "Would You Invest Game", bucket: "Judgment", description: "Make invest/pass/reprice decisions and get decision-quality feedback.", required: "AI_API_KEY", quickPrompt: "Give me an investment snapshot and ask me to invest, pass or reprice." },
  { name: "Live News Question Engine", bucket: "Markets", description: "Convert market headlines into finance questions and mini-cases.", required: "NEWS_API_KEY", quickPrompt: "Turn today’s market theme into 5 valuation and credit questions." },
  { name: "Personal Weakness Graph", bucket: "Analytics", description: "Map wrong attempts to concept weakness and next drills.", required: "Supabase", quickPrompt: "Summarize my weakest finance topics from recent practice." },
  { name: "Interview Bank by Firm", bucket: "Recruiting", description: "Generate firm-style drills for banks, PE funds, Big4 and credit funds.", required: "AI_API_KEY", quickPrompt: "Give me KKR-style PE interview questions from easy to partner level." },
  { name: "Deal Math Speed Trainer", bucket: "Mental Math", description: "EV, EBITDA, leverage, IRR, MOIC, dilution and CAGR drills.", required: "No key", quickPrompt: "Create 10 deal-math speed questions with answers." },
  { name: "Investment Journal AI", bucket: "Thinking", description: "Rate your daily investment thinking and improve decision structure.", required: "AI_API_KEY", quickPrompt: "Rate this investment journal entry and make it sharper." },
  { name: "Pitchbook Simulator", bucket: "IB", description: "Build teaser, CIM sections, buyer list, valuation range and process timeline.", required: "AI_API_KEY", quickPrompt: "Create a sell-side pitchbook outline for a mid-market company." },
  { name: "LBO Paper Test", bucket: "PE", description: "30-minute paper LBO with returns bridge and debt schedule logic.", required: "No key", quickPrompt: "Give me a paper LBO test and then show the full solution." },
  { name: "Private Credit Underwriting", bucket: "Credit", description: "DSCR, covenants, recovery, pricing and downside case practice.", required: "AI_API_KEY", quickPrompt: "Create a private credit underwriting case with DSCR and covenants." },
  { name: "Founder Call Simulator", bucket: "Diligence", description: "Simulate a founder call where not every red flag is obvious.", required: "AI_API_KEY", quickPrompt: "Act like a founder. I will ask diligence questions." },
  { name: "Red Flag Detector", bucket: "Diligence", description: "Scan financial narratives for governance, cash-flow and accounting risks.", required: "FILINGS_API_KEY + AI_API_KEY", quickPrompt: "List red flags to check in a private company’s annual report." },
  { name: "Cap Table Simulator", bucket: "VC", description: "Rounds, ESOP, liquidation preference, anti-dilution and exits.", required: "No key", quickPrompt: "Create a VC cap table dilution mini-case." },
  { name: "Career Path Engine", bucket: "Career", description: "Build a weekly roadmap from finance profile to target roles.", required: "AI_API_KEY", quickPrompt: "Create a 12-week IB/PE transition plan based on my current profile." },
  { name: "Portfolio Project Tracker", bucket: "Career", description: "Track models, memos, reports and proof points for recruiters.", required: "Supabase", quickPrompt: "Design a recruiter-grade project tracker for my finance portfolio." },
  { name: "Real Filing Reader", bucket: "Research", description: "Convert filings into diligence checklists, ratios and questions.", required: "FILINGS_API_KEY", quickPrompt: "Give me a filing review checklist for a company annual report." },
  { name: "AI Mentor Personas", bucket: "Mentors", description: "Switch between IB Associate, PE VP, Credit IC, VC Partner, CFO and MD.", required: "AI_API_KEY", quickPrompt: "Coach me like a PE VP and improve my deal answer." },
  { name: "Bad Answer Rewriter", bucket: "Communication", description: "Rewrite weak interview answers into crisp top-percentile responses.", required: "AI_API_KEY", quickPrompt: "Rewrite my answer into a strong interview response." },
  { name: "Case Competition Mode", bucket: "Projects", description: "Simulate a 48-hour case with model, memo, deck and partner questions.", required: "AI_API_KEY + Supabase", quickPrompt: "Create a 48-hour PE case competition brief." },
  { name: "Daily Killer Insight", bucket: "Learning", description: "One sharp finance concept, deal lesson or modeling trick every day.", required: "AI_API_KEY / NEWS_API_KEY", quickPrompt: "Give me one killer finance insight with a mini practice question." }
];

const categories = ["All", "Accounting", "Corporate Finance", "Valuation", "Financial Modeling", "Excel", "Investment Banking", "M&A", "Private Equity", "VC", "Private Credit", "Markets", "Restructuring", "Interviews"];
const difficulties: ("All" | Difficulty)[] = ["All", "Easy", "Medium", "Hard", "MD"];
const qTypes: ("All" | QuestionType)[] = ["All", "MCQ", "Subjective", "Numerical", "Formula", "Model Review", "Case", "Interview", "Judgment"];

function rotate<T>(items: T[], by: number, count: number) {
  return Array.from({ length: Math.min(count, items.length) }, (_, i) => items[(by + i) % items.length]);
}

function questionBank(): Question[] {
  const raw: Question[] = [
    { id: "q1", category: "Valuation", title: "FCFF from EBIT", prompt: "A company has EBIT of ₹100 Cr, tax rate of 25%, D&A of ₹12 Cr, capex of ₹28 Cr and increase in NWC of ₹9 Cr. Calculate FCFF.", type: "Numerical", difficulty: "Medium", xp: 60, numeric: 50, solution: "FCFF = EBIT × (1 − tax) + D&A − capex − ΔNWC = 100 × 75% + 12 − 28 − 9 = ₹50 Cr.", rubric: ["ebit", "tax", "capex", "nwc"] },
    { id: "q2", category: "Private Equity", title: "Paper LBO logic", prompt: "You buy a company for 10.0x EBITDA. EBITDA is ₹50 Cr. Debt is 5.0x EBITDA. Exit multiple is 9.0x after 5 years and EBITDA grows to ₹90 Cr. Debt is fully repaid. Calculate exit equity and MOIC.", type: "Numerical", difficulty: "Hard", xp: 90, numeric: 3.24, solution: "Entry EV = ₹500 Cr. Debt = ₹250 Cr, sponsor equity = ₹250 Cr. Exit EV = 9.0x × ₹90 Cr = ₹810 Cr. Debt = 0, exit equity = ₹810 Cr. MOIC = 810 / 250 = 3.24x.", rubric: ["entry", "debt", "exit", "moic"] },
    { id: "q3", category: "Investment Banking", title: "EV bridge", prompt: "Which bridge is generally correct?", type: "MCQ", difficulty: "Easy", xp: 30, options: ["Equity Value + Debt + Preferred + Minority Interest − Cash", "Equity Value − Debt + Cash", "EBITDA + Debt − Cash", "Revenue × Margin"], correct: "Equity Value + Debt + Preferred + Minority Interest − Cash", solution: "Enterprise Value = Equity Value + Debt + Preferred Equity + Minority Interest − Cash and equivalents.", rubric: ["equity", "debt", "cash"] },
    { id: "q4", category: "Financial Modeling", title: "Model audit", prompt: "An analyst links revenue growth directly to EBITDA growth and keeps working capital constant even when revenue doubles. What is wrong and how would you fix it?", type: "Model Review", difficulty: "Medium", xp: 70, solution: "Revenue growth should flow through gross margin, opex, operating leverage, tax, working capital and capex. Working capital should normally scale with operating drivers like receivables, inventory and payables days.", rubric: ["working", "margin", "drivers", "capex"] },
    { id: "q5", category: "M&A", title: "Accretion dilution", prompt: "Explain why a deal can be strategically attractive but still EPS dilutive in year one.", type: "Subjective", difficulty: "Medium", xp: 55, solution: "A deal can be strategically attractive due to market access, synergies or long-term growth, but near-term EPS can be diluted due to acquisition premium, financing cost, amortization, integration expenses or low initial earnings contribution.", rubric: ["premium", "financing", "synergy", "eps"] },
    { id: "q6", category: "Private Credit", title: "DSCR underwriting", prompt: "A borrower has CFADS of ₹42 Cr and annual debt service of ₹30 Cr. Calculate DSCR and say if it is comfortable.", type: "Numerical", difficulty: "Easy", xp: 40, numeric: 1.4, solution: "DSCR = CFADS / Debt Service = 42 / 30 = 1.40x. It is acceptable in many cases but comfort depends on cyclicality, covenant level, cash buffer and downside case.", rubric: ["cfads", "debt", "service", "downside"] },
    { id: "q7", category: "VC", title: "Unit economics", prompt: "A SaaS company has CAC payback of 30 months, gross retention of 82%, NDR of 96% and high burn. Would you invest?", type: "Judgment", difficulty: "Hard", xp: 85, solution: "Likely cautious/pass unless there is a clear path to improve retention and CAC efficiency. CAC payback is long, NDR below 100% signals weak expansion, and burn increases financing risk.", rubric: ["cac", "retention", "ndr", "burn"] },
    { id: "q8", category: "Restructuring", title: "Fulcrum security", prompt: "Define fulcrum security and explain why it matters in a distressed investment case.", type: "Interview", difficulty: "MD", xp: 110, solution: "The fulcrum security is the part of the capital structure most likely to convert into reorganized equity because enterprise value breaks around that claim. It matters because it drives control, recovery and expected return.", rubric: ["capital", "value", "recovery", "control"] },
    { id: "q9", category: "Accounting", title: "Working capital signs", prompt: "If accounts receivable increases by ₹20 Cr, what is the cash-flow impact and why?", type: "Formula", difficulty: "Easy", xp: 35, solution: "Increase in accounts receivable is a cash outflow because revenue was recognized before cash was collected. In cash flow, subtract the increase in receivables.", rubric: ["receivable", "cash", "outflow", "subtract"] },
    { id: "q10", category: "Markets", title: "Rates and valuation", prompt: "Why do higher risk-free rates usually pressure DCF valuation and growth-stock multiples?", type: "Subjective", difficulty: "Medium", xp: 60, solution: "Higher risk-free rates raise discount rates and reduce present value of future cash flows. Long-duration growth stocks are more sensitive because more value comes from distant cash flows.", rubric: ["discount", "present", "growth", "duration"] },
    { id: "q11", category: "Corporate Finance", title: "WACC use", prompt: "When should WACC be used as the discount rate?", type: "MCQ", difficulty: "Medium", xp: 45, options: ["For unlevered free cash flows to firm", "For dividends only", "For net income after debt cost", "For revenue multiples only"], correct: "For unlevered free cash flows to firm", solution: "WACC discounts unlevered free cash flows available to all capital providers.", rubric: ["unlevered", "firm", "capital"] },
    { id: "q12", category: "Excel", title: "Shortcut discipline", prompt: "What is the purpose of Ctrl+[ in financial-model review?", type: "Interview", difficulty: "Easy", xp: 25, solution: "Ctrl+[ traces precedents. It helps identify source cells, hardcodes, formula dependencies and whether model logic flows correctly.", rubric: ["trace", "precedents", "formula"] }
  ];
  return raw;
}

function scoreQuestion(q: Question, answer: string) {
  const clean = answer.trim().toLowerCase();
  if (!clean) return { score: 0, correct: false, feedback: "No answer submitted. Try again with at least one clear calculation or logic point." };
  if (q.type === "MCQ") {
    const correct = clean === String(q.correct || "").toLowerCase();
    return { score: correct ? 10 : 0, correct, feedback: correct ? "Correct. Clean technical answer." : `Incorrect. Correct answer: ${q.correct}` };
  }
  if (q.numeric !== undefined) {
    const value = Number(clean.replace(/[^0-9.-]/g, ""));
    const correct = Number.isFinite(value) && Math.abs(value - q.numeric) <= Math.max(0.15, Math.abs(q.numeric) * 0.03);
    return { score: correct ? 10 : 5, correct, feedback: correct ? "Correct calculation." : `Expected approximately ${q.numeric}. Check the formula and signs.` };
  }
  const hits = q.rubric.filter((word) => clean.includes(word.toLowerCase())).length;
  const lengthBonus = answer.length > 180 ? 2 : answer.length > 90 ? 1 : 0;
  const score = Math.min(10, Math.max(3, hits * 2 + lengthBonus));
  return { score, correct: score >= 7, feedback: score >= 7 ? "Strong direction. Improve by leading with conclusion and quantifying the driver." : "Partially correct. Add more finance drivers, risk logic and decision impact." };
}

function pct(num: number, den: number) {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

export default function Page() {
  const questions = useMemo(() => questionBank(), []);
  const [active, setActive] = useState<NavTab>("Home");
  const [store, setStore] = useState<Store>(baseStore);
  const [query, setQuery] = useState("");
  const [newsCursor, setNewsCursor] = useState(0);
  const [caseCursor, setCaseCursor] = useState(0);
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState<"All" | Difficulty>("All");
  const [qType, setQType] = useState<"All" | QuestionType>("All");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [hintOpen, setHintOpen] = useState(false);
  const [result, setResult] = useState<{ score: number; correct: boolean; feedback: string } | null>(null);
  const [selectedModule, setSelectedModule] = useState(modules[0]);
  const [moduleInput, setModuleInput] = useState(modules[0].quickPrompt);
  const [moduleOutput, setModuleOutput] = useState("Choose a module and launch it. If API is not connected, Capital Forge returns a safe demo output instead of dead UI.");
  const [moduleLoading, setModuleLoading] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [interviewMode, setInterviewMode] = useState("Private Equity");
  const [interviewPersona, setInterviewPersona] = useState("PE VP");
  const [interviewQuestion, setInterviewQuestion] = useState("Click Start Mock to generate your first interview question.");
  const [interviewAnswer, setInterviewAnswer] = useState("");
  const [interviewFeedback, setInterviewFeedback] = useState("Your interview feedback will appear here.");
  const [health, setHealth] = useState<Health | null>(null);
  const [apiTest, setApiTest] = useState("Create a 5-line PE interview drill on LBO returns.");
  const [apiOutput, setApiOutput] = useState("Run a health check or test output from the API tab.");
  const [toast, setToast] = useState("Phase C ready: open app, no auth gate, all core buttons wired.");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) setStore({ ...baseStore, ...JSON.parse(raw) });
      setNewsCursor(Math.floor(Date.now() / 1000) % newsBank.length);
      setCaseCursor(Math.floor(Date.now() / 2000) % caseBank.length);
    } catch {
      setStore(baseStore);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(storeKey, JSON.stringify(store));
    } catch {}
  }, [store]);

  useEffect(() => {
    void refreshHealth();
  }, []);

  const visibleNews = useMemo(() => {
    const searched = newsBank.filter((item) => `${item.title} ${item.summary} ${item.tag}`.toLowerCase().includes(query.toLowerCase()));
    return rotate(searched.length ? searched : newsBank, newsCursor, 5);
  }, [newsCursor, query]);

  const visibleCases = useMemo(() => rotate(caseBank, caseCursor, 4), [caseCursor]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const textMatch = `${q.title} ${q.prompt} ${q.category}`.toLowerCase().includes(query.toLowerCase());
      return textMatch && (category === "All" || q.category === category) && (difficulty === "All" || q.difficulty === difficulty) && (qType === "All" || q.type === qType);
    });
  }, [questions, query, category, difficulty, qType]);

  const currentQuestion = filteredQuestions[questionIndex % Math.max(1, filteredQuestions.length)] || questions[0];
  const correctAttempts = store.attempts.filter((a) => a.correct).length;
  const accuracy = pct(correctAttempts, store.attempts.length);
  const solved = new Set(store.attempts.map((a) => a.questionId)).size;
  const apiStatus = health?.keyStatus || {};
  const connectedCount = Object.values(apiStatus).filter(Boolean).length;

  async function refreshHealth() {
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const data = (await res.json()) as Health;
      setHealth(data);
      setToast(data.keyStatus?.supabaseConfigured ? "Supabase is connected on this deployment." : "Health check works, but Supabase env is not connected on this deployment.");
    } catch {
      setToast("Health check failed on this deployment.");
    }
  }

  function refreshNews() {
    setNewsCursor((v) => (v + 3) % newsBank.length);
    setToast("News refreshed with a new practice-ready set.");
  }

  function refreshCases() {
    setCaseCursor((v) => (v + 2) % caseBank.length);
    setToast("Short cases refreshed.");
  }

  function solveCase(item: ShortCase) {
    const match = categories.includes(item.category) ? item.category : "All";
    setCategory(match);
    setDifficulty(item.difficulty);
    setQuestionIndex(0);
    setResult(null);
    setAnswer("");
    setSelectedOption("");
    setActive("Practice");
    setToast(`Opened Practice for ${item.title}.`);
  }

  function submitAnswer() {
    const finalAnswer = selectedOption || answer;
    const grade = scoreQuestion(currentQuestion, finalAnswer);
    setResult(grade);
    const attempt: Attempt = {
      id: crypto.randomUUID(),
      questionId: currentQuestion.id,
      title: currentQuestion.title,
      category: currentQuestion.category,
      score: grade.score,
      correct: grade.correct,
      answer: finalAnswer,
      createdAt: new Date().toLocaleString()
    };
    setStore((prev) => ({ ...prev, xp: prev.xp + (grade.correct ? currentQuestion.xp : Math.max(5, Math.floor(currentQuestion.xp * 0.25))), attempts: [attempt, ...prev.attempts].slice(0, 80) }));
    setToast(grade.correct ? `Correct. +${currentQuestion.xp} XP added.` : "Submitted. Review the stronger answer and retry later.");
  }

  function nextQuestion() {
    setQuestionIndex((v) => v + 1);
    setAnswer("");
    setSelectedOption("");
    setResult(null);
    setHintOpen(false);
  }

  function toggleBookmark() {
    setStore((prev) => {
      const exists = prev.bookmarks.includes(currentQuestion.id);
      return { ...prev, bookmarks: exists ? prev.bookmarks.filter((id) => id !== currentQuestion.id) : [currentQuestion.id, ...prev.bookmarks] };
    });
    setToast("Bookmark updated.");
  }

  async function launchModule(module = selectedModule) {
    setSelectedModule(module);
    setModuleLoading(true);
    setModuleOutput("Running module...");
    setStore((prev) => ({ ...prev, launchedModules: Array.from(new Set([module.name, ...prev.launchedModules])).slice(0, 25) }));
    try {
      const res = await fetch("/api/lab", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ module: module.name, input: moduleInput || module.quickPrompt })
      });
      const data = await res.json();
      setModuleOutput(data.output || JSON.stringify(data, null, 2));
      setToast(data.configured ? `${module.name} used connected AI provider.` : `${module.name} returned safe-demo output.`);
    } catch {
      setModuleOutput("Module could not reach the API route. The UI remains active; check deployment logs if this persists.");
      setToast("Module request failed.");
    } finally {
      setModuleLoading(false);
    }
  }

  function saveModuleOutput() {
    setStore((prev) => ({ ...prev, notes: [`${selectedModule.name}: ${moduleOutput}`, ...prev.notes].slice(0, 50) }));
    setToast("Module output saved to Feedback.");
  }

  function saveNote() {
    if (!noteInput.trim()) {
      setToast("Write a note first.");
      return;
    }
    setStore((prev) => ({ ...prev, notes: [noteInput.trim(), ...prev.notes].slice(0, 50) }));
    setNoteInput("");
    setToast("Feedback note saved.");
  }

  function startInterview() {
    const prompts = [
      `Walk me through an LBO for a business with stable EBITDA but high capex. I am a ${interviewPersona}; be precise.`,
      `Why might a strategically attractive M&A deal still destroy shareholder value? Answer for ${interviewMode}.`,
      `A company trades at 18x EBITDA while peers trade at 11x. What diligence would you run before calling it overvalued?`,
      `You have five minutes before IC. Give me the investment thesis, key risk and what would change your mind.`
    ];
    setInterviewQuestion(prompts[(Date.now() + interviewMode.length) % prompts.length]);
    setInterviewAnswer("");
    setInterviewFeedback("Answer the question and submit for AI/local feedback.");
    setToast("Mock interview started.");
  }

  async function submitInterview() {
    if (!interviewAnswer.trim()) {
      setToast("Write your interview answer first.");
      return;
    }
    setInterviewFeedback("Reviewing your answer...");
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: interviewMode, question: interviewQuestion, answer: interviewAnswer, context: interviewPersona })
      });
      const data = await res.json();
      setInterviewFeedback(`${data.feedback}\n\nStronger answer: ${data.strongerAnswer}\n\nFollow-up: ${data.followUp}`);
      setStore((prev) => ({ ...prev, notes: [`Interview feedback (${interviewMode}): ${data.feedback}`, ...prev.notes].slice(0, 50) }));
      setToast(data.configured ? "Interview reviewed by connected AI." : "Interview reviewed by local fallback coach.");
    } catch {
      setInterviewFeedback("Could not reach coach API. Use conclusion → driver → risk → recommendation and retry.");
      setToast("Interview API request failed.");
    }
  }

  async function runApiTest() {
    setApiOutput("Testing API output...");
    try {
      const res = await fetch("/api/lab", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ module: "API Test Workspace", input: apiTest })
      });
      const data = await res.json();
      setApiOutput(JSON.stringify(data, null, 2));
      setToast(data.configured ? "Connected API output returned." : "Fallback output returned because AI key is not connected.");
    } catch {
      setApiOutput("API test failed. Check whether /api/lab exists on this deployment.");
      setToast("API test failed.");
    }
  }

  function quickNav(tab: NavTab) {
    setActive(tab);
    setToast(`Opened ${tab}.`);
  }

  function Header() {
    return (
      <header className="topbar">
        <div className="searchBox">
          <span>⌕</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") setToast("Search applied across news, cases and practice."); }} placeholder="Search topics, cases, questions, markets..." />
          <kbd>⌘K</kbd>
        </div>
        <button className="aiPill" onClick={() => quickNav("Advanced")}>✦ AI Assistant</button>
        <button className="iconButton" onClick={() => quickNav("Feedback")}>🔔</button>
        <button className="iconButton" onClick={() => quickNav("Dashboard")}>🏆</button>
        <div className="profilePill"><span>DC</span><div><b>Deepak</b><small>Keep forging</small></div></div>
      </header>
    );
  }

  function Sidebar() {
    return (
      <aside className="sidebar">
        <div className="brand"><div className="brandMark">△</div><div><b>Capital<span>Forge</span></b><small>Finance training OS</small></div></div>
        <nav>
          {navTabs.map((tab) => <button key={tab} className={active === tab ? "active" : ""} onClick={() => quickNav(tab)}><span>{tab === "Home" ? "⌂" : tab === "Practice" ? "✥" : tab === "Advanced" ? "✦" : tab === "Dashboard" ? "▤" : tab === "Feedback" ? "☰" : tab === "Interview Room" ? "◉" : "⚙"}</span>{tab}</button>)}
        </nav>
        <div className="upgradeCard"><b>API-ready engine</b><p>Supabase is connected when health shows true. AI/news/market can stay in safe demo until keys are added.</p><button onClick={() => quickNav("API")}>Open API Hub</button></div>
        <div className="miniFooter"><div className="progressLine"><i style={{ width: `${Math.min(100, store.xp / 20)}%` }} /></div><b>Capital Forge v3C</b><span>Open app. No auth gate.</span></div>
      </aside>
    );
  }

  function Home() {
    return (
      <div className="pageGrid homeGrid">
        <section className="hero card wide2">
          <div>
            <span className="eyebrow">AI-powered finance practice</span>
            <h1>Welcome back, <span>Deepak</span> 👋</h1>
            <p>Practice IB, PE, VC, private credit, modeling, markets and interview judgment from one clean workspace.</p>
            <div className="statStrip">
              <article><small>Accuracy</small><b>{accuracy || 92}%</b><span className="greenText">adaptive</span></article>
              <article><small>Questions Solved</small><b>{solved}</b><span>from {questions.length}</span></article>
              <article><small>XP Earned</small><b>{store.xp}</b><span>live score</span></article>
            </div>
          </div>
          <div className="aiCube"><div>AI</div><span>Model • Markets • Memo • Mock</span></div>
        </section>

        <aside className="sideStack">
          <section className="card progressCard"><div className="cardHead"><b>Your Progress</b><button onClick={() => quickNav("Dashboard")}>View →</button></div><div className="ring"><span>{accuracy || 72}%</span></div><p><i className="dot green" /> Practice {Math.max(12, accuracy || 84)}%</p><p><i className="dot blue" /> Advanced {Math.min(100, store.launchedModules.length * 6 || 64)}%</p><p><i className="dot red" /> Interview {store.notes.length ? 70 : 42}%</p></section>
          <section className="card streak"><b>🔥 7 Day Streak</b><strong>7</strong><span>Keep it up</span><div>{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <em key={d + i} className={i < 5 ? "done" : ""}>{d}</em>)}</div></section>
          <section className="card insight"><b>AI Insights <span>New</span></b><p>You are strongest in valuation/modeling. Balance it with market analysis and private credit downside drills.</p><button onClick={() => quickNav("Advanced")}>View Insights →</button></section>
        </aside>

        <section className="card wide2">
          <div className="cardHead"><div><b>🔴 Live News & Updates</b><p>Curated market, AI, PE, credit and finance prompts. Refresh changes the set.</p></div><button onClick={refreshNews}>⟳ Refresh</button></div>
          <div className="newsRow">
            {visibleNews.map((item) => <article className="newsCard" key={item.id}><div className={`newsVisual ${item.tone}`}>{item.visual}</div><div><span className={`tag ${item.tone}`}>{item.tag}</span><small>{item.time}</small></div><b>{item.title}</b><p>{item.summary}</p><button onClick={() => { setModuleInput(`Turn this into practice: ${item.title}. ${item.summary}`); quickNav("Advanced"); }}>Read & Drill →</button></article>)}
          </div>
        </section>

        <section className="card wide2">
          <div className="cardHead"><div><b>📕 Featured Short Cases</b><p>Real-world scenarios to sharpen modeling, valuation, M&A and investor judgment.</p></div><button onClick={refreshCases}>⟳ Refresh Cases</button></div>
          <div className="caseRow">
            {visibleCases.map((item) => <article className="caseCard" key={item.id}><div><span className={`tag ${item.tone}`}>{item.category}</span><small>{item.difficulty} • {item.time}</small></div><b>{item.title}</b><p>{item.summary}</p><button onClick={() => solveCase(item)}>Solve Now →</button></article>)}
          </div>
        </section>

        <aside className="sideStack lowerSide">
          <section className="card recommend"><b>Recommended For You</b><button onClick={() => quickNav("Practice")}>🎯 Complete 5 hard questions <span>+120 XP</span></button><button onClick={() => quickNav("Advanced")}>🧠 Try Model Error Hunter <span>+150 XP</span></button><button onClick={() => quickNav("Interview Room")}>🎤 Book a mock interview <span>+200 XP</span></button></section>
          <section className="card quick"><b>Quick Actions</b><div><button onClick={() => quickNav("Practice")}>▶<span>Practice</span></button><button onClick={() => quickNav("Advanced")}>▥<span>Advanced</span></button><button onClick={() => quickNav("Interview Room")}>🎥<span>Interview</span></button><button onClick={() => quickNav("Feedback")}>▣<span>Notes</span></button></div></section>
        </aside>
      </div>
    );
  }

  function Practice() {
    return (
      <div className="splitPage">
        <section className="card controlPanel">
          <span className="eyebrow">Primary practice</span>
          <h2>Question Engine</h2>
          <label>Category<select value={category} onChange={(e) => { setCategory(e.target.value); setQuestionIndex(0); }}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label>Difficulty<select value={difficulty} onChange={(e) => { setDifficulty(e.target.value as "All" | Difficulty); setQuestionIndex(0); }}>{difficulties.map((d) => <option key={d}>{d}</option>)}</select></label>
          <label>Question Type<select value={qType} onChange={(e) => { setQType(e.target.value as "All" | QuestionType); setQuestionIndex(0); }}>{qTypes.map((t) => <option key={t}>{t}</option>)}</select></label>
          <div className="verticalButtons"><button onClick={() => { setCategory("All"); setDifficulty("All"); setQType("All"); nextQuestion(); }}>Random Mode</button><button onClick={() => { const weak = store.attempts.find((a) => !a.correct); if (weak) setCategory(weak.category); setToast("Adaptive mode focused on weak categories."); }}>Adaptive Mode</button><button onClick={() => { setDifficulty("Medium"); setToast("Daily practice pack loaded."); }}>Daily Practice</button></div>
          <p className="muted">Showing {filteredQuestions.length || questions.length} questions. Bookmarks: {store.bookmarks.length}</p>
        </section>
        <section className="card questionCard">
          <div className="questionMeta"><span className="tag blue">{currentQuestion.category}</span><span className="tag green">{currentQuestion.type}</span><span className="tag red">{currentQuestion.difficulty}</span><span>{currentQuestion.xp} XP</span></div>
          <h2>{currentQuestion.title}</h2>
          <p>{currentQuestion.prompt}</p>
          {currentQuestion.options ? <div className="options">{currentQuestion.options.map((opt) => <button key={opt} className={selectedOption === opt ? "selected" : ""} onClick={() => setSelectedOption(opt)}>{opt}</button>)}</div> : <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Write your answer like an analyst: conclusion → formula/driver → risk → decision impact." />}
          <div className="buttonRow"><button onClick={submitAnswer}>Submit Answer</button><button className="ghost" onClick={() => setHintOpen((v) => !v)}>Show Hint</button><button className="ghost" onClick={toggleBookmark}>{store.bookmarks.includes(currentQuestion.id) ? "Bookmarked ✓" : "Bookmark"}</button><button className="ghost" onClick={nextQuestion}>Next →</button></div>
          {hintOpen && <div className="softBox">Hint: start with the core formula or decision, then explain why it matters economically.</div>}
          {result && <div className="resultBox"><b>Score: {result.score}/10</b><p>{result.feedback}</p><h4>Stronger answer</h4><p>{currentQuestion.solution}</p></div>}
        </section>
      </div>
    );
  }

  function Advanced() {
    return (
      <div className="advancedPage">
        <section className="card fullWidth">
          <div className="cardHead"><div><span className="eyebrow">Advanced layer</span><h2>25 AI Finance Modules</h2><p>Every Launch button works. Connected APIs produce live output; missing APIs return deterministic demo output.</p></div><button onClick={() => launchModule()}>Launch Selected</button></div>
        </section>
        <section className="moduleGrid">
          {modules.map((module) => <button className={selectedModule.name === module.name ? "moduleCard active" : "moduleCard"} key={module.name} onClick={() => { setSelectedModule(module); setModuleInput(module.quickPrompt); }}><span>{module.bucket}</span><b>{module.name}</b><p>{module.description}</p><small>{module.required === "No key" || apiStatus.supabaseConfigured ? "Ready / Demo-safe" : `Requires ${module.required}`}</small><em onClick={(e) => { e.stopPropagation(); void launchModule(module); }}>Launch →</em></button>)}
        </section>
        <section className="card fullWidth outputDesk">
          <div><h2>{selectedModule.name}</h2><p>{selectedModule.description}</p><textarea value={moduleInput} onChange={(e) => setModuleInput(e.target.value)} placeholder="Paste a prompt, deal note, interview answer, model concern or case idea." /><div className="buttonRow"><button onClick={() => launchModule()} disabled={moduleLoading}>{moduleLoading ? "Running..." : "Generate Output"}</button><button className="ghost" onClick={saveModuleOutput}>Save to Feedback</button><button className="ghost" onClick={() => quickNav("API")}>Check API Status</button></div></div><pre>{moduleOutput}</pre>
        </section>
      </div>
    );
  }

  function Dashboard() {
    const categoryStats = categories.filter((c) => c !== "All").map((c) => ({ category: c, total: store.attempts.filter((a) => a.category === c).length, correct: store.attempts.filter((a) => a.category === c && a.correct).length })).filter((s) => s.total > 0).slice(0, 8);
    return (
      <div className="dashboardGrid">
        {[['Total XP', store.xp], ['Questions Solved', solved], ['Accuracy', `${accuracy}%`], ['Bookmarks', store.bookmarks.length]].map(([k, v]) => <article className="metricCard" key={k}><span>{k}</span><b>{v}</b><p>{k === 'Accuracy' ? 'Correct answers / total attempts' : 'Live local progress'}</p></article>)}
        <section className="card wide2"><h2>Concept Mastery</h2>{categoryStats.length ? categoryStats.map((s) => <div className="barRow" key={s.category}><span>{s.category}</span><div><i style={{ width: `${pct(s.correct, s.total)}%` }} /></div><b>{pct(s.correct, s.total)}%</b></div>) : <p className="muted">Complete practice questions to build your mastery graph.</p>}</section>
        <section className="card"><h2>Recent Attempts</h2>{store.attempts.slice(0, 6).map((a) => <div className="attemptLine" key={a.id}><b>{a.title}</b><span>{a.score}/10 • {a.correct ? "Correct" : "Review"}</span></div>)}{!store.attempts.length && <p className="muted">No attempts yet.</p>}</section>
      </div>
    );
  }

  function Feedback() {
    const mistakes = store.attempts.filter((a) => !a.correct).slice(0, 8);
    return (
      <div className="splitPage">
        <section className="card"><h2>Feedback & Notes</h2><textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Write what you learned, where you made a mistake, or what to revise." /><div className="buttonRow"><button onClick={saveNote}>Save Note</button><button className="ghost" onClick={() => setStore((p) => ({ ...p, notes: [] }))}>Clear Notes</button></div><div className="noteList">{store.notes.map((note, i) => <article key={note + i}>{note}</article>)}{!store.notes.length && <p className="muted">No feedback notes saved yet.</p>}</div></section>
        <section className="card"><h2>Mistake Journal</h2>{mistakes.map((m) => <div className="attemptLine" key={m.id}><b>{m.title}</b><span>{m.category} • {m.score}/10</span><button onClick={() => { setCategory(m.category); setActive("Practice"); }}>Retry category →</button></div>)}{!mistakes.length && <p className="muted">No mistakes yet. Submit more practice to build this journal.</p>}</section>
      </div>
    );
  }

  function InterviewRoom() {
    return (
      <div className="splitPage">
        <section className="card controlPanel"><span className="eyebrow">Mock interview</span><h2>Interview Room</h2><label>Mode<select value={interviewMode} onChange={(e) => setInterviewMode(e.target.value)}>{["Investment Banking", "Private Equity", "Venture Capital", "Private Credit", "CFO / Strategy", "MD Pressure Round"].map((m) => <option key={m}>{m}</option>)}</select></label><label>Persona<select value={interviewPersona} onChange={(e) => setInterviewPersona(e.target.value)}>{["IB Associate", "PE VP", "Credit IC", "VC Partner", "CFO", "Managing Director"].map((p) => <option key={p}>{p}</option>)}</select></label><button onClick={startInterview}>Start Mock</button></section>
        <section className="card questionCard"><div className="questionMeta"><span className="tag blue">{interviewMode}</span><span className="tag green">{interviewPersona}</span></div><h2>Question</h2><p>{interviewQuestion}</p><textarea value={interviewAnswer} onChange={(e) => setInterviewAnswer(e.target.value)} placeholder="Answer as if this is a real interview." /><div className="buttonRow"><button onClick={submitInterview}>Submit for Review</button><button className="ghost" onClick={startInterview}>New Question</button></div><pre>{interviewFeedback}</pre></section>
      </div>
    );
  }

  function ApiHub() {
    const cards = [
      ["Supabase", "supabaseConfigured", "Cloud database and progress persistence"],
      ["AI Coach", "aiConfigured", "Advanced module and interview reasoning"],
      ["Market Data", "marketConfigured", "Live market challenges"],
      ["News", "newsConfigured", "Live news and updates"],
      ["Filings", "filingsConfigured", "SEC/MCA filing drills"],
      ["Recruiter Review", "recruiterReviewConfigured", "Portfolio/recruiter scoring"],
      ["Admin Secret", "adminSecretConfigured", "Protected import/admin workflows"]
    ] as const;
    return (
      <div className="apiPage">
        <section className="card fullWidth"><div className="cardHead"><div><span className="eyebrow">Dedicated API tab</span><h2>Connection Hub</h2><p>No API clutter on Home. Every integration has a status card and test output area.</p></div><button onClick={() => void refreshHealth()}>Refresh Health</button></div></section>
        <section className="apiGrid">{cards.map(([label, key, desc]) => <article className="apiCard" key={key}><div><b>{label}</b><span className={apiStatus[key] ? "connected" : "missing"}>{apiStatus[key] ? "Connected" : "Not Connected"}</span></div><p>{desc}</p><code>{key}</code></article>)}</section>
        <section className="card fullWidth outputDesk"><div><h2>{connectedCount ? "Connected Output Workspace" : "Demo Output Workspace"}</h2><p>{connectedCount ? `${connectedCount} integration flag(s) are connected. Supabase should be green now.` : "No integration flags detected on this deployment yet."}</p><textarea value={apiTest} onChange={(e) => setApiTest(e.target.value)} /><div className="buttonRow"><button onClick={runApiTest}>Test Output</button><button className="ghost" onClick={() => void refreshHealth()}>Run Health Check</button></div></div><pre>{apiOutput}\n\nHealth snapshot:\n{JSON.stringify(health, null, 2)}</pre></section>
      </div>
    );
  }

  return (
    <main className="appShell">
      <Sidebar />
      <section className="mainPanel">
        <Header />
        {toast && <div className="toast">{toast}</div>}
        {active === "Home" && <Home />}
        {active === "Practice" && <Practice />}
        {active === "Advanced" && <Advanced />}
        {active === "Dashboard" && <Dashboard />}
        {active === "Feedback" && <Feedback />}
        {active === "Interview Room" && <InterviewRoom />}
        {active === "API" && <ApiHub />}
      </section>
    </main>
  );
}
