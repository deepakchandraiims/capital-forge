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
type NewsItem = { id: string; tag: string; tone: Tone; title: string; summary: string; time: string; visual: string; source?: string; url?: string };
type ShortCase = { id: string; category: string; title: string; summary: string; difficulty: Difficulty; time: string; tone: Tone };
type Module = { name: string; bucket: string; description: string; required: string; quickPrompt: string };
type Health = { app?: string; phase?: string; status?: string; safeMode?: boolean; modules?: number; providers?: Record<string, string>; keyStatus?: Record<string, boolean>; generatedAt?: string; message?: string };
type Quote = { symbol: string; name?: string; exchange?: string; currency?: string; price: number | null; change: number | null; percentChange: number | null; open?: number | null; high?: number | null; low?: number | null; previousClose?: number | null; volume?: number | null; timestamp?: string };
type MarketEvent = { title?: string; assetClass?: string; question?: string; task?: string };
type FundamentalsPayload = { symbol?: string; provider?: string; latest?: Record<string, unknown>; history?: Record<string, unknown>[]; practicePrompt?: string };
type ApiResult = { configured?: boolean; provider?: string; backup?: boolean; warning?: string; primaryWarning?: string; module?: string; output?: string; feedback?: string; strongerAnswer?: string; nextStep?: string; news?: NewsItem[]; quote?: Quote; fundamentals?: FundamentalsPayload; events?: MarketEvent[] };
type Grade = { score: number; correct: boolean; feedback: string; stronger: string };
type Activity = { id: string; text: string; at: string; tone: Tone };

const storeKey = "capital-forge-phase-e-open-app";
const navTabs: NavTab[] = ["Home", "Practice", "Advanced", "Dashboard", "Feedback", "Interview Room", "API"];
const baseStore: Store = { xp: 0, attempts: [], bookmarks: [], notes: [], launchedModules: [], backups: 0 };

const newsBank: NewsItem[] = [
  { id: "n1", tag: "Markets", tone: "blue", title: "Equities rally as inflation expectations cool", summary: "Practice discount-rate sensitivity, WACC movement and exit multiple compression.", time: "Demo", visual: "📈", source: "Capital Forge Demo" },
  { id: "n2", tag: "AI & Tech", tone: "black", title: "AI capex cycle raises valuation discipline questions", summary: "Compare revenue growth with cash conversion, capex intensity and terminal margin risk.", time: "Demo", visual: "🤖", source: "Capital Forge Demo" },
  { id: "n3", tag: "PE / M&A", tone: "red", title: "Sponsors stay selective as dry powder meets high multiples", summary: "A useful mini-case for entry leverage, value creation and downside structure.", time: "Demo", visual: "🏦", source: "Capital Forge Demo" },
  { id: "n4", tag: "Credit", tone: "green", title: "Private credit terms tighten for cyclical borrowers", summary: "Think through DSCR, covenants, cash sweep, pricing and downside recovery.", time: "Demo", visual: "🧾", source: "Capital Forge Demo" },
  { id: "n5", tag: "Macro", tone: "blue", title: "Currency volatility changes imported inflation assumptions", summary: "Build a quick sensitivity around FX, gross margin and working capital.", time: "Demo", visual: "🌐", source: "Capital Forge Demo" },
  { id: "n6", tag: "Restructuring", tone: "red", title: "Highly levered borrowers face maturity-wall pressure", summary: "Practice fulcrum-security thinking and recovery waterfall logic.", time: "Demo", visual: "⚠️", source: "Capital Forge Demo" },
  { id: "n7", tag: "VC", tone: "green", title: "Growth investors demand cleaner unit economics", summary: "Move beyond TAM and focus on CAC payback, NDR, gross margin and burn multiple.", time: "Demo", visual: "🚀", source: "Capital Forge Demo" },
  { id: "n8", tag: "IB", tone: "black", title: "Boards revisit strategic alternatives in slower growth pockets", summary: "Frame a sell-side pitch: buyer universe, valuation range, timing and process risk.", time: "Demo", visual: "📊", source: "Capital Forge Demo" }
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
  { name: "Recruiter Mode", bucket: "Career", description: "Score your project like an IB/PE recruiter.", required: "AI_API_KEY", quickPrompt: "Rate my finance project like a PE recruiter." },
  { name: "MD Pressure Room", bucket: "Interview", description: "Turn any answer into a senior pressure round.", required: "AI_API_KEY", quickPrompt: "Pressure test my answer as a managing director." },
  { name: "Deal Teardown Library", bucket: "Deals", description: "Break a deal into thesis, valuation, risks and financing.", required: "NEWS_API_KEY + AI_API_KEY", quickPrompt: "Create a deal teardown checklist." },
  { name: "Excel Muscle Memory", bucket: "Modeling", description: "Timed shortcut drills for analyst speed.", required: "No key", quickPrompt: "Give me a 10-minute Excel shortcut sprint." },
  { name: "Model Error Hunter", bucket: "Modeling", description: "Find formula, sign, circularity and assumption mistakes.", required: "AI_API_KEY", quickPrompt: "Audit this model logic for mistakes." },
  { name: "IC Memo Builder", bucket: "PE", description: "Turn raw investment thinking into IC memo format.", required: "AI_API_KEY", quickPrompt: "Convert this thesis into an IC memo." },
  { name: "Would You Invest Game", bucket: "Judgment", description: "Make invest/pass/reprice decisions.", required: "AI_API_KEY", quickPrompt: "Give me an investment snapshot." },
  { name: "Live News Question Engine", bucket: "Markets", description: "Convert headlines into finance mini-cases.", required: "NEWS_API_KEY", quickPrompt: "Turn today’s market theme into questions." },
  { name: "Personal Weakness Graph", bucket: "Analytics", description: "Map wrong attempts to concept weakness.", required: "Supabase", quickPrompt: "Summarize my weakest finance topics." },
  { name: "Interview Bank by Firm", bucket: "Recruiting", description: "Generate firm-style drills for banks and funds.", required: "AI_API_KEY", quickPrompt: "Give me KKR-style PE questions." },
  { name: "Deal Math Speed Trainer", bucket: "Mental Math", description: "EV, leverage, IRR, MOIC and dilution drills.", required: "No key", quickPrompt: "Create 10 deal math questions." },
  { name: "Investment Journal AI", bucket: "Thinking", description: "Rate and improve daily investment thinking.", required: "AI_API_KEY", quickPrompt: "Rate this investment journal entry." },
  { name: "Pitchbook Simulator", bucket: "IB", description: "Build teaser, CIM, buyer list and process timeline.", required: "AI_API_KEY", quickPrompt: "Create a sell-side pitchbook outline." },
  { name: "LBO Paper Test", bucket: "PE", description: "30-minute paper LBO with return bridge.", required: "No key", quickPrompt: "Give me a paper LBO test." },
  { name: "Private Credit Underwriting", bucket: "Credit", description: "DSCR, covenants, recovery and downside case.", required: "AI_API_KEY", quickPrompt: "Create a private credit underwriting case." },
  { name: "Founder Call Simulator", bucket: "Diligence", description: "Simulate a founder call with hidden red flags.", required: "AI_API_KEY", quickPrompt: "Act like a founder in diligence." },
  { name: "Red Flag Detector", bucket: "Diligence", description: "Scan narratives for governance and cash-flow risks.", required: "FILINGS_API_KEY + AI_API_KEY", quickPrompt: "List red flags in an annual report." },
  { name: "Cap Table Simulator", bucket: "VC", description: "Rounds, ESOP, preference and dilution practice.", required: "No key", quickPrompt: "Create a VC cap table mini-case." },
  { name: "Career Path Engine", bucket: "Career", description: "Build a weekly roadmap to IB/PE/credit.", required: "AI_API_KEY", quickPrompt: "Create a 12-week IB/PE transition plan." },
  { name: "Portfolio Project Tracker", bucket: "Career", description: "Track models, memos and recruiter proof points.", required: "Supabase", quickPrompt: "Design a recruiter-grade project tracker." },
  { name: "Real Filing Reader", bucket: "Research", description: "Convert filings into diligence checklists.", required: "FILINGS_API_KEY", quickPrompt: "Give me a filing review checklist." },
  { name: "AI Mentor Personas", bucket: "Mentors", description: "Switch between IB, PE, credit, VC and CFO mentors.", required: "AI_API_KEY", quickPrompt: "Coach me like a PE VP." },
  { name: "Bad Answer Rewriter", bucket: "Communication", description: "Rewrite weak answers into crisp interview responses.", required: "AI_API_KEY", quickPrompt: "Rewrite my answer into a strong response." },
  { name: "Case Competition Mode", bucket: "Projects", description: "Simulate a 48-hour model, memo and deck case.", required: "AI_API_KEY + Supabase", quickPrompt: "Create a 48-hour PE case brief." },
  { name: "Daily Killer Insight", bucket: "Learning", description: "One sharp finance concept and mini question.", required: "AI_API_KEY / NEWS_API_KEY", quickPrompt: "Give me one killer finance insight." }
];

const categories = ["All", "Accounting", "Corporate Finance", "Valuation", "Financial Modeling", "Excel", "Investment Banking", "M&A", "Private Equity", "VC", "Private Credit", "Markets", "Restructuring", "Interviews"];
const difficulties: ("All" | Difficulty)[] = ["All", "Easy", "Medium", "Hard", "MD"];
const qTypes: ("All" | QuestionType)[] = ["All", "MCQ", "Subjective", "Numerical", "Formula", "Model Review", "Case", "Interview", "Judgment"];
const apiSlots = [
  { label: "Supabase", key: "supabaseConfigured", vars: "NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", use: "Progress persistence, future auth and user state." },
  { label: "AI Coach", key: "aiConfigured", vars: "AI_API_URL + AI_API_KEY", use: "Advanced modules and answer coaching." },
  { label: "News", key: "newsConfigured", vars: "NEWS_API_PROVIDER=marketaux + NEWS_API_KEY", use: "Live news refresh and headline-to-case conversion." },
  { label: "Market Data", key: "marketConfigured", vars: "MARKET_DATA_PROVIDER=twelvedata + MARKET_DATA_API_KEY", use: "Live market quotes and market-based drills." },
  { label: "Backup Market", key: "backupMarketConfigured", vars: "BACKUP_MARKET_PROVIDER=alphavantage + BACKUP_MARKET_API_KEY", use: "Fallback quote provider if Twelve Data fails." },
  { label: "Fundamentals", key: "fundamentalsConfigured", vars: "FUNDAMENTALS_PROVIDER=fmp + FUNDAMENTALS_API_KEY", use: "Income statements, ratios and fundamental modeling drills." },
  { label: "Filings", key: "filingsConfigured", vars: "FILINGS_API_URL + FILINGS_API_KEY", use: "Annual report, SEC/MCA and filing drills." },
  { label: "Recruiter Review", key: "recruiterReviewConfigured", vars: "RESUME_REVIEW_API_URL + RESUME_REVIEW_API_KEY", use: "Project and resume scoring workflows." },
  { label: "Admin Secret", key: "adminSecretConfigured", vars: "CAPITAL_FORGE_ADMIN_SECRET", use: "Future protected imports and admin actions." }
];

function rotate<T>(items: T[], by: number, count: number) { return Array.from({ length: Math.min(count, items.length) }, (_, i) => items[(by + i) % items.length]); }
function pct(n: number, d: number) { return d ? Math.round((n / d) * 100) : 0; }
function asTone(value: unknown): Tone { return value === "red" || value === "green" || value === "black" || value === "blue" ? value : "blue"; }
function money(value: number | null | undefined) { return typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"; }

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
  if (q.type === "MCQ") {
    const correct = clean === String(q.correct || "").toLowerCase();
    return { score: correct ? 10 : 0, correct, feedback: correct ? "Correct." : "Incorrect. Revisit the bridge and economics.", stronger: q.solution };
  }
  if (q.type === "Numerical" && typeof q.numeric === "number") {
    const parsed = Number(clean.replace(/[^0-9.-]/g, ""));
    const correct = Number.isFinite(parsed) && Math.abs(parsed - q.numeric) <= (Math.abs(q.numeric) <= 10 ? 0.1 : 1);
    return { score: correct ? 10 : 5, correct, feedback: correct ? "Correct calculation. Now explain the implication." : `Expected around ${q.numeric}.`, stronger: q.solution };
  }
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
  const [caseOffset, setCaseOffset] = useState(0);
  const [news, setNews] = useState<NewsItem[]>(newsBank.slice(0, 5));
  const [newsLoading, setNewsLoading] = useState(false);
  const [marketSymbol, setMarketSymbol] = useState("AAPL");
  const [health, setHealth] = useState<Health | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [moduleInput, setModuleInput] = useState("");
  const [moduleOutput, setModuleOutput] = useState<ApiResult | null>(null);
  const [activeModule, setActiveModule] = useState(modules[0]);
  const [interviewRole, setInterviewRole] = useState("Private Equity Associate");
  const [interviewOutput, setInterviewOutput] = useState<ApiResult | null>(null);
  const [apiInput, setApiInput] = useState("Give me one PE interview question on LBO value creation.");
  const [apiOutput, setApiOutput] = useState<ApiResult | null>(null);
  const [marketOutput, setMarketOutput] = useState<ApiResult | null>(null);
  const [fundamentalsOutput, setFundamentalsOutput] = useState<ApiResult | null>(null);
  const [importText, setImportText] = useState("");
  const [activity, setActivity] = useState<Activity[]>([]);
  const [toast, setToast] = useState("Phase E ready: provider adapters active, keys stay server-side.");

  const visibleCases = useMemo(() => rotate(caseBank, caseOffset, 4), [caseOffset]);
  const filtered = questions.filter((q) => (category === "All" || q.category === category) && (difficulty === "All" || q.difficulty === difficulty) && (qType === "All" || q.type === qType));
  const currentQuestion = filtered.length ? filtered[qIndex % filtered.length] : questions[0];
  const solved = store.attempts.length;
  const correct = store.attempts.filter((a) => a.correct).length;
  const accuracy = pct(correct, solved);
  const progress = Math.min(100, Math.round((store.xp / 2500) * 100));
  const supabaseReady = Boolean(health?.keyStatus?.supabaseConfigured);
  const quote = marketOutput?.quote;

  function log(text: string, tone: Tone = "blue") {
    const row = { id: `${Date.now()}-${Math.random()}`, text, at: new Date().toLocaleTimeString(), tone };
    setActivity((old) => [row, ...old].slice(0, 12));
    setToast(text);
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) setStore({ ...baseStore, ...JSON.parse(raw) });
    } catch {
      setToast("Local progress could not be restored; starting clean.");
    }
    void refreshHealth(false);
    void refreshNews(false);
    void refreshMarket(false);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(storeKey, JSON.stringify(store)); }
    catch { setToast("Local save failed. Export a backup before continuing."); }
  }, [store]);

  async function refreshHealth(noisy = true) {
    setHealthLoading(true);
    try {
      const response = await fetch(`/api/health?ts=${Date.now()}`, { cache: "no-store" });
      const data = (await response.json()) as Health;
      setHealth(data);
      if (noisy) log(data.keyStatus?.newsConfigured ? "Health check passed: provider keys detected." : "Health check passed, but live news key is missing.", data.keyStatus?.newsConfigured ? "green" : "red");
    } catch {
      if (noisy) log("Health endpoint failed. Check deployment route and Vercel status.", "red");
    } finally {
      setHealthLoading(false);
    }
  }

  async function refreshNews(noisy = true) {
    setNewsLoading(true);
    try {
      const response = await fetch(`/api/news?limit=8&ts=${Date.now()}`, { cache: "no-store" });
      const data = (await response.json()) as ApiResult;
      const liveNews = Array.isArray(data.news) && data.news.length ? data.news.map((n) => ({ ...n, tone: asTone(n.tone), visual: n.visual || "📰", source: n.source || data.provider || "Provider" })) : newsBank;
      setNews(liveNews.slice(0, 5));
      if (noisy) log(data.configured ? "Live Marketaux news loaded." : "Demo news loaded because Marketaux is not active yet.", data.configured ? "green" : "blue");
    } catch {
      setNews(rotate(newsBank, Date.now() % newsBank.length, 5));
      if (noisy) log("News provider failed. Demo news loaded safely.", "red");
    } finally {
      setNewsLoading(false);
    }
  }

  async function refreshMarket(noisy = true) {
    try {
      const response = await fetch(`/api/market?symbol=${encodeURIComponent(marketSymbol || "AAPL")}&ts=${Date.now()}`, { cache: "no-store" });
      const data = (await response.json()) as ApiResult;
      setMarketOutput(data);
      if (noisy) log(data.configured ? `Market quote loaded from ${data.provider}.` : "Demo market quote loaded.", data.configured ? "green" : "blue");
    } catch {
      setMarketOutput({ configured: false, warning: "Market endpoint failed." });
      if (noisy) log("Market endpoint failed.", "red");
    }
  }

  async function refreshFundamentals(noisy = true) {
    try {
      const response = await fetch(`/api/fundamentals?symbol=${encodeURIComponent(marketSymbol || "AAPL")}&limit=5&ts=${Date.now()}`, { cache: "no-store" });
      const data = (await response.json()) as ApiResult;
      setFundamentalsOutput(data);
      if (noisy) log(data.configured ? `FMP fundamentals loaded for ${marketSymbol.toUpperCase()}.` : "Demo fundamentals loaded because FMP key is missing.", data.configured ? "green" : "blue");
    } catch {
      setFundamentalsOutput({ configured: false, warning: "Fundamentals endpoint failed." });
      if (noisy) log("Fundamentals endpoint failed.", "red");
    }
  }

  function openPracticeFromCase(item: ShortCase) {
    setCategory(item.category === "Capital Markets" ? "Markets" : item.category);
    setDifficulty(item.difficulty);
    setTab("Practice");
    setAnswer("");
    setSelectedOption("");
    setGrade(null);
    log(`Opened short case: ${item.title}.`, item.tone);
  }

  function submitAnswer() {
    const finalAnswer = currentQuestion.type === "MCQ" ? selectedOption : answer;
    const result = gradeAnswer(currentQuestion, finalAnswer);
    setGrade(result);
    const attempt: Attempt = { id: `${Date.now()}`, questionId: currentQuestion.id, title: currentQuestion.title, category: currentQuestion.category, score: result.score, correct: result.correct, answer: finalAnswer, createdAt: new Date().toISOString() };
    setStore((s) => ({ ...s, xp: s.xp + Math.round((currentQuestion.xp * result.score) / 10), attempts: [attempt, ...s.attempts].slice(0, 150) }));
    log(result.correct ? `Correct: +${Math.round((currentQuestion.xp * result.score) / 10)} XP added.` : "Attempt saved. Review the stronger answer.", result.correct ? "green" : "red");
  }

  function nextQuestion() { setQIndex((x) => x + 1); setAnswer(""); setSelectedOption(""); setShowHint(false); setGrade(null); log("Loaded next practice question.", "blue"); }
  function toggleBookmark(id: string) { const had = store.bookmarks.includes(id); setStore((s) => ({ ...s, bookmarks: had ? s.bookmarks.filter((x) => x !== id) : [id, ...s.bookmarks] })); log(had ? "Bookmark removed." : "Question bookmarked for review.", "black"); }
  function saveNote(text: string) { const clean = text.trim(); if (!clean) return; setStore((s) => ({ ...s, notes: [`${new Date().toLocaleString()} — ${clean}`, ...s.notes].slice(0, 80) })); log("Saved to Feedback journal.", "green"); }

  async function launchModule(module: Module, input = moduleInput || module.quickPrompt) {
    setActiveModule(module); setModuleOutput({ output: "Running module..." });
    try {
      const response = await fetch("/api/lab", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ module: module.name, input }) });
      const data = (await response.json()) as ApiResult;
      setModuleOutput(data);
      setStore((s) => ({ ...s, launchedModules: [module.name, ...s.launchedModules.filter((x) => x !== module.name)].slice(0, 30) }));
      log(`${module.name} launched in ${data.configured ? "connected" : "safe-demo"} mode.`, data.configured ? "green" : "blue");
    } catch {
      setModuleOutput({ configured: false, module: module.name, output: "Module call failed. Local UI remains usable.", nextStep: "Run API → Refresh Health, then test again." });
      log(`${module.name} request failed.`, "red");
    }
  }

  async function startInterview() {
    setInterviewOutput({ output: "Starting mock interview..." });
    try {
      const response = await fetch("/api/coach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "mock_interview", question: `Run a ${interviewRole} mock interview.`, answer: "Start the mock and evaluate my next answer.", context: interviewRole }) });
      const data = (await response.json()) as ApiResult;
      setInterviewOutput(data);
      log(`Interview Room started: ${interviewRole}.`, "blue");
    } catch {
      setInterviewOutput({ configured: false, output: "Local fallback: explain why EBITDA alone is not enough for LBO quality, then defend downside risk." });
      log("Interview Room fallback started.", "red");
    }
  }

  async function runApiTest(kind: "lab" | "coach" | "market" | "news" | "fundamentals") {
    setApiOutput({ output: "Running API test..." });
    if (kind === "market") { await refreshMarket(true); setApiOutput({ ...marketOutput, output: "Market test sent. See Market Console below." }); return; }
    if (kind === "news") { await refreshNews(true); setApiOutput({ configured: health?.keyStatus?.newsConfigured, provider: "marketaux", output: "News test sent. See Home news cards." }); return; }
    if (kind === "fundamentals") { await refreshFundamentals(true); setApiOutput({ output: "Fundamentals test sent. See FMP panel below." }); return; }
    try {
      const endpoint = kind === "coach" ? "/api/coach" : "/api/lab";
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ module: "API Console", mode: "api_console", question: apiInput, answer: apiInput, input: apiInput, context: "Capital Forge API test" }) });
      const data = (await response.json()) as ApiResult;
      setApiOutput(data);
      log(`${kind === "coach" ? "Coach" : "AI Lab"} endpoint tested.`, data.configured ? "green" : "blue");
    } catch {
      setApiOutput({ configured: false, output: "API test failed. Check route availability and Vercel deployment logs." });
      log("API test failed.", "red");
    }
  }

  function exportBackup() {
    const payload = { exportedAt: new Date().toISOString(), app: "Capital Forge", version: "phase-e", store };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `capital-forge-backup-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStore((s) => ({ ...s, backups: s.backups + 1 }));
    log("Progress backup exported.", "green");
  }

  function importBackup() { try { const parsed = JSON.parse(importText) as { store?: Store }; if (!parsed.store) throw new Error("missing store"); setStore({ ...baseStore, ...parsed.store }); setImportText(""); log("Backup imported successfully.", "green"); } catch { log("Backup import failed. Paste the full exported JSON.", "red"); } }
  function resetProgress() { setStore(baseStore); setGrade(null); setAnswer(""); setSelectedOption(""); log("Local progress reset.", "red"); }

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand"><div className="logo">CF</div><div><b>Capital Forge</b><span>Finance mastery OS</span></div></div>
        <nav>{navTabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
        <div className="upgrade"><b>Phase E Provider Layer</b><p>{supabaseReady ? "Supabase connected." : "Local fallback active."} Marketaux/Twelve/Alpha/FMP adapters ready.</p><button onClick={() => setTab("API")}>Open API Console</button></div>
        <div className="miniLog">{activity.slice(0, 3).map((a) => <p key={a.id}><span className={`dot ${a.tone}`} />{a.text}</p>)}</div>
      </aside>

      <main className="main">
        <header className="topbar"><div className="search"><span>⌕</span><input readOnly placeholder="Search topics, cases, formulas, modules..." onFocus={() => log("Search shell ready. Deep search comes with database expansion.", "blue")} /></div><button className="assistantBtn" onClick={() => launchModule(modules[24])}>✦ AI Assistant</button><button className="iconBtn" onClick={() => setTab("Feedback")}>🔔</button><button className="iconBtn" onClick={() => setTab("Dashboard")}>🏆</button><div className="profile"><span>DC</span><div><b>Deepak</b><small>Keep Going!</small></div></div></header>
        {toast && <div className="toast">{toast}</div>}

        {tab === "Home" && <section className="layoutGrid"><div className="contentCol"><div className="heroCard"><div><p className="eyebrow">AI-powered finance learning</p><h1>Welcome back, Deepak! 👋</h1><p>Practice smarter across IB, PE, VC, private credit, valuation, markets and interviews.</p><div className="statRow"><Stat label="Accuracy" value={`${accuracy}%`} tone="green" /><Stat label="Questions Solved" value={String(solved)} tone="blue" /><Stat label="XP" value={String(store.xp)} tone="red" /></div></div><div className="aiCube"><span>AI</span><p>Live news + market adapters. Safe demo fallback when keys are missing.</p></div></div><Panel title="Live News & Updates" action={<button onClick={() => refreshNews(true)}>{newsLoading ? "Loading..." : "⟳ Refresh Live News"}</button>} subtitle="Marketaux when connected; demo cards when not."><div className="newsGrid">{news.map((n) => <article className="newsCard" key={n.id}><div className={`visual ${n.tone}`}>{n.visual}</div><span className={`tag ${n.tone}`}>{n.tag}</span><small>{n.time} · {n.source}</small><h3>{n.title}</h3><p>{n.summary}</p><button onClick={() => { if (n.url) window.open(n.url, "_blank", "noopener,noreferrer"); else { setModuleInput(`${n.title} — ${n.summary}`); setTab("Advanced"); } }}>{n.url ? "Read Source →" : "Turn into Drill →"}</button></article>)}</div></Panel><Panel title="Featured Short Cases" action={<button onClick={() => { setCaseOffset((x) => x + 1); log("Short cases refreshed.", "green"); }}>⟳ Refresh Cases</button>} subtitle="Short cases rotate even when live APIs are missing."><div className="caseGrid">{visibleCases.map((c, i) => <article className="caseCard" key={c.id}><div><span>Case {i + 1}</span><b className={`tag ${c.tone}`}>{c.category}</b></div><h3>{c.title}</h3><p>{c.summary}</p><small>{c.difficulty} · {c.time}</small><button onClick={() => openPracticeFromCase(c)}>Solve Now →</button></article>)}</div></Panel></div><aside className="rightRail"><Card title="Market Snapshot"><label>Symbol<input value={marketSymbol} onChange={(e) => setMarketSymbol(e.target.value.toUpperCase())} /></label><button onClick={() => refreshMarket(true)}>Refresh Quote</button>{quote && <p><b>{quote.symbol}</b>: {money(quote.price)} {quote.currency || ""} · {money(quote.change)} / {money(quote.percentChange)}%</p>}<small>{marketOutput?.provider ? `Provider: ${marketOutput.provider}` : "Provider not tested yet"}</small></Card><Card title="Your Progress"><div className="donut" style={{ background: `conic-gradient(#2563eb ${progress}%, #e5e7eb 0)` }}><span>{progress}%</span></div><p>Overall progress based on XP target.</p></Card><Card title="7 Day Streak"><div className="streak">{["✓", "✓", "✓", "✓", "F", "S", "S"].map((x, i) => <span key={i}>{x}</span>)}</div><p>One drill daily keeps momentum.</p></Card><Card title="Quick Actions"><div className="quick"><button onClick={() => setTab("Practice")}>▶ Practice</button><button onClick={() => setTab("Advanced")}>▣ Advanced</button><button onClick={startInterview}>🎥 Mock</button><button onClick={exportBackup}>↧ Backup</button></div></Card></aside></section>}

        {tab === "Practice" && <section className="twoCol"><Panel title="Practice Controls" subtitle="Filter, attempt, review and bookmark."><label>Category<select value={category} onChange={(e) => { setCategory(e.target.value); setQIndex(0); }}>{categories.map((x) => <option key={x}>{x}</option>)}</select></label><label>Difficulty<select value={difficulty} onChange={(e) => { setDifficulty(e.target.value as "All" | Difficulty); setQIndex(0); }}>{difficulties.map((x) => <option key={x}>{x}</option>)}</select></label><label>Question Type<select value={qType} onChange={(e) => { setQType(e.target.value as "All" | QuestionType); setQIndex(0); }}>{qTypes.map((x) => <option key={x}>{x}</option>)}</select></label><button onClick={nextQuestion}>Random / Next Question</button><button className="secondary" onClick={() => { setCategory("All"); setDifficulty("All"); setQType("All"); }}>Reset Filters</button></Panel><Panel title={currentQuestion.title} subtitle={`${currentQuestion.category} · ${currentQuestion.type} · ${currentQuestion.difficulty} · ${currentQuestion.xp} XP`}><p className="prompt">{currentQuestion.prompt}</p>{currentQuestion.type === "MCQ" && currentQuestion.options ? <div className="options">{currentQuestion.options.map((o) => <button key={o} className={selectedOption === o ? "selected" : ""} onClick={() => setSelectedOption(o)}>{o}</button>)}</div> : <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Conclusion → calculation/driver → risk → decision." />}<label>Confidence: {confidence}/5<input type="range" min="1" max="5" value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} /></label><div className="actions"><button onClick={submitAnswer}>Submit Answer</button><button className="secondary" onClick={() => setShowHint((x) => !x)}>Hint</button><button className="secondary" onClick={() => toggleBookmark(currentQuestion.id)}>{store.bookmarks.includes(currentQuestion.id) ? "Bookmarked" : "Bookmark"}</button><button className="secondary" onClick={nextQuestion}>Next</button></div>{showHint && <div className="note">Hint: start with the formula or decision rule, then explain the economic implication.</div>}{grade && <div className={`result ${grade.correct ? "good" : "bad"}`}><b>Score: {grade.score}/10</b><p>{grade.feedback}</p><p><b>Stronger answer:</b> {grade.stronger}</p><button onClick={() => saveNote(`Practice review — ${currentQuestion.title}: ${grade.stronger}`)}>Save to Feedback</button></div>}</Panel></section>}

        {tab === "Advanced" && <section><Panel title="Advanced AI Modules" subtitle="25 modules. Missing keys return safe-demo output."><div className="moduleLauncher"><textarea value={moduleInput} onChange={(e) => setModuleInput(e.target.value)} placeholder="Paste answer, project, case, model logic, deal thesis or question here..." /><button onClick={() => launchModule(activeModule)}>Run Selected Module</button><button className="secondary" onClick={() => saveNote(moduleOutput?.output || moduleOutput?.feedback || "")}>Save Output to Feedback</button></div>{(moduleOutput?.output || moduleOutput?.feedback) && <pre>{moduleOutput.output || moduleOutput.feedback}{moduleOutput.nextStep ? `\n\nNext: ${moduleOutput.nextStep}` : ""}</pre>}</Panel><div className="moduleGrid">{modules.map((m) => <article key={m.name} className={activeModule.name === m.name ? "module activeModule" : "module"}><span>{m.bucket}</span><h3>{m.name}</h3><p>{m.description}</p><small>Requires: {m.required}</small><div><button onClick={() => { setActiveModule(m); launchModule(m, m.quickPrompt); }}>Launch</button><button className="secondary" onClick={() => { setActiveModule(m); setModuleInput(m.quickPrompt); }}>Load Prompt</button></div></article>)}</div></section>}

        {tab === "Dashboard" && <section className="dashboardGrid"><Stat label="Total XP" value={String(store.xp)} tone="blue" /><Stat label="Attempts" value={String(solved)} tone="black" /><Stat label="Accuracy" value={`${accuracy}%`} tone="green" /><Stat label="Bookmarks" value={String(store.bookmarks.length)} tone="red" /><Panel title="Category Performance" subtitle="Live from local attempt history.">{categories.filter((x) => x !== "All").slice(0, 10).map((c) => { const rows = store.attempts.filter((a) => a.category === c); return <div className="progressLine" key={c}><span>{c}</span><i><b style={{ width: `${pct(rows.filter((r) => r.correct).length, rows.length)}%` }} /></i><small>{rows.length} attempts</small></div>; })}</Panel><Panel title="Recent Attempts" subtitle="Last saved practice attempts.">{store.attempts.length ? store.attempts.slice(0, 8).map((a) => <div className="attempt" key={a.id}><b>{a.title}</b><span>{a.category}</span><small>{a.score}/10 · {a.correct ? "Correct" : "Review"}</small></div>) : <p>No attempts yet.</p>}</Panel></section>}

        {tab === "Feedback" && <section className="twoCol"><Panel title="Feedback Journal" subtitle="Save reflections, module outputs and mistake reviews."><textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Write a note here, or paste backup JSON for import." /><div className="actions"><button onClick={() => saveNote(importText)}>Save Note</button><button className="secondary" onClick={exportBackup}>Export Backup</button><button className="secondary" onClick={importBackup}>Import Backup</button><button className="danger" onClick={resetProgress}>Reset Local Progress</button></div></Panel><Panel title="Saved Notes & Mistakes" subtitle="Your latest review items.">{store.notes.length ? store.notes.slice(0, 12).map((n, i) => <div className="noteItem" key={`${n}-${i}`}>{n}</div>) : <p>No saved notes yet.</p>}</Panel></section>}

        {tab === "Interview Room" && <section className="twoCol"><Panel title="Mock Interview Setup" subtitle="Start a role-specific pressure round."><label>Role<select value={interviewRole} onChange={(e) => setInterviewRole(e.target.value)}>{["Investment Banking Analyst", "Private Equity Associate", "VC / Growth Investor", "Private Credit Analyst", "CFO / Strategic Finance", "MD Pressure Round"].map((x) => <option key={x}>{x}</option>)}</select></label><button onClick={startInterview}>Start Mock Interview</button><button className="secondary" onClick={() => launchModule(modules[1], `Run a ${interviewRole} pressure interview.`)}>Send to MD Pressure Room</button></Panel><Panel title="Interview Output" subtitle="Uses AI provider when connected; otherwise local fallback.">{interviewOutput?.output || interviewOutput?.feedback ? <pre>{interviewOutput.output || interviewOutput.feedback}</pre> : <p>Choose a role and start a mock interview.</p>}</Panel></section>}

        {tab === "API" && <section><Panel title="API Command Center" subtitle="Dedicated integration tab. Status comes from /api/health."><div className="actions"><button onClick={() => refreshHealth(true)}>{healthLoading ? "Checking..." : "Refresh Health"}</button><button className="secondary" onClick={() => runApiTest("news")}>Test News</button><button className="secondary" onClick={() => runApiTest("market")}>Test Market</button><button className="secondary" onClick={() => runApiTest("fundamentals")}>Test FMP</button><button className="secondary" onClick={() => runApiTest("lab")}>Test AI Lab</button><button className="secondary" onClick={() => runApiTest("coach")}>Test Coach</button></div><textarea value={apiInput} onChange={(e) => setApiInput(e.target.value)} placeholder="Prompt for API test output..." />{apiOutput && <pre>{JSON.stringify(apiOutput, null, 2)}</pre>}</Panel><div className="apiGrid">{apiSlots.map((slot) => { const connected = Boolean(health?.keyStatus?.[slot.key]); return <article className="apiCard" key={slot.key}><div><h3>{slot.label}</h3><span className={connected ? "connected" : "missing"}>{connected ? "Connected" : "Not Connected"}</span></div><p>{slot.use}</p><code>{slot.vars}</code></article>; })}</div><Panel title="Market Console" subtitle="Twelve Data primary, Alpha Vantage backup."><label>Symbol<input value={marketSymbol} onChange={(e) => setMarketSymbol(e.target.value.toUpperCase())} /></label><button onClick={() => refreshMarket(true)}>Refresh Market</button>{marketOutput && <pre>{JSON.stringify(marketOutput, null, 2)}</pre>}</Panel><Panel title="Fundamentals Console" subtitle="FMP income statement adapter. Needs real FMP key."><button onClick={() => refreshFundamentals(true)}>Load Fundamentals</button>{fundamentalsOutput && <pre>{JSON.stringify(fundamentalsOutput, null, 2)}</pre>}</Panel><Panel title="Workflow Guardrail" subtitle="Current production-safe state."><p>{supabaseReady ? "Supabase environment is present in production. Since auth gate is intentionally removed, user-specific cloud writes should wait until auth is approved." : "Supabase is not available in this deployment. The app is safely using local storage."}</p><p>Provider keys are read only by server routes. They are not exposed in the browser or committed to GitHub.</p></Panel></section>}
      </main>
    </div>
  );
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) { return <section className="panel"><div className="panelHead"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>; }
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="card"><h3>{title}</h3>{children}</section>; }
function Stat({ label, value, tone }: { label: string; value: string; tone: Tone }) { return <div className={`stat ${tone}`}><span>{label}</span><b>{value}</b></div>; }
