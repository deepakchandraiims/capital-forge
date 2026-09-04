"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";

type Tab = "Home" | "Practice" | "Advanced" | "Dashboard" | "Feedback" | "Interview Room" | "API";
type Tone = "blue" | "red" | "green" | "purple" | "black";
type Difficulty = "Easy" | "Medium" | "Hard" | "MD";

type NewsItem = {
  id: string;
  tag: string;
  tone: Tone;
  title: string;
  summary: string;
  time: string;
  visual?: string;
  imageUrl?: string;
  source?: string;
  url?: string;
};

type Quote = {
  symbol?: string;
  name?: string;
  exchange?: string;
  currency?: string;
  price?: number | null;
  change?: number | null;
  percentChange?: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  previousClose?: number | null;
  volume?: number | null;
  timestamp?: string;
};

type Health = {
  app?: string;
  status?: string;
  phase?: string;
  providers?: Record<string, string>;
  sources?: Record<string, string>;
  keyStatus?: Record<string, boolean>;
};

type Attempt = {
  id: string;
  question: string;
  answer: string;
  score: number;
  correct: boolean;
  createdAt: string;
  category: string;
};

type Store = { xp: number; attempts: Attempt[]; notes: string[]; streak: number; bookmarks: string[] };
type Question = { id: string; category: string; difficulty: Difficulty; title: string; prompt: string; options?: string[]; correct?: string; numeric?: number; solution: string; xp: number };
type Module = { name: string; bucket: string; description: string; prompt: string; accent: Tone };
type CaseItem = { id: string; title: string; tag: string; difficulty: Difficulty; minutes: number; summary: string; tone: Tone };
type Vault = {
  aiUrl: string;
  aiKey: string;
  aiModel: string;
  newsKey: string;
  marketKey: string;
  backupMarketKey: string;
  fundamentalsKey: string;
  fundamentalsUrl: string;
};

const tabs: Tab[] = ["Home", "Practice", "Advanced", "Dashboard", "Feedback", "Interview Room", "API"];
const storeKey = "capital-forge-phase-f-store";
const vaultKey = "capital-forge-phase-e-api-vault";
const baseStore: Store = { xp: 0, attempts: [], notes: [], streak: 0, bookmarks: [] };
const emptyVault: Vault = { aiUrl: "", aiKey: "", aiModel: "", newsKey: "", marketKey: "", backupMarketKey: "", fundamentalsKey: "", fundamentalsUrl: "" };

const fallbackNews: NewsItem[] = [
  { id: "demo-1", tag: "Markets", tone: "green", title: "Markets desk is ready for live updates", summary: "Refresh to pull Marketaux headlines and convert them into drills.", time: "Demo", visual: "📈", source: "Capital Forge" },
  { id: "demo-2", tag: "AI & Tech", tone: "blue", title: "AI capex cycle creates valuation debate", summary: "Turn this into a DCF, margin and terminal multiple question.", time: "Demo", visual: "🤖", source: "Capital Forge" },
  { id: "demo-3", tag: "PE / M&A", tone: "red", title: "Sponsors stay selective on entry multiples", summary: "Practice leverage, exit multiple and downside return sensitivity.", time: "Demo", visual: "🏦", source: "Capital Forge" },
  { id: "demo-4", tag: "Credit", tone: "black", title: "Private credit underwriting mode online", summary: "Convert debt market context into DSCR, covenant and recovery questions.", time: "Demo", visual: "🧾", source: "Capital Forge" },
  { id: "demo-5", tag: "Global", tone: "purple", title: "Macro signals are driving deal timing", summary: "Ask what lower rates mean for valuations, debt capacity and exits.", time: "Demo", visual: "🌐", source: "Capital Forge" }
];

const caseBank: CaseItem[] = [
  { id: "case-1", title: "Build a 3-Statement Model", tag: "Financial Modeling", difficulty: "Medium", minutes: 45, summary: "Build a linked model and derive key valuation metrics.", tone: "blue" },
  { id: "case-2", title: "DCF Valuation Analysis", tag: "Valuation", difficulty: "Medium", minutes: 40, summary: "Estimate intrinsic value and conduct sensitivity analysis.", tone: "red" },
  { id: "case-3", title: "Buy-Side M&A Case", tag: "M&A", difficulty: "Hard", minutes: 60, summary: "Assess synergies, diligence risks and accretion/dilution impact.", tone: "green" },
  { id: "case-4", title: "Market Entry Strategy", tag: "Market Analysis", difficulty: "Medium", minutes: 35, summary: "Evaluate market attractiveness and propose a go-to-market thesis.", tone: "purple" },
  { id: "case-5", title: "Private Credit Memo", tag: "Credit", difficulty: "Hard", minutes: 50, summary: "Underwrite leverage, DSCR, covenants, collateral and downside recovery.", tone: "black" },
  { id: "case-6", title: "Paper LBO Sprint", tag: "Private Equity", difficulty: "Hard", minutes: 25, summary: "Calculate entry equity, exit value, MOIC and IRR under time pressure.", tone: "blue" }
];

const questions: Question[] = [
  { id: "q1", category: "Valuation", difficulty: "Medium", title: "FCFF from EBIT", prompt: "A company has EBIT of ₹100 Cr, tax rate 25%, D&A ₹12 Cr, capex ₹28 Cr and NWC increase ₹9 Cr. Calculate FCFF.", numeric: 50, solution: "FCFF = EBIT × (1 − tax) + D&A − capex − ΔNWC = 100 × 75% + 12 − 28 − 9 = ₹50 Cr.", xp: 80 },
  { id: "q2", category: "Private Equity", difficulty: "Hard", title: "Paper LBO", prompt: "Buy at 10.0x EBITDA. EBITDA is ₹50 Cr. Debt is 5.0x EBITDA. Exit after 5 years at 9.0x EBITDA with EBITDA ₹90 Cr and zero debt. Calculate MOIC.", numeric: 3.24, solution: "Entry EV ₹500 Cr, debt ₹250 Cr, equity ₹250 Cr. Exit EV ₹810 Cr. MOIC = 810 / 250 = 3.24x.", xp: 120 },
  { id: "q3", category: "Investment Banking", difficulty: "Easy", title: "Enterprise Value Bridge", prompt: "Which formula is correct?", options: ["Equity Value + Debt + Preferred + Minority Interest − Cash", "Equity Value − Debt + Cash", "EBITDA + Debt − Cash", "Revenue × EBITDA margin"], correct: "Equity Value + Debt + Preferred + Minority Interest − Cash", solution: "EV equals equity value plus debt, preferred equity and minority interest, minus cash and equivalents.", xp: 50 },
  { id: "q4", category: "Private Credit", difficulty: "MD", title: "Credit Committee View", prompt: "A sponsor wants 5.5x leverage on a cyclical asset with 18% EBITDA margin and weak cash conversion. What questions do you ask before lending?", solution: "Focus on cash conversion, maintenance capex, cyclicality, customer concentration, covenant headroom, collateral value, repayment path and downside recovery.", xp: 150 }
];

const modules: Module[] = [
  { name: "Recruiter Mode", bucket: "Career", description: "Turn your work into recruiter-grade signals.", prompt: "Review my finance profile like a PE recruiter and give brutally specific improvements.", accent: "blue" },
  { name: "MD Pressure Room", bucket: "Interview", description: "Senior-level interruption, pushback and judgment drills.", prompt: "Pressure test my answer like a PE managing director.", accent: "red" },
  { name: "Deal Teardown Library", bucket: "M&A", description: "Break live headlines into thesis, valuation, financing and risks.", prompt: "Create a deal teardown using today’s market context.", accent: "blue" },
  { name: "Excel Muscle Memory", bucket: "Modeling", description: "Keyboard-first modeling speed and shortcut drills.", prompt: "Give me a timed Excel modeling drill with Mac and Windows shortcuts.", accent: "green" },
  { name: "Model Error Hunter", bucket: "Modeling", description: "Find broken formulas, sign errors and weak forecast logic.", prompt: "Audit this financial model logic for errors.", accent: "purple" },
  { name: "IC Memo Builder", bucket: "Private Equity", description: "Convert raw investment thinking into IC-ready memo sections.", prompt: "Build an IC memo structure for a mid-market acquisition.", accent: "green" },
  { name: "Would You Invest Game", bucket: "Judgment", description: "Ambiguous invest/pass decisions with second-order pressure.", prompt: "Create an invest/pass case with no obvious answer.", accent: "black" },
  { name: "Live News Question Engine", bucket: "Markets", description: "Convert fresh market news into finance interview drills.", prompt: "Turn the latest market event into 5 practice questions.", accent: "red" },
  { name: "Personal Weakness Graph", bucket: "Analytics", description: "Diagnose recurring gaps from your attempts.", prompt: "Analyze my recent attempts and identify my biggest weakness patterns.", accent: "purple" },
  { name: "Interview Bank by Firm", bucket: "Interview", description: "IB, PE, VC, credit and market interview simulations.", prompt: "Build a PE Associate technical interview round.", accent: "blue" },
  { name: "Deal Math Speed Trainer", bucket: "Math", description: "Fast EV, leverage, dilution and IRR calculations.", prompt: "Give me 10 deal math questions under time pressure.", accent: "green" },
  { name: "Investment Journal AI", bucket: "Public Markets", description: "Record thesis, probability, catalyst and post-mortem.", prompt: "Help me write an investment journal entry for a stock idea.", accent: "black" },
  { name: "Pitchbook Simulator", bucket: "IB", description: "Mandate strategy, positioning and buyer universe drills.", prompt: "Create a sell-side pitchbook outline and questions from the client CEO.", accent: "blue" },
  { name: "LBO Paper Test", bucket: "Private Equity", description: "Paper LBO returns and entry price pressure tests.", prompt: "Give me a paper LBO question and grade the answer.", accent: "green" },
  { name: "Private Credit Underwriting", bucket: "Credit", description: "DSCR, covenants, downside case and recovery.", prompt: "Create a private credit underwriting case.", accent: "black" },
  { name: "Founder Call Simulator", bucket: "VC", description: "Founder diligence and market narrative probing.", prompt: "Simulate a founder call for a growth equity investment.", accent: "purple" },
  { name: "Red Flag Detector", bucket: "Diligence", description: "Spot quality, accounting and commercial red flags.", prompt: "Give me a diligence case and ask me to identify red flags.", accent: "red" },
  { name: "Cap Table Simulator", bucket: "VC", description: "Option pools, dilution and liquidation preference math.", prompt: "Create a cap table dilution drill.", accent: "green" },
  { name: "Career Path Engine", bucket: "Career", description: "Map skills to target roles and gaps.", prompt: "Create a 90-day plan to move from FP&A/M&A to PE or IB.", accent: "blue" },
  { name: "Portfolio Project Tracker", bucket: "Projects", description: "Track recruiter-ready finance projects.", prompt: "Score my finance project and suggest the next deliverable.", accent: "black" },
  { name: "Real Filing Reader", bucket: "Filings", description: "Extract filing facts into practice questions.", prompt: "Create an annual report reading drill.", accent: "red" },
  { name: "AI Mentor Personas", bucket: "Coach", description: "Switch between analyst, VP, MD and IC partner styles.", prompt: "Act as a skeptical IC partner and challenge my thesis.", accent: "purple" },
  { name: "Bad Answer Rewriter", bucket: "Communication", description: "Rewrite answers into crisp associate/VP responses.", prompt: "Rewrite my weak answer into a strong interview response.", accent: "blue" },
  { name: "Case Competition Mode", bucket: "Boss Fight", description: "Multi-step case with scoring and pressure.", prompt: "Launch a 30-minute finance case competition.", accent: "green" },
  { name: "Daily Killer Insight", bucket: "Daily", description: "One insight that improves market or deal judgment.", prompt: "Give me today’s killer finance insight with a drill.", accent: "red" }
];

const apiSlots = [
  ["Supabase", "supabaseConfigured", "Cloud database", "🟢"],
  ["News", "newsConfigured", "Marketaux live headlines", "🔴"],
  ["Market", "marketConfigured", "Twelve Data quotes", "📊"],
  ["Backup", "backupMarketConfigured", "Alpha Vantage fallback", "🛡️"],
  ["FMP", "fundamentalsConfigured", "Stable financial statements", "📑"],
  ["AI", "aiConfigured", "NVIDIA NIM / OpenAI-compatible", "✦"]
] as const;

const navIcons: Record<Tab, string> = { Home: "⌂", Practice: "✣", Advanced: "⌁", Dashboard: "▦", Feedback: "▣", "Interview Room": "▹", API: "⚙" };

function clampPct(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function pct(part: number, total: number) {
  return total ? clampPct((part / total) * 100) : 0;
}

function formatNumber(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatPct(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function normalizeTone(value?: string): Tone {
  return value === "red" || value === "green" || value === "purple" || value === "black" || value === "blue" ? value : "blue";
}

function safeJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function maskKey(value: string) {
  if (!value) return "empty";
  if (value.length <= 8) return "saved";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export default function CapitalForge() {
  const [tab, setTab] = useState<Tab>("Home");
  const [store, setStore] = useState<Store>(baseStore);
  const [news, setNews] = useState<NewsItem[]>(fallbackNews);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [apiResult, setApiResult] = useState<unknown>({ status: "Ready", message: "Run any API test from the command center." });
  const [vault, setVault] = useState<Vault>(emptyVault);
  const [symbol, setSymbol] = useState("AAPL");
  const [currentQuestion, setCurrentQuestion] = useState<Question>(questions[0]);
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<null | { correct: boolean; score: number; feedback: string }>(null);
  const [selectedModule, setSelectedModule] = useState<Module>(modules[1]);
  const [moduleInput, setModuleInput] = useState("Create a live market-to-interview drill using today's data.");
  const [aiOutput, setAiOutput] = useState("Launch an advanced module to generate AI output here.");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [lastUpdated, setLastUpdated] = useState("Just now");
  const [caseOffset, setCaseOffset] = useState(0);

  useEffect(() => {
    try {
      const rawStore = localStorage.getItem(storeKey);
      const rawVault = localStorage.getItem(vaultKey);
      if (rawStore) setStore({ ...baseStore, ...JSON.parse(rawStore) });
      if (rawVault) setVault({ ...emptyVault, ...JSON.parse(rawVault) });
    } catch {
      setStore(baseStore);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(storeKey, JSON.stringify(store));
  }, [store]);

  useEffect(() => {
    void refreshAll();
  }, []);

  const attempts = store.attempts;
  const correctAttempts = attempts.filter((x) => x.correct).length;
  const accuracy = pct(correctAttempts, attempts.length);
  const progress = clampPct(store.xp / 20);
  const connectedCount = apiSlots.filter(([, key]) => health?.keyStatus?.[key]).length;
  const visibleCases = useMemo(() => [...caseBank, ...caseBank].slice(caseOffset, caseOffset + 4), [caseOffset]);
  const activeNews = news.length ? news.slice(0, 5) : fallbackNews;

  function headers() {
    const result: Record<string, string> = {};
    if (vault.aiUrl) result["x-capital-forge-ai-url"] = vault.aiUrl;
    if (vault.aiKey) result["x-capital-forge-ai-key"] = vault.aiKey;
    if (vault.aiModel) result["x-capital-forge-ai-model"] = vault.aiModel;
    if (vault.newsKey) result["x-capital-forge-news-key"] = vault.newsKey;
    if (vault.marketKey) result["x-capital-forge-market-key"] = vault.marketKey;
    if (vault.backupMarketKey) result["x-capital-forge-backup-market-key"] = vault.backupMarketKey;
    if (vault.fundamentalsKey) result["x-capital-forge-fundamentals-key"] = vault.fundamentalsKey;
    if (vault.fundamentalsUrl) result["x-capital-forge-fundamentals-url"] = vault.fundamentalsUrl;
    return result;
  }

  async function getJson(url: string, init?: RequestInit) {
    const response = await fetch(url, { ...init, headers: { ...headers(), ...(init?.headers || {}) }, cache: "no-store" });
    return response.json();
  }

  async function refreshHealth() {
    const data = await getJson("/api/health");
    setHealth(data);
    setApiResult(data);
    return data;
  }

  async function refreshNews() {
    setBusy("news");
    try {
      const data = await getJson("/api/news?limit=5");
      const pulled = Array.isArray(data.news) ? data.news : [];
      setNews(pulled.length ? pulled.map((item: NewsItem, index: number) => ({ ...item, id: item.id || `news-${index}`, tone: normalizeTone(item.tone) })) : fallbackNews);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setApiResult(data);
    } catch (error) {
      setApiResult({ error: error instanceof Error ? error.message : "News refresh failed" });
      setNews(fallbackNews);
    } finally {
      setBusy("");
    }
  }

  async function refreshQuote(nextSymbol = symbol) {
    setBusy("quote");
    try {
      const data = await getJson(`/api/market?symbol=${encodeURIComponent(nextSymbol || "AAPL")}`);
      setQuote(data.quote || null);
      setApiResult(data);
    } catch (error) {
      setApiResult({ error: error instanceof Error ? error.message : "Market quote failed" });
    } finally {
      setBusy("");
    }
  }

  async function testFundamentals() {
    setBusy("fundamentals");
    try {
      const data = await getJson(`/api/fundamentals?symbol=${encodeURIComponent(symbol || "AAPL")}`);
      setApiResult(data);
    } finally {
      setBusy("");
    }
  }

  async function refreshAll() {
    await Promise.allSettled([refreshHealth(), refreshNews(), refreshQuote("AAPL")]);
  }

  function submitAnswer() {
    const normalized = answer.trim().toLowerCase();
    let correct = false;
    if (currentQuestion.options?.length) correct = normalized === String(currentQuestion.correct || "").toLowerCase();
    else if (typeof currentQuestion.numeric === "number") correct = Math.abs(Number(normalized.replace(/[₹,x]/g, "")) - currentQuestion.numeric) <= Math.max(0.05, currentQuestion.numeric * 0.02);
    else correct = normalized.length > 120;

    const score = correct ? 9 : normalized.length > 50 ? 6 : 4;
    const attempt: Attempt = { id: crypto.randomUUID(), question: currentQuestion.title, answer, score, correct, createdAt: new Date().toISOString(), category: currentQuestion.category };
    setStore((prev) => ({ ...prev, xp: prev.xp + (correct ? currentQuestion.xp : 20), attempts: [attempt, ...prev.attempts].slice(0, 40), streak: Math.max(1, prev.streak || 1) }));
    setGrade({ correct, score, feedback: correct ? currentQuestion.solution : `Not yet. ${currentQuestion.solution}` });
  }

  async function launchModule(module = selectedModule) {
    setSelectedModule(module);
    setTab("Advanced");
    setBusy("ai");
    setAiOutput("Running AI module...");
    try {
      const data = await getJson("/api/lab", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ module: module.name, input: moduleInput })
      });
      setApiResult(data);
      setAiOutput(data.output || data.feedback || safeJson(data));
    } catch (error) {
      setAiOutput(error instanceof Error ? error.message : "AI module failed");
    } finally {
      setBusy("");
    }
  }

  async function testCoach() {
    setBusy("coach");
    try {
      const data = await getJson("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "test", question: "Capital Forge API test", answer: "I would analyze revenue, margins, cash conversion, valuation, risk and decision impact.", context: "live platform test" })
      });
      setApiResult(data);
    } finally {
      setBusy("");
    }
  }

  function saveNote() {
    if (!note.trim()) return;
    setStore((prev) => ({ ...prev, notes: [`${new Date().toLocaleString()}: ${note.trim()}`, ...prev.notes].slice(0, 25) }));
    setNote("");
  }

  function bookmarkCurrent() {
    setStore((prev) => ({ ...prev, bookmarks: prev.bookmarks.includes(currentQuestion.id) ? prev.bookmarks : [currentQuestion.id, ...prev.bookmarks] }));
  }

  function nextQuestion() {
    const index = questions.findIndex((q) => q.id === currentQuestion.id);
    setCurrentQuestion(questions[(index + 1) % questions.length]);
    setAnswer("");
    setGrade(null);
  }

  function openSource(item: NewsItem) {
    if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
  }

  function saveVault() {
    localStorage.setItem(vaultKey, JSON.stringify(vault));
    setApiResult({ saved: true, source: "browser-vault", message: "API vault saved locally in this browser. Vercel env remains the production source." });
    void refreshHealth();
  }

  function clearVault() {
    localStorage.removeItem(vaultKey);
    setVault(emptyVault);
    setApiResult({ cleared: true, message: "Browser vault cleared. Vercel environment variables will still work." });
  }

  function Home() {
    return (
      <div className="home-layout">
        <section className="center-stack">
          <div className="hero-panel">
            <div className="hero-copy">
              <p className="eyebrow">AI-powered finance learning</p>
              <h1>Welcome back, <span>Deepak!</span> 👋</h1>
              <p>Practice smarter across IB, PE, VC, private credit, valuation, markets and interviews.</p>
              <div className="hero-stats">
                <MiniStat label="AI Accuracy" value={`${accuracy}%`} tone="green" sub="Adaptive scoring" />
                <MiniStat label="Questions Solved" value={String(attempts.length)} tone="blue" sub={`${correctAttempts} correct`} />
                <MiniStat label="XP" value={String(store.xp)} tone="red" sub="Live progress" />
              </div>
            </div>
            <div className="hero-art" aria-label="AI command center">
              <div className="orbit one" />
              <div className="orbit two" />
              <div className="ai-block">AI</div>
              <div className="hero-chip left">DCF</div>
              <div className="hero-chip right">LBO</div>
            </div>
          </div>

          <section className="section-card news-section">
            <div className="section-head">
              <div>
                <h2><span className="red-dot" /> Live News & Updates</h2>
                <p>Marketaux-powered headlines converted into finance practice context.</p>
              </div>
              <div className="head-actions">
                <small>Last updated: {lastUpdated}</small>
                <button onClick={refreshNews} disabled={busy === "news"}>{busy === "news" ? "Refreshing..." : "↻ Refresh"}</button>
              </div>
            </div>
            <div className="news-row">
              {activeNews.map((item) => <NewsCard key={item.id} item={item} />)}
            </div>
          </section>

          <section className="section-card case-section">
            <div className="section-head">
              <div>
                <h2><span className="case-icon">▰</span> Featured Short Cases</h2>
                <p>Real-world scenarios to sharpen modeling, valuation and investment judgment.</p>
              </div>
              <button onClick={() => setCaseOffset((caseOffset + 1) % caseBank.length)}>↻ Refresh Cases</button>
            </div>
            <div className="case-row">
              {visibleCases.map((item, index) => <CaseCard key={`${item.id}-${index}`} item={item} index={index + 1} />)}
            </div>
          </section>
        </section>

        <aside className="right-rail">
          <ProgressCard />
          <StreakCard />
          <InsightsCard />
          <RecommendedCard />
          <QuickActions />
        </aside>
      </div>
    );
  }

  function NewsCard({ item }: { item: NewsItem }) {
    return (
      <article className="news-card">
        <div className={`news-visual ${item.tone}`}>
          {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span>{item.visual || visualFor(item.tag)}</span>}
        </div>
        <div className="news-meta"><span className={`pill ${item.tone}`}>{item.tag || "Markets"}</span><small>{item.time || "Live"}</small></div>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
        <div className="news-footer"><small>{item.source || "Live source"}</small><button onClick={() => openSource(item)}>Read Source →</button></div>
      </article>
    );
  }

  function CaseCard({ item, index }: { item: CaseItem; index: number }) {
    return (
      <article className="case-card">
        <div className="case-meta"><span>Case {index}</span><b className={`pill ${item.tone}`}>{item.tag}</b></div>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
        <div className="case-stats"><span>▥ {item.difficulty}</span><span>◷ ~{item.minutes} min</span></div>
        <button onClick={() => { setTab("Practice"); setCurrentQuestion(questions[index % questions.length]); }}>Solve Now →</button>
      </article>
    );
  }

  function ProgressCard() {
    return (
      <div className="rail-card progress-card">
        <div className="rail-title"><h3>Your Progress</h3><button onClick={() => setTab("Dashboard")}>View Dashboard →</button></div>
        <div className="donut" style={{ background: `conic-gradient(#2563eb ${progress * 3.6}deg, #e8edf5 0deg)` }}><span>{progress}%<small>Overall</small></span></div>
        <div className="progress-list"><Row label="Practice" value={accuracy || 0} tone="green" /><Row label="Advanced" value={connectedCount * 14} tone="blue" /><Row label="Interview" value={store.streak ? 68 : 0} tone="purple" /></div>
      </div>
    );
  }

  function StreakCard() {
    return <div className="rail-card streak-card"><div><h3>🔥 7 Day Streak</h3><p>Keep it up!</p></div><b>{store.streak || 0}<small>Days</small></b><div className="week"><span>✓</span><span>✓</span><span>✓</span><span>✓</span><span className="today">F</span><span>S</span><span>S</span></div></div>;
  }

  function InsightsCard() {
    return <div className="rail-card insight-card"><h3>AI Insights <span>New</span></h3><p>You perform best in Valuation and Modeling. Focus on Market Analysis to balance interview readiness.</p><button onClick={() => launchModule(modules[8])}>View Insights →</button><div className="orb">AI</div></div>;
  }

  function RecommendedCard() {
    const recs = ["Complete 5 more Advanced questions", "Try a hard case this weekend", "Book a mock interview"];
    return <div className="rail-card rec-card"><h3>Recommended For You</h3>{recs.map((r, i) => <button key={r} onClick={() => i === 2 ? setTab("Interview Room") : setTab(i === 1 ? "Practice" : "Advanced")}><span>{i === 0 ? "🎯" : i === 1 ? "🧠" : "👤"}</span><div>{r}<small>+{(i + 1) * 100} XP</small></div><b>›</b></button>)}</div>;
  }

  function QuickActions() {
    return <div className="rail-card quick-card"><h3>Quick Actions</h3><div><button onClick={() => setTab("Practice")}>▶<span>Start Practice</span></button><button onClick={() => setTab("Advanced")}>▥<span>Go Advanced</span></button><button onClick={() => setTab("Interview Room")}>▣<span>Interview Room</span></button><button onClick={() => setTab("API")}>⚙<span>API Vault</span></button></div></div>;
  }

  function Practice() {
    return (
      <div className="workspace-grid">
        <section className="section-card practice-panel">
          <div className="section-head"><div><h2>Practice Engine</h2><p>Objective, subjective, numerical and judgment-based finance drills.</p></div><div className="head-actions"><button onClick={nextQuestion}>Next Question</button><button className="ghost" onClick={bookmarkCurrent}>Bookmark</button></div></div>
          <div className="filters"><select defaultValue="All"><option>All</option><option>Valuation</option><option>Private Equity</option><option>Investment Banking</option><option>Private Credit</option></select><select defaultValue="Adaptive"><option>Adaptive</option><option>Easy</option><option>Medium</option><option>Hard</option><option>MD</option></select><button onClick={() => setCurrentQuestion(questions[Math.floor(Math.random() * questions.length)])}>Challenge Me</button></div>
          <div className="question-card"><div><span className="pill blue">{currentQuestion.category}</span><span className="pill red">{currentQuestion.difficulty}</span><span className="pill green">{currentQuestion.xp} XP</span></div><h3>{currentQuestion.title}</h3><p>{currentQuestion.prompt}</p>{currentQuestion.options ? <div className="option-grid">{currentQuestion.options.map((option) => <button key={option} className={answer === option ? "selected" : ""} onClick={() => setAnswer(option)}>{option}</button>)}</div> : <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your answer, formula, calculation or investment judgment..." />}</div>
          <div className="actions"><button onClick={submitAnswer}>Submit Answer</button><button className="ghost" onClick={() => setGrade({ correct: false, score: 0, feedback: currentQuestion.solution })}>Show Hint / Solution</button></div>
          {grade && <div className={`result ${grade.correct ? "good" : "bad"}`}><b>Score: {grade.score}/10</b><p>{grade.feedback}</p></div>}
        </section>
        <aside className="section-card slim"><h3>Today’s Workout</h3><p>Warm up with valuation math, then attack one harder judgment case.</p><Row label="Valuation" value={72} tone="blue" /><Row label="LBO" value={58} tone="green" /><Row label="Private Credit" value={42} tone="red" /></aside>
      </div>
    );
  }

  function Advanced() {
    return (
      <div className="section-card">
        <div className="section-head"><div><h2>Advanced AI Modules</h2><p>25 modules connected to the AI provider when configured.</p></div><button onClick={() => launchModule(selectedModule)} disabled={busy === "ai"}>{busy === "ai" ? "Running..." : "Launch Selected"}</button></div>
        <div className="module-layout"><div><textarea value={moduleInput} onChange={(e) => setModuleInput(e.target.value)} /><div className="module-output"><pre>{aiOutput}</pre></div></div><div className="module-grid">{modules.map((module) => <button key={module.name} className={`module-card ${selectedModule.name === module.name ? "active" : ""} ${module.accent}`} onClick={() => { setSelectedModule(module); setModuleInput(module.prompt); }}><span>{module.bucket}</span><b>{module.name}</b><small>{module.description}</small></button>)}</div></div>
      </div>
    );
  }

  function Dashboard() {
    const byCategory = ["Valuation", "Private Equity", "Investment Banking", "Private Credit", "Markets"];
    return <div className="dashboard-layout"><MiniStat label="Total XP" value={String(store.xp)} tone="blue" sub="Progress bank" /><MiniStat label="Accuracy" value={`${accuracy}%`} tone="green" sub={`${correctAttempts}/${attempts.length} correct`} /><MiniStat label="Bookmarks" value={String(store.bookmarks.length)} tone="red" sub="Review later" /><MiniStat label="APIs Live" value={`${connectedCount}/6`} tone="black" sub="Provider status" /><section className="section-card wide"><h2>Skill Map</h2>{byCategory.map((c, i) => <Row key={c} label={c} value={Math.max(8, accuracy + i * 9)} tone={i % 2 ? "green" : "blue"} />)}</section><section className="section-card wide"><h2>Recent Attempts</h2>{attempts.length ? attempts.slice(0, 6).map((a) => <div className="attempt-row" key={a.id}><b>{a.question}</b><span>{a.category}</span><small>{a.score}/10</small></div>) : <p>No attempts yet. Start Practice to generate analytics.</p>}</section></div>;
  }

  function Feedback() {
    return <div className="workspace-grid"><section className="section-card"><div className="section-head"><div><h2>Feedback & Mistake Journal</h2><p>Save notes, AI reviews and recurring mistakes.</p></div><button onClick={saveNote}>Save Note</button></div><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you learn today? What mistake should come back later?" />{store.notes.map((item) => <div className="note-item" key={item}>{item}</div>)}</section><aside className="section-card slim"><h3>Export / Backup</h3><button onClick={() => setApiResult(store)}>Preview Backup</button><button className="ghost" onClick={() => setStore(baseStore)}>Reset Local Progress</button></aside></div>;
  }

  function InterviewRoom() {
    return <div className="workspace-grid"><section className="section-card"><div className="section-head"><div><h2>Interview Room</h2><p>Choose a room, answer, then let the AI coach interrogate your logic.</p></div><button onClick={testCoach} disabled={busy === "coach"}>{busy === "coach" ? "Testing..." : "Start Mock"}</button></div><div className="interview-modes">{["IB Technical", "PE Associate", "Private Credit", "VC Growth", "MD Pressure", "Market Pitch"].map((x) => <button key={x} onClick={() => { setModuleInput(`Run a ${x} mock interview.`); void launchModule(modules[1]); }}>{x}</button>)}</div><pre>{safeJson(apiResult)}</pre></section><aside className="section-card slim"><h3>Scorecard</h3><Row label="Structure" value={62} tone="blue" /><Row label="Commerciality" value={48} tone="red" /><Row label="Technical" value={74} tone="green" /></aside></div>;
  }

  function ApiCenter() {
    return (
      <div className="workspace-grid api-workspace">
        <section className="section-card">
          <div className="section-head"><div><h2>API Command Center</h2><p>Production keys come from Vercel env. Browser vault is only for quick local testing.</p></div><div className="head-actions"><button onClick={refreshHealth}>Refresh Health</button><button className="ghost" onClick={clearVault}>Clear Vault</button></div></div>
          <div className="api-grid">{apiSlots.map(([name, key, desc, icon]) => <div className="api-card" key={key}><div><span>{icon}</span><b>{name}</b></div><p>{desc}</p><em className={health?.keyStatus?.[key] ? "connected" : "missing"}>{health?.keyStatus?.[key] ? "Connected" : "Not Connected"}</em><small>Source: {health?.sources?.[name.toLowerCase()] || "vercel/browser"}</small></div>)}</div>
          <div className="vault-grid">
            <label>AI API URL<input value={vault.aiUrl} onChange={(e) => setVault({ ...vault, aiUrl: e.target.value })} placeholder="https://integrate.api.nvidia.com/v1" /></label>
            <label>AI Model<input value={vault.aiModel} onChange={(e) => setVault({ ...vault, aiModel: e.target.value })} placeholder="nvidia/nemotron-3.5-lightning-30b-a3b" /></label>
            <label>AI API Key<input type="password" value={vault.aiKey} onChange={(e) => setVault({ ...vault, aiKey: e.target.value })} placeholder="nvapi-..." /></label>
            <label>Marketaux Key<input type="password" value={vault.newsKey} onChange={(e) => setVault({ ...vault, newsKey: e.target.value })} /></label>
            <label>Twelve Data Key<input type="password" value={vault.marketKey} onChange={(e) => setVault({ ...vault, marketKey: e.target.value })} /></label>
            <label>Alpha Vantage Key<input type="password" value={vault.backupMarketKey} onChange={(e) => setVault({ ...vault, backupMarketKey: e.target.value })} /></label>
            <label>FMP Stable URL<input value={vault.fundamentalsUrl} onChange={(e) => setVault({ ...vault, fundamentalsUrl: e.target.value })} placeholder="https://financialmodelingprep.com/stable" /></label>
            <label>FMP Key<input type="password" value={vault.fundamentalsKey} onChange={(e) => setVault({ ...vault, fundamentalsKey: e.target.value })} /></label>
          </div>
          <div className="actions"><button onClick={saveVault}>Save API Keys in Platform</button><button className="ghost" onClick={refreshNews}>Test News</button><button className="ghost" onClick={() => refreshQuote(symbol)}>Test Market</button><button className="ghost" onClick={testFundamentals}>Test FMP</button><button className="ghost" onClick={() => launchModule(modules[21])}>Test AI Lab</button><button className="ghost" onClick={testCoach}>Test Coach</button></div>
          <div className="key-preview"><span>AI: {maskKey(vault.aiKey)}</span><span>News: {maskKey(vault.newsKey)}</span><span>Market: {maskKey(vault.marketKey)}</span><span>FMP: {maskKey(vault.fundamentalsKey)}</span></div>
        </section>
        <aside className="section-card api-result"><h3>Latest API Output</h3><pre>{safeJson(apiResult)}</pre></aside>
      </div>
    );
  }

  function Row({ label, value, tone }: { label: string; value: number; tone: Tone }) {
    return <div className="meter-row"><span>{label}</span><i><b className={tone} style={{ width: `${clampPct(value)}%` }} /></i><strong>{clampPct(value)}%</strong></div>;
  }

  function MiniStat({ label, value, tone, sub }: { label: string; value: string; tone: Tone; sub: string }) {
    return <div className={`mini-stat ${tone}`}><span>{label}</span><b>{value}</b><small>{sub}</small></div>;
  }

  function visualFor(tag: string) {
    const text = tag.toLowerCase();
    if (text.includes("tech") || text.includes("ai")) return "🤖";
    if (text.includes("m&a") || text.includes("pe")) return "🏦";
    if (text.includes("credit")) return "🧾";
    if (text.includes("macro") || text.includes("global")) return "🌐";
    return "📈";
  }

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand"><div className="logo-mark">CF</div><div><b>Capital Forge</b><span>Finance mastery OS</span></div></div>
        <nav className="side-nav">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}><span>{navIcons[item]}</span>{item}</button>)}</nav>
        <div className="upgrade-card"><h3>Phase F AI Vault</h3><p>Live APIs are connected through Vercel. Use the vault only for temporary browser testing.</p><button onClick={() => setTab("API")}>Open API Vault</button></div>
        <div className="side-footer"><i />Capital Forge v3.1<br />Built for your best tomorrow.</div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="search-box"><span>⌕</span><input placeholder="Search topics, news, cases, questions..." onFocus={() => setTab("Practice")} /><kbd>⌘ K</kbd></div>
          <button className="assistant-btn" onClick={() => setTab("Advanced")}>✦ AI Assistant</button>
          <button className="icon-btn">🔔<em>3</em></button>
          <button className="icon-btn">🏆</button>
          <div className="profile"><span>DC</span><div><b>Deepak</b><small>Keep Going!</small></div></div>
        </header>

        {health?.keyStatus?.newsConfigured && <div className="status-strip">Live news loaded from {health.sources?.news || "vercel-env"}. Market, FMP and AI adapters are ready.</div>}

        {tab === "Home" && <Home />}
        {tab === "Practice" && <Practice />}
        {tab === "Advanced" && <Advanced />}
        {tab === "Dashboard" && <Dashboard />}
        {tab === "Feedback" && <Feedback />}
        {tab === "Interview Room" && <InterviewRoom />}
        {tab === "API" && <ApiCenter />}
      </main>
    </div>
  );
}
