"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";

type NavTab = "Home" | "Practice" | "Advanced" | "Dashboard" | "Feedback" | "Interview Room" | "API";
type QuestionType = "MCQ" | "Subjective" | "Numerical" | "Formula" | "Model Review" | "Case" | "Interview" | "Judgment";
type Difficulty = "Easy" | "Medium" | "Hard" | "MD";
type Tone = "blue" | "red" | "green" | "black";

type Question = { id: string; category: string; title: string; prompt: string; type: QuestionType; difficulty: Difficulty; xp: number; options?: string[]; correct?: string; numeric?: number; solution: string; rubric: string[] };
type Attempt = { id: string; questionId: string; title: string; category: string; score: number; correct: boolean; answer: string; createdAt: string };
type Store = { xp: number; attempts: Attempt[]; bookmarks: string[]; notes: string[]; launchedModules: string[]; backups: number };
type NewsItem = { id: string; tag: string; tone: Tone; title: string; summary: string; time: string; visual: string };
type ShortCase = { id: string; category: string; title: string; summary: string; difficulty: Difficulty; time: string; tone: Tone };
type Module = { name: string; bucket: string; description: string; required: string; quickPrompt: string };
type Health = { app?: string; phase?: string; status?: string; safeMode?: boolean; modules?: number; keyStatus?: Record<string, boolean>; generatedAt?: string; message?: string };
type LabResult = { configured?: boolean; module?: string; output?: string; feedback?: string; strongerAnswer?: string; nextStep?: string; warning?: string; events?: Array<{ title?: string; assetClass?: string; question?: string; task?: string }> };
type Grade = { score: number; correct: boolean; feedback: string; stronger: string };
type Activity = { id: string; text: string; at: string; tone: Tone };

const storeKey = "capital-forge-phase-d-open-app";
const navTabs: NavTab[] = ["Home", "Practice", "Advanced", "Dashboard", "Feedback", "Interview Room", "API"];
const baseStore: Store = { xp: 0, attempts: [], bookmarks: [], notes: [], launchedModules: [], backups: 0 };

const newsBank: NewsItem[] = [
  { id: "n1", tag: "Markets", tone: "blue", title: "Equities rally as inflation expectations cool", summary: "Practice discount-rate sensitivity, WACC movement and exit multiple compression.", time: "2h ago", visual: "📈" },
  { id: "n2", tag: "AI & Tech", tone: "black", title: "AI capex cycle raises valuation discipline questions", summary: "Compare revenue growth with cash conversion, capex intensity and terminal margin risk.", time: "3h ago", visual: "🤖" },
  { id: "n3", tag: "PE / M&A", tone: "red", title: "Sponsors stay selective as dry powder meets high multiples", summary: "A useful mini-case for entry leverage, value creation and downside structure.", time: "4h ago", visual: "🏦" },
  { id: "n4", tag: "Credit", tone: "green", title: "Private credit terms tighten for cyclical borrowers", summary: "Think through DSCR, covenants, cash sweep, pricing and downside recovery.", time: "5h ago", visual: "🧾" },
  { id: "n5", tag: "Macro", tone: "blue", title: "Currency volatility changes imported inflation assumptions", summary: "Build a quick sensitivity around FX, gross margin and working capital.", time: "6h ago", visual: "🌐" },
  { id: "n6", tag: "Restructuring", tone: "red", title: "Highly levered borrowers face maturity-wall pressure", summary: "Practice fulcrum-security thinking and recovery waterfall logic.", time: "7h ago", visual: "⚠️" },
  { id: "n7", tag: "VC", tone: "green", title: "Growth investors demand cleaner unit economics", summary: "Move beyond TAM and focus on CAC payback, NDR, gross margin and burn multiple.", time: "8h ago", visual: "🚀" },
  { id: "n8", tag: "IB", tone: "black", title: "Boards revisit strategic alternatives in slower growth pockets", summary: "Frame a sell-side pitch: buyer universe, valuation range, timing and process risk.", time: "9h ago", visual: "📊" }
];

const caseBank: ShortCase[] = [
  { id: "c1", category: "Financial Modeling", title: "Build a 3-statement bridge", summary: "Forecast revenue, EBITDA, working capital, capex and debt paydown.", difficulty: "Medium", time: "45 min", tone: "blue" },
  { id: "c2", category: "Valuation", title: "DCF valuation under rate shock", summary: "Rebuild intrinsic value after WACC rises and terminal growth compresses.", difficulty: "Medium", time: "40 min", tone: "red" },
  { id: "c3", category: "M&A", title: "Buy-side acquisition screen", summary: "Assess synergy, accretion/dilution and integration risk before bidding.", difficulty: "Hard", time: "60 min", tone: "green" },
  { id: "c4", category: "Private Equity", title: "Paper LBO return test", summary: "Calculate entry equity, debt paydown, exit equity value, MOIC and IRR.", difficulty: "Hard", time: "35 min", tone: "black" },
  { id: "c5", category: "Private Credit", title: "Term sheet from credit memo", summary: "Design pricing, covenants, amortization and downside protection.", difficulty: "MD", time: "55 min", tone: "red" },
  { id: "c6", category: "VC", title: "Series B dilution and preference stack", summary: "Model post-money, option pool refresh, liquidation preference and founder dilution.", difficulty: "Medium", time: "30 min", tone: "green" },
  { id: "c7", category: "Capital Markets", title: "IPO readiness memo", summary: "Evaluate growth, margin profile, governance, market window and investor story.", difficulty: "Hard", time: "45 min", tone: "blue" },
  { id: "c8", category: "Restructuring", title: "Recovery waterfall mini-case", summary: "Allocate EV across secured debt, unsecured notes and equity.", difficulty: "MD", time: "50 min", tone: "black" }
];

const modules: Module[] = [
  ["Recruiter Mode", "Career", "Score your project like an IB/PE recruiter.", "AI_API_KEY", "Rate my finance project like a PE recruiter."],
  ["MD Pressure Room", "Interview", "Turn any answer into a senior pressure round.", "AI_API_KEY", "Pressure test my answer as a managing director."],
  ["Deal Teardown Library", "Deals", "Break a deal into thesis, valuation, risks and financing.", "NEWS_API_KEY + AI_API_KEY", "Create a deal teardown checklist."],
  ["Excel Muscle Memory", "Modeling", "Timed shortcut drills for analyst speed.", "No key", "Give me a 10-minute Excel shortcut sprint."],
  ["Model Error Hunter", "Modeling", "Find formula, sign, circularity and assumption mistakes.", "AI_API_KEY", "Audit this model logic for mistakes."],
  ["IC Memo Builder", "PE", "Turn raw investment thinking into IC memo format.", "AI_API_KEY", "Convert this thesis into an IC memo."],
  ["Would You Invest Game", "Judgment", "Make invest/pass/reprice decisions.", "AI_API_KEY", "Give me an investment snapshot."],
  ["Live News Question Engine", "Markets", "Convert headlines into finance mini-cases.", "NEWS_API_KEY", "Turn today’s market theme into questions."],
  ["Personal Weakness Graph", "Analytics", "Map wrong attempts to concept weakness.", "Supabase", "Summarize my weakest finance topics."],
  ["Interview Bank by Firm", "Recruiting", "Generate firm-style drills for banks and funds.", "AI_API_KEY", "Give me KKR-style PE questions."],
  ["Deal Math Speed Trainer", "Mental Math", "EV, leverage, IRR, MOIC and dilution drills.", "No key", "Create 10 deal math questions."],
  ["Investment Journal AI", "Thinking", "Rate and improve daily investment thinking.", "AI_API_KEY", "Rate this investment journal entry."],
  ["Pitchbook Simulator", "IB", "Build teaser, CIM, buyer list and process timeline.", "AI_API_KEY", "Create a sell-side pitchbook outline."],
  ["LBO Paper Test", "PE", "30-minute paper LBO with return bridge.", "No key", "Give me a paper LBO test."],
  ["Private Credit Underwriting", "Credit", "DSCR, covenants, recovery and downside case.", "AI_API_KEY", "Create a private credit underwriting case."],
  ["Founder Call Simulator", "Diligence", "Simulate a founder call with hidden red flags.", "AI_API_KEY", "Act like a founder in diligence."],
  ["Red Flag Detector", "Diligence", "Scan narratives for governance and cash-flow risks.", "FILINGS_API_KEY + AI_API_KEY", "List red flags in an annual report."],
  ["Cap Table Simulator", "VC", "Rounds, ESOP, preference and dilution practice.", "No key", "Create a VC cap table mini-case."],
  ["Career Path Engine", "Career", "Build a weekly roadmap to IB/PE/credit.", "AI_API_KEY", "Create a 12-week IB/PE transition plan."],
  ["Portfolio Project Tracker", "Career", "Track models, memos and recruiter proof points.", "Supabase", "Design a recruiter-grade project tracker."],
  ["Real Filing Reader", "Research", "Convert filings into diligence checklists.", "FILINGS_API_KEY", "Give me a filing review checklist."],
  ["AI Mentor Personas", "Mentors", "Switch between IB, PE, credit, VC and CFO mentors.", "AI_API_KEY", "Coach me like a PE VP."],
  ["Bad Answer Rewriter", "Communication", "Rewrite weak answers into crisp interview responses.", "AI_API_KEY", "Rewrite my answer into a strong response."],
  ["Case Competition Mode", "Projects", "Simulate a 48-hour model, memo and deck case.", "AI_API_KEY + Supabase", "Create a 48-hour PE case brief."],
  ["Daily Killer Insight", "Learning", "One sharp finance concept and mini question.", "AI_API_KEY / NEWS_API_KEY", "Give me one killer finance insight."]
].map(([name, bucket, description, required, quickPrompt]) => ({ name, bucket, description, required, quickPrompt }));

const categories = ["All", "Accounting", "Corporate Finance", "Valuation", "Financial Modeling", "Excel", "Investment Banking", "M&A", "Private Equity", "VC", "Private Credit", "Markets", "Restructuring", "Interviews"];
const difficulties: ("All" | Difficulty)[] = ["All", "Easy", "Medium", "Hard", "MD"];
const qTypes: ("All" | QuestionType)[] = ["All", "MCQ", "Subjective", "Numerical", "Formula", "Model Review", "Case", "Interview", "Judgment"];
const apiSlots = [
  { label: "Supabase", key: "supabaseConfigured", vars: "NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", use: "Progress persistence, future auth and user state." },
  { label: "AI Coach", key: "aiConfigured", vars: "AI_API_URL + AI_API_KEY", use: "Advanced modules and answer coaching." },
  { label: "Market Data", key: "marketConfigured", vars: "MARKET_DATA_API_URL + MARKET_DATA_API_KEY", use: "Live market challenges and macro prompts." },
  { label: "News", key: "newsConfigured", vars: "NEWS_API_URL + NEWS_API_KEY", use: "Live news refresh and headline-to-case conversion." },
  { label: "Filings", key: "filingsConfigured", vars: "FILINGS_API_URL + FILINGS_API_KEY", use: "Annual report, SEC/MCA and filing drills." },
  { label: "Recruiter Review", key: "recruiterReviewConfigured", vars: "RESUME_REVIEW_API_URL + RESUME_REVIEW_API_KEY", use: "Project and resume scoring workflows." },
  { label: "Admin Secret", key: "adminSecretConfigured", vars: "CAPITAL_FORGE_ADMIN_SECRET", use: "Future protected imports and admin actions." }
];

function rotate<T>(items: T[], by: number, count: number) { return Array.from({ length: Math.min(count, items.length) }, (_, i) => items[(by + i) % items.length]); }
function pct(n: number, d: number) { return d ? Math.round((n / d) * 100) : 0; }

function questionBank(): Question[] {
  return [
    { id: "q1", category: "Valuation", title: "FCFF from EBIT", prompt: "A company has EBIT of ₹100 Cr, tax rate of 25%, D&A of ₹12 Cr, capex of ₹28 Cr and increase in NWC of ₹9 Cr. Calculate FCFF.", type: "Numerical", difficulty: "Medium", xp: 60, numeric: 50, solution: "FCFF = 100 × 75% + 12 − 28 − 9 = ₹50 Cr.", rubric: ["ebit", "tax", "capex", "nwc"] },
    { id: "q2", category: "Private Equity", title: "Paper LBO logic", prompt: "Buy at 10.0x EBITDA. EBITDA is ₹50 Cr. Debt is 5.0x EBITDA. Exit at 9.0x after 5 years with EBITDA of ₹90 Cr and zero debt. Calculate MOIC.", type: "Numerical", difficulty: "Hard", xp: 90, numeric: 3.24, solution: "Entry EV ₹500 Cr, debt ₹250 Cr, equity ₹250 Cr. Exit EV ₹810 Cr. MOIC = 810 / 250 = 3.24x.", rubric: ["entry", "debt", "exit", "moic"] },
    { id: "q3", category: "Investment Banking", title: "EV bridge", prompt: "Which bridge is generally correct?", type: "MCQ", difficulty: "Easy", xp: 30, options: ["Equity Value + Debt + Preferred + Minority Interest − Cash", "Equity Value − Debt + Cash", "EBITDA + Debt − Cash", "Revenue × Margin"], correct: "Equity Value + Debt + Preferred + Minority Interest − Cash", solution: "Enterprise Value = Equity Value + Debt + Preferred Equity + Minority Interest − Cash.", rubric: ["equity", "debt", "cash"] },
    { id: "q4", category: "Financial Modeling", title: "Model audit", prompt: "An analyst links revenue growth directly to EBITDA growth and keeps working capital constant even when revenue doubles. What is wrong and how would you fix it?", type: "Model Review", difficulty: "Medium", xp: 70, solution: "Revenue should flow through price/volume and margin assumptions. Working capital should scale using DSO/DIO/DPO or percentage-of-sales drivers.", rubric: ["working", "capital", "margin", "driver"] },
    { id: "q5", category: "M&A", title: "Accretion/dilution", prompt: "Explain why a strategically good acquisition can still be EPS dilutive in year one.", type: "Subjective", difficulty: "Medium", xp: 55, solution: "Financing cost, new shares, amortization and integration costs can exceed first-year earnings contribution and synergies.", rubric: ["financing", "shares", "synergy", "amortization"] },
    { id: "q6", category: "Private Credit", title: "Covenant choice", prompt: "A borrower has volatile EBITDA and high maintenance capex. Which protects lender downside better: gross leverage only or DSCR/cash-flow covenant?", type: "Judgment", difficulty: "Hard", xp: 85, solution: "DSCR/cash-flow covenant is stronger because it captures actual debt-service capacity after capex and cash volatility.", rubric: ["dscr", "cash", "capex", "liquidity"] },
    { id: "q7", category: "VC", title: "Unit economics", prompt: "SaaS company: CAC payback 28 months, NDR 95%, gross margin 62%, high burn. Growth or efficiency first?", type: "Judgment", difficulty: "Hard", xp: 80, solution: "Efficiency first. Weak NDR, long payback and moderate margin suggest growth can destroy value.", rubric: ["cac", "ndr", "margin", "burn"] },
    { id: "q8", category: "Restructuring", title: "Fulcrum security", prompt: "Define fulcrum security and explain why it matters in distressed investing.", type: "Interview", difficulty: "MD", xp: 110, solution: "It is the claim where enterprise value breaks; it often converts into reorganized equity and drives recovery.", rubric: ["enterprise", "value", "recovery", "equity"] },
    { id: "q9", category: "Accounting", title: "Revenue versus cash", prompt: "Why can revenue grow while operating cash flow falls? Give three reasons.", type: "Subjective", difficulty: "Easy", xp: 35, solution: "Receivables rise, inventory builds, payables shrink, margins fall or revenue quality weakens.", rubric: ["receivable", "inventory", "payable", "margin"] },
    { id: "q10", category: "Markets", title: "Rates and valuation", prompt: "When risk-free rates rise, what happens to DCF valuation, all else equal?", type: "MCQ", difficulty: "Easy", xp: 25, options: ["Valuation generally decreases", "Valuation always increases", "Only revenue changes", "Terminal value disappears"], correct: "Valuation generally decreases", solution: "Higher risk-free rates usually increase discount rates, lowering present value.", rubric: ["discount", "wacc", "present"] },
    { id: "q11", category: "Excel", title: "Shortcut recall", prompt: "On Mac Excel, what shortcut opens Format Cells?", type: "Formula", difficulty: "Easy", xp: 20, solution: "Command + 1 opens Format Cells on Mac Excel.", rubric: ["command", "1", "format"] },
    { id: "q12", category: "Corporate Finance", title: "WACC interpretation", prompt: "Explain why WACC is used for unlevered FCF and not equity cash flow.", type: "Interview", difficulty: "Medium", xp: 60, solution: "Unlevered FCF belongs to all capital providers, so it uses blended debt/equity return. Equity cash flow uses cost of equity.", rubric: ["unlevered", "debt", "equity", "discount"] },
    { id: "q13", category: "Private Equity", title: "Value creation bridge", prompt: "Name four value creation levers in an LBO that are not multiple expansion.", type: "Subjective", difficulty: "Medium", xp: 55, solution: "Revenue growth, margin expansion, working-capital improvement, capex efficiency, debt paydown and add-ons.", rubric: ["revenue", "margin", "working", "debt"] },
    { id: "q14", category: "Investment Banking", title: "Sell-side process", prompt: "What are the key stages of a sell-side M&A process?", type: "Interview", difficulty: "Medium", xp: 50, solution: "Preparation, buyer list, teaser/NDA, CIM, IOIs, management meetings, LOIs, diligence, SPA and closing.", rubric: ["teaser", "cim", "loi", "diligence"] },
    { id: "q15", category: "Valuation", title: "Terminal value risk", prompt: "Why can terminal value dominate a DCF and how do you sanity-check it?", type: "Subjective", difficulty: "Hard", xp: 75, solution: "Sanity-check with exit multiple, terminal growth versus GDP/inflation and implied ROIC.", rubric: ["terminal", "multiple", "growth", "roic"] },
    { id: "q16", category: "Private Credit", title: "Recovery thinking", prompt: "A lender underwrites a 70% LTV loan against cyclical EBITDA. What downside questions should credit committee ask?", type: "Case", difficulty: "MD", xp: 120, solution: "Ask about cyclicality, liquidation value, sponsor support, covenants, burn, priority, asset coverage, refinancing and recovery.", rubric: ["ltv", "recovery", "covenant", "refinancing"] }
  ];
}

function gradeAnswer(q: Question, answer: string): Grade {
  const clean = answer.trim().toLowerCase();
  if (!clean) return { score: 0, correct: false, feedback: "No answer submitted. Attempt it first.", stronger: q.solution };
  if (q.type === "MCQ") { const correct = clean === String(q.correct || "").toLowerCase(); return { score: correct ? 10 : 0, correct, feedback: correct ? "Correct." : "Incorrect. Revisit the bridge and economics.", stronger: q.solution }; }
  if (q.type === "Numerical" && typeof q.numeric === "number") { const parsed = Number(clean.replace(/[^0-9.-]/g, "")); const correct = Number.isFinite(parsed) && Math.abs(parsed - q.numeric) <= (Math.abs(q.numeric) <= 10 ? 0.1 : 1); return { score: correct ? 10 : 5, correct, feedback: correct ? "Correct calculation. Now explain the implication." : `Expected around ${q.numeric}.`, stronger: q.solution }; }
  const hits = q.rubric.filter((word) => clean.includes(word)).length;
  const score = Math.min(10, Math.max(3, hits * 2 + (answer.length > 160 ? 2 : answer.length > 80 ? 1 : 0)));
  return { score, correct: score >= 7, feedback: score >= 7 ? "Strong direction. Use conclusion → driver → risk → decision." : "Partially developed. Add drivers, downside risk and decision impact.", stronger: q.solution };
}

export default function Page() {
  const questions = useMemo(() => questionBank(), []);
  const [tab, setTab] = useState<NavTab>("Home");
  const [store, setStore] = useState<Store>(baseStore);
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState<"All" | Difficulty>("All");
  const [qType, setQType] = useState<"All" | QuestionType>("All");
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [showHint, setShowHint] = useState(false);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [newsOffset, setNewsOffset] = useState(0);
  const [caseOffset, setCaseOffset] = useState(0);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [moduleInput, setModuleInput] = useState("");
  const [moduleOutput, setModuleOutput] = useState<LabResult | null>(null);
  const [activeModule, setActiveModule] = useState(modules[0]);
  const [interviewRole, setInterviewRole] = useState("Private Equity Associate");
  const [interviewOutput, setInterviewOutput] = useState<LabResult | null>(null);
  const [apiInput, setApiInput] = useState("Give me one PE interview question on LBO value creation.");
  const [apiOutput, setApiOutput] = useState<LabResult | null>(null);
  const [importText, setImportText] = useState("");
  const [activity, setActivity] = useState<Activity[]>([]);
  const [toast, setToast] = useState("Phase D ready: integrations are monitored and fallbacks are active.");

  const visibleNews = useMemo(() => rotate(newsBank, newsOffset, 5), [newsOffset]);
  const visibleCases = useMemo(() => rotate(caseBank, caseOffset, 4), [caseOffset]);
  const filtered = questions.filter((q) => (category === "All" || q.category === category) && (difficulty === "All" || q.difficulty === difficulty) && (qType === "All" || q.type === qType));
  const currentQuestion = filtered.length ? filtered[qIndex % filtered.length] : questions[0];
  const solved = store.attempts.length;
  const correct = store.attempts.filter((a) => a.correct).length;
  const accuracy = pct(correct, solved);
  const progress = Math.min(100, Math.round((store.xp / 2500) * 100));
  const supabaseReady = Boolean(health?.keyStatus?.supabaseConfigured);

  function log(text: string, tone: Tone = "blue") { const row = { id: `${Date.now()}-${Math.random()}`, text, at: new Date().toLocaleTimeString(), tone }; setActivity((old) => [row, ...old].slice(0, 12)); setToast(text); }

  useEffect(() => { try { const raw = localStorage.getItem(storeKey); if (raw) setStore({ ...baseStore, ...JSON.parse(raw) }); } catch { setToast("Local progress could not be restored; starting clean."); } void refreshHealth(false); }, []);
  useEffect(() => { try { localStorage.setItem(storeKey, JSON.stringify(store)); } catch { setToast("Local save failed. Export a backup before continuing."); } }, [store]);

  async function refreshHealth(noisy = true) {
    setHealthLoading(true);
    try { const response = await fetch(`/api/health?ts=${Date.now()}`, { cache: "no-store" }); const data = (await response.json()) as Health; setHealth(data); if (noisy) log(data.keyStatus?.supabaseConfigured ? "Health check passed: Supabase is connected." : "Health check passed, but Supabase env is not connected.", data.keyStatus?.supabaseConfigured ? "green" : "red"); }
    catch { if (noisy) log("Health endpoint failed. Check deployment route and Vercel status.", "red"); }
    finally { setHealthLoading(false); }
  }

  function openPracticeFromCase(item: ShortCase) { setCategory(item.category === "Capital Markets" ? "Markets" : item.category); setDifficulty(item.difficulty); setTab("Practice"); setAnswer(""); setSelectedOption(""); setGrade(null); log(`Opened short case: ${item.title}.`, item.tone); }
  function submitAnswer() { const finalAnswer = currentQuestion.type === "MCQ" ? selectedOption : answer; const result = gradeAnswer(currentQuestion, finalAnswer); setGrade(result); const attempt: Attempt = { id: `${Date.now()}`, questionId: currentQuestion.id, title: currentQuestion.title, category: currentQuestion.category, score: result.score, correct: result.correct, answer: finalAnswer, createdAt: new Date().toISOString() }; setStore((s) => ({ ...s, xp: s.xp + Math.round((currentQuestion.xp * result.score) / 10), attempts: [attempt, ...s.attempts].slice(0, 150) })); log(result.correct ? `Correct: +${Math.round((currentQuestion.xp * result.score) / 10)} XP added.` : "Attempt saved. Review the stronger answer.", result.correct ? "green" : "red"); }
  function nextQuestion() { setQIndex((x) => x + 1); setAnswer(""); setSelectedOption(""); setShowHint(false); setGrade(null); log("Loaded next practice question.", "blue"); }
  function toggleBookmark(id: string) { const had = store.bookmarks.includes(id); setStore((s) => ({ ...s, bookmarks: had ? s.bookmarks.filter((x) => x !== id) : [id, ...s.bookmarks] })); log(had ? "Bookmark removed." : "Question bookmarked for review.", "black"); }
  function saveNote(text: string) { const clean = text.trim(); if (!clean) return; setStore((s) => ({ ...s, notes: [`${new Date().toLocaleString()} — ${clean}`, ...s.notes].slice(0, 80) })); log("Saved to Feedback journal.", "green"); }

  async function launchModule(module: Module, input = moduleInput || module.quickPrompt) {
    setActiveModule(module); setModuleOutput({ output: "Running module..." });
    try { const response = await fetch("/api/lab", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ module: module.name, input }) }); const data = (await response.json()) as LabResult; setModuleOutput(data); setStore((s) => ({ ...s, launchedModules: [module.name, ...s.launchedModules.filter((x) => x !== module.name)].slice(0, 30) })); log(`${module.name} launched in ${data.configured ? "connected" : "safe-demo"} mode.`, data.configured ? "green" : "blue"); }
    catch { setModuleOutput({ configured: false, module: module.name, output: "Module call failed. Local UI remains usable.", nextStep: "Run API → Refresh Health, then test again." }); log(`${module.name} request failed.`, "red"); }
  }

  async function startInterview() {
    setInterviewOutput({ output: "Starting mock interview..." });
    try { const response = await fetch("/api/coach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "mock_interview", question: `Run a ${interviewRole} mock interview.`, answer: "Start the mock and evaluate my next answer.", context: interviewRole }) }); const data = (await response.json()) as LabResult; setInterviewOutput(data); log(`Interview Room started: ${interviewRole}.`, "blue"); }
    catch { setInterviewOutput({ configured: false, output: "Local fallback: explain why EBITDA alone is not enough for LBO quality, then defend downside risk." }); log("Interview Room fallback started.", "red"); }
  }

  async function runApiTest(kind: "lab" | "coach" | "market") {
    setApiOutput({ output: "Running API test..." });
    try {
      if (kind === "market") { const response = await fetch("/api/market", { cache: "no-store" }); const data = (await response.json()) as LabResult; setApiOutput(data); log("Market endpoint tested.", data.configured ? "green" : "blue"); return; }
      const endpoint = kind === "coach" ? "/api/coach" : "/api/lab";
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ module: "API Console", mode: "api_console", question: apiInput, answer: apiInput, input: apiInput, context: "Capital Forge API test" }) });
      const data = (await response.json()) as LabResult; setApiOutput(data); log(`${kind === "coach" ? "Coach" : "AI Lab"} endpoint tested.`, data.configured ? "green" : "blue");
    } catch { setApiOutput({ configured: false, output: "API test failed. Check route availability and Vercel deployment logs." }); log("API test failed.", "red"); }
  }

  function exportBackup() { const payload = { exportedAt: new Date().toISOString(), app: "Capital Forge", version: "phase-d", store }; const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `capital-forge-backup-${Date.now()}.json`; anchor.click(); URL.revokeObjectURL(url); setStore((s) => ({ ...s, backups: s.backups + 1 })); log("Progress backup exported.", "green"); }
  function importBackup() { try { const parsed = JSON.parse(importText) as { store?: Store }; if (!parsed.store) throw new Error("missing store"); setStore({ ...baseStore, ...parsed.store }); setImportText(""); log("Backup imported successfully.", "green"); } catch { log("Backup import failed. Paste the full exported JSON.", "red"); } }
  function resetProgress() { setStore(baseStore); setGrade(null); setAnswer(""); setSelectedOption(""); log("Local progress reset.", "red"); }

  return (
    <div className="appShell">
      <aside className="sidebar"><div className="brand"><div className="logo">CF</div><div><b>Capital Forge</b><span>Finance mastery OS</span></div></div><nav>{navTabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav><div className="upgrade"><b>Phase D Integration Layer</b><p>{supabaseReady ? "Supabase connected." : "Local fallback active."} Auth gate intentionally off.</p><button onClick={() => setTab("API")}>Open API Console</button></div><div className="miniLog">{activity.slice(0, 3).map((a) => <p key={a.id}><span className={`dot ${a.tone}`} />{a.text}</p>)}</div></aside>
      <main className="main">
        <header className="topbar"><div className="search"><span>⌕</span><input readOnly placeholder="Search topics, cases, formulas, modules..." onFocus={() => log("Search shell ready. Deep search comes with database expansion.", "blue")} /></div><button className="assistantBtn" onClick={() => launchModule(modules[24])}>✦ AI Assistant</button><button className="iconBtn" onClick={() => setTab("Feedback")}>🔔</button><button className="iconBtn" onClick={() => setTab("Dashboard")}>🏆</button><div className="profile"><span>DC</span><div><b>Deepak</b><small>Keep Going!</small></div></div></header>
        {toast && <div className="toast">{toast}</div>}

        {tab === "Home" && <section className="layoutGrid"><div className="contentCol"><div className="heroCard"><div><p className="eyebrow">AI-powered finance learning</p><h1>Welcome back, Deepak! 👋</h1><p>Practice smarter across IB, PE, VC, private credit, valuation, markets and interviews.</p><div className="statRow"><Stat label="Accuracy" value={`${accuracy}%`} tone="green" /><Stat label="Questions Solved" value={String(solved)} tone="blue" /><Stat label="XP" value={String(store.xp)} tone="red" /></div></div><div className="aiCube"><span>AI</span><p>Connected workflow. Safe fallbacks. Real practice loops.</p></div></div><Panel title="Live News & Updates" action={<button onClick={() => { setNewsOffset((x) => x + 1); log("News cards refreshed.", "blue"); }}>⟳ Refresh</button>} subtitle="Curated market, deal and finance prompts."><div className="newsGrid">{visibleNews.map((n) => <article className="newsCard" key={n.id}><div className={`visual ${n.tone}`}>{n.visual}</div><span className={`tag ${n.tone}`}>{n.tag}</span><small>{n.time}</small><h3>{n.title}</h3><p>{n.summary}</p><button onClick={() => { setModuleInput(`${n.title} — ${n.summary}`); setTab("Advanced"); }}>Turn into Drill →</button></article>)}</div></Panel><Panel title="Featured Short Cases" action={<button onClick={() => { setCaseOffset((x) => x + 1); log("Short cases refreshed.", "green"); }}>⟳ Refresh Cases</button>} subtitle="Short cases rotate even when live APIs are missing."><div className="caseGrid">{visibleCases.map((c, i) => <article className="caseCard" key={c.id}><div><span>Case {i + 1}</span><b className={`tag ${c.tone}`}>{c.category}</b></div><h3>{c.title}</h3><p>{c.summary}</p><small>{c.difficulty} · {c.time}</small><button onClick={() => openPracticeFromCase(c)}>Solve Now →</button></article>)}</div></Panel></div><aside className="rightRail"><Card title="Your Progress"><div className="donut" style={{ background: `conic-gradient(#2563eb ${progress}%, #e5e7eb 0)` }}><span>{progress}%</span></div><p>Overall progress based on XP target.</p></Card><Card title="7 Day Streak"><div className="streak">{["✓", "✓", "✓", "✓", "F", "S", "S"].map((x, i) => <span key={i}>{x}</span>)}</div><p>One drill daily keeps momentum.</p></Card><Card title="AI Insights"><p>Best answers include formula, driver, risk and decision. Weakness: speed under pressure.</p><button onClick={() => launchModule(modules[8])}>View Insights →</button></Card><Card title="Quick Actions"><div className="quick"><button onClick={() => setTab("Practice")}>▶ Practice</button><button onClick={() => setTab("Advanced")}>▣ Advanced</button><button onClick={startInterview}>🎥 Mock</button><button onClick={exportBackup}>↧ Backup</button></div></Card></aside></section>}

        {tab === "Practice" && <section className="twoCol"><Panel title="Practice Controls" subtitle="Filter, attempt, review and bookmark."><label>Category<select value={category} onChange={(e) => { setCategory(e.target.value); setQIndex(0); }}>{categories.map((x) => <option key={x}>{x}</option>)}</select></label><label>Difficulty<select value={difficulty} onChange={(e) => { setDifficulty(e.target.value as "All" | Difficulty); setQIndex(0); }}>{difficulties.map((x) => <option key={x}>{x}</option>)}</select></label><label>Question Type<select value={qType} onChange={(e) => { setQType(e.target.value as "All" | QuestionType); setQIndex(0); }}>{qTypes.map((x) => <option key={x}>{x}</option>)}</select></label><button onClick={nextQuestion}>Random / Next Question</button><button className="secondary" onClick={() => { setCategory("All"); setDifficulty("All"); setQType("All"); }}>Reset Filters</button></Panel><Panel title={currentQuestion.title} subtitle={`${currentQuestion.category} · ${currentQuestion.type} · ${currentQuestion.difficulty} · ${currentQuestion.xp} XP`}><p className="prompt">{currentQuestion.prompt}</p>{currentQuestion.type === "MCQ" && currentQuestion.options ? <div className="options">{currentQuestion.options.map((o) => <button key={o} className={selectedOption === o ? "selected" : ""} onClick={() => setSelectedOption(o)}>{o}</button>)}</div> : <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Conclusion → calculation/driver → risk → decision." />}<label>Confidence: {confidence}/5<input type="range" min="1" max="5" value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} /></label><div className="actions"><button onClick={submitAnswer}>Submit Answer</button><button className="secondary" onClick={() => setShowHint((x) => !x)}>Hint</button><button className="secondary" onClick={() => toggleBookmark(currentQuestion.id)}>{store.bookmarks.includes(currentQuestion.id) ? "Bookmarked" : "Bookmark"}</button><button className="secondary" onClick={nextQuestion}>Next</button></div>{showHint && <div className="note">Hint: start with the formula or decision rule, then explain the economic implication.</div>}{grade && <div className={`result ${grade.correct ? "good" : "bad"}`}><b>Score: {grade.score}/10</b><p>{grade.feedback}</p><p><b>Stronger answer:</b> {grade.stronger}</p><button onClick={() => saveNote(`Practice review — ${currentQuestion.title}: ${grade.stronger}`)}>Save to Feedback</button></div>}</Panel></section>}

        {tab === "Advanced" && <section><Panel title="Advanced AI Modules" subtitle="25 modules. Missing keys return safe-demo output."><div className="moduleLauncher"><textarea value={moduleInput} onChange={(e) => setModuleInput(e.target.value)} placeholder="Paste answer, project, case, model logic, deal thesis or question here..." /><button onClick={() => launchModule(activeModule)}>Run Selected Module</button><button className="secondary" onClick={() => saveNote(moduleOutput?.output || moduleOutput?.feedback || "")}>Save Output to Feedback</button></div>{(moduleOutput?.output || moduleOutput?.feedback) && <pre>{moduleOutput.output || moduleOutput.feedback}{moduleOutput.nextStep ? `\n\nNext: ${moduleOutput.nextStep}` : ""}</pre>}</Panel><div className="moduleGrid">{modules.map((m) => <article key={m.name} className={activeModule.name === m.name ? "module activeModule" : "module"}><span>{m.bucket}</span><h3>{m.name}</h3><p>{m.description}</p><small>Requires: {m.required}</small><div><button onClick={() => { setActiveModule(m); launchModule(m, m.quickPrompt); }}>Launch</button><button className="secondary" onClick={() => { setActiveModule(m); setModuleInput(m.quickPrompt); }}>Load Prompt</button></div></article>)}</div></section>}

        {tab === "Dashboard" && <section className="dashboardGrid"><Stat label="Total XP" value={String(store.xp)} tone="blue" /><Stat label="Attempts" value={String(solved)} tone="black" /><Stat label="Accuracy" value={`${accuracy}%`} tone="green" /><Stat label="Bookmarks" value={String(store.bookmarks.length)} tone="red" /><Panel title="Category Performance" subtitle="Live from local attempt history.">{categories.filter((x) => x !== "All").slice(0, 10).map((c) => { const rows = store.attempts.filter((a) => a.category === c); return <div className="progressLine" key={c}><span>{c}</span><i><b style={{ width: `${pct(rows.filter((r) => r.correct).length, rows.length)}%` }} /></i><small>{rows.length} attempts</small></div>; })}</Panel><Panel title="Recent Attempts" subtitle="Last saved practice attempts.">{store.attempts.length ? store.attempts.slice(0, 8).map((a) => <div className="attempt" key={a.id}><b>{a.title}</b><span>{a.category}</span><small>{a.score}/10 · {a.correct ? "Correct" : "Review"}</small></div>) : <p>No attempts yet.</p>}</Panel></section>}

        {tab === "Feedback" && <section className="twoCol"><Panel title="Feedback Journal" subtitle="Save reflections, module outputs and mistake reviews."><textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Write a note here, or paste backup JSON for import." /><div className="actions"><button onClick={() => saveNote(importText)}>Save Note</button><button className="secondary" onClick={exportBackup}>Export Backup</button><button className="secondary" onClick={importBackup}>Import Backup</button><button className="danger" onClick={resetProgress}>Reset Local Progress</button></div></Panel><Panel title="Saved Notes & Mistakes" subtitle="Your latest review items.">{store.notes.length ? store.notes.slice(0, 12).map((n, i) => <div className="noteItem" key={`${n}-${i}`}>{n}</div>) : <p>No saved notes yet.</p>}</Panel></section>}

        {tab === "Interview Room" && <section className="twoCol"><Panel title="Mock Interview Setup" subtitle="Start a role-specific pressure round."><label>Role<select value={interviewRole} onChange={(e) => setInterviewRole(e.target.value)}>{["Investment Banking Analyst", "Private Equity Associate", "VC / Growth Investor", "Private Credit Analyst", "CFO / Strategic Finance", "MD Pressure Round"].map((x) => <option key={x}>{x}</option>)}</select></label><button onClick={startInterview}>Start Mock Interview</button><button className="secondary" onClick={() => launchModule(modules[1], `Run a ${interviewRole} pressure interview.`)}>Send to MD Pressure Room</button></Panel><Panel title="Interview Output" subtitle="Uses AI provider when connected; otherwise local fallback.">{interviewOutput?.output || interviewOutput?.feedback ? <pre>{interviewOutput.output || interviewOutput.feedback}</pre> : <p>Choose a role and start a mock interview.</p>}</Panel></section>}

        {tab === "API" && <section><Panel title="API Command Center" subtitle="Dedicated integration tab. Status comes from /api/health."><div className="actions"><button onClick={() => refreshHealth(true)}>{healthLoading ? "Checking..." : "Refresh Health"}</button><button className="secondary" onClick={() => runApiTest("lab")}>Test AI Lab</button><button className="secondary" onClick={() => runApiTest("coach")}>Test Coach</button><button className="secondary" onClick={() => runApiTest("market")}>Test Market</button></div><textarea value={apiInput} onChange={(e) => setApiInput(e.target.value)} placeholder="Prompt for API test output..." />{apiOutput && <pre>{JSON.stringify(apiOutput, null, 2)}</pre>}</Panel><div className="apiGrid">{apiSlots.map((slot) => { const connected = Boolean(health?.keyStatus?.[slot.key]); return <article className="apiCard" key={slot.key}><div><h3>{slot.label}</h3><span className={connected ? "connected" : "missing"}>{connected ? "Connected" : "Not Connected"}</span></div><p>{slot.use}</p><code>{slot.vars}</code></article>; })}</div><Panel title="Workflow Guardrail" subtitle="Current production-safe state."><p>{supabaseReady ? "Supabase environment is present in production. Since auth gate is intentionally removed, user-specific cloud writes should wait until auth is approved." : "Supabase is not available in this deployment. The app is safely using local storage."}</p><p>Local backup/export is active, so practice data can be preserved before full multi-user auth is added.</p></Panel></section>}
      </main>
    </div>
  );
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) { return <section className="panel"><div className="panelHead"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>; }
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="card"><h3>{title}</h3>{children}</section>; }
function Stat({ label, value, tone }: { label: string; value: string; tone: Tone }) { return <div className={`stat ${tone}`}><span>{label}</span><b>{value}</b></div>; }
