"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";

type Tab = "Home" | "Practice" | "Advanced" | "Dashboard" | "Feedback" | "Interview Room" | "API";
type Tone = "blue" | "red" | "green" | "purple" | "black";
type Difficulty = "Easy" | "Medium" | "Hard" | "MD";

type NewsItem = { id: string; tag: string; tone: Tone; title: string; summary: string; time: string; visual?: string; imageUrl?: string; source?: string; url?: string };
type Quote = { symbol?: string; name?: string; currency?: string; price?: number | null; change?: number | null; percentChange?: number | null };
type Health = { status?: string; keyStatus?: Record<string, boolean>; providers?: Record<string, string>; sources?: Record<string, string> };
type Attempt = { id: string; question: string; answer: string; score: number; correct: boolean; createdAt: string; category: string };
type Store = { xp: number; attempts: Attempt[]; notes: string[]; streak: number };
type Question = { id: string; category: string; difficulty: Difficulty; title: string; prompt: string; options?: string[]; correct?: string; numeric?: number; solution: string; xp: number };
type Module = { name: string; bucket: string; description: string; prompt: string; accent: Tone };
type CaseItem = { title: string; tag: string; difficulty: Difficulty; minutes: number; summary: string; tone: Tone };

const tabs: Tab[] = ["Home", "Practice", "Advanced", "Dashboard", "Feedback", "Interview Room", "API"];
const storeKey = "capital-forge-exact-phase-f-v4";
const baseStore: Store = { xp: 0, attempts: [], notes: [], streak: 7 };

const fallbackImages = [
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1460317442991-0ec209397118?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop"
];

const fallbackNews: NewsItem[] = [
  { id: "fallback-1", tag: "Markets", tone: "green", title: "Equities rally on cooling inflation; tech leads gains", summary: "S&P 500 rises as investors weigh rates, earnings and positioning into quarter-end.", time: "2h ago", source: "Capital Forge", imageUrl: fallbackImages[0] },
  { id: "fallback-2", tag: "AI & Tech", tone: "purple", title: "AI models improve complex finance reasoning", summary: "Enhanced models are changing financial analysis, scenario work and interview practice.", time: "3h ago", source: "Capital Forge", imageUrl: fallbackImages[1] },
  { id: "fallback-3", tag: "Strategy", tone: "blue", title: "PE firms sit on record dry powder—what's next?", summary: "Deal flow remains muted, but sponsors continue screening resilient cash-flow platforms.", time: "4h ago", source: "Capital Forge", imageUrl: fallbackImages[2] },
  { id: "fallback-4", tag: "Business", tone: "red", title: "Renewables M&A surges as transition accelerates", summary: "Strategic acquirers and infra funds compete for scale platforms in clean energy.", time: "5h ago", source: "Capital Forge", imageUrl: fallbackImages[3] },
  { id: "fallback-5", tag: "Global", tone: "blue", title: "Global markets mixed ahead of central banks", summary: "Investors await signals on rates, growth, inflation and cross-asset risk appetite.", time: "6h ago", source: "Capital Forge", imageUrl: fallbackImages[4] }
];

const cases: CaseItem[] = [
  { title: "Build a 3-Statement Model", tag: "Financial Modeling", difficulty: "Medium", minutes: 45, summary: "Build a full financial model for a consumer company and derive key valuation metrics.", tone: "blue" },
  { title: "DCF Valuation Analysis", tag: "Valuation", difficulty: "Medium", minutes: 40, summary: "Estimate intrinsic value using DCF and conduct sensitivity analysis on key assumptions.", tone: "red" },
  { title: "Buy-Side M&A Case", tag: "M&A", difficulty: "Hard", minutes: 60, summary: "Conduct acquisition analysis, synergy assessment and accretion/dilution impact.", tone: "green" },
  { title: "Market Entry Strategy", tag: "Market Analysis", difficulty: "Medium", minutes: 35, summary: "Evaluate market attractiveness and propose a go-to-market strategy for a new entrant.", tone: "purple" }
];

const questions: Question[] = [
  { id: "q1", category: "Valuation", difficulty: "Medium", title: "FCFF from EBIT", prompt: "A company has EBIT of ₹100 Cr, tax rate 25%, D&A ₹12 Cr, capex ₹28 Cr and NWC increase ₹9 Cr. Calculate FCFF.", numeric: 50, solution: "FCFF = EBIT × (1 − tax) + D&A − capex − ΔNWC = 100 × 75% + 12 − 28 − 9 = ₹50 Cr.", xp: 80 },
  { id: "q2", category: "Private Equity", difficulty: "Hard", title: "Paper LBO", prompt: "Buy at 10.0x EBITDA. EBITDA is ₹50 Cr. Debt is 5.0x EBITDA. Exit after 5 years at 9.0x EBITDA with EBITDA ₹90 Cr and zero debt. Calculate MOIC.", numeric: 3.24, solution: "Entry EV ₹500 Cr, debt ₹250 Cr, equity ₹250 Cr. Exit EV ₹810 Cr. MOIC = 810 / 250 = 3.24x.", xp: 120 },
  { id: "q3", category: "Investment Banking", difficulty: "Easy", title: "Enterprise Value Bridge", prompt: "Which formula is correct?", options: ["Equity Value + Debt + Preferred + Minority Interest − Cash", "Equity Value − Debt + Cash", "EBITDA + Debt − Cash", "Revenue × EBITDA margin"], correct: "Equity Value + Debt + Preferred + Minority Interest − Cash", solution: "EV equals equity value plus debt, preferred equity and minority interest, minus cash and equivalents.", xp: 50 }
];

const modules: Module[] = [
  { name: "Recruiter Mode", bucket: "Career", description: "Turn your work into recruiter-grade signals.", prompt: "Review my finance profile like a PE recruiter.", accent: "blue" },
  { name: "MD Pressure Room", bucket: "Interview", description: "Senior-level interruption, pushback and judgment drills.", prompt: "Pressure test my answer like a PE MD.", accent: "red" },
  { name: "Deal Teardown Library", bucket: "M&A", description: "Break live headlines into thesis, valuation and risk.", prompt: "Create a deal teardown using today’s market context.", accent: "blue" },
  { name: "Excel Muscle Memory", bucket: "Modeling", description: "Keyboard-first modeling speed and shortcut drills.", prompt: "Give me a timed Excel modeling drill.", accent: "green" },
  { name: "Model Error Hunter", bucket: "Modeling", description: "Find broken formulas and weak forecast logic.", prompt: "Audit this model logic for errors.", accent: "purple" },
  { name: "IC Memo Builder", bucket: "Private Equity", description: "Convert raw thinking into IC-ready memo sections.", prompt: "Build an IC memo structure for an acquisition.", accent: "green" },
  { name: "Private Credit Underwriting", bucket: "Credit", description: "DSCR, covenants, downside case and recovery.", prompt: "Create a private credit underwriting case.", accent: "black" },
  { name: "Live News Question Engine", bucket: "Markets", description: "Convert fresh market news into finance drills.", prompt: "Turn latest market news into 5 questions.", accent: "red" }
];

const apiSlots = [
  ["Supabase", "supabaseConfigured", "Cloud database"],
  ["News", "newsConfigured", "Marketaux live headlines"],
  ["Market", "marketConfigured", "Twelve Data quotes"],
  ["Backup", "backupMarketConfigured", "Alpha Vantage fallback"],
  ["FMP", "fundamentalsConfigured", "Stable financial statements"],
  ["AI", "aiConfigured", "NVIDIA/OpenAI-compatible"]
] as const;

const icon: Record<Tab, string> = { Home: "⌂", Practice: "✣", Advanced: "⌁", Dashboard: "▥", Feedback: "▣", "Interview Room": "▹", API: "⚙" };

function tone(value?: string): Tone { return value === "red" || value === "green" || value === "purple" || value === "black" || value === "blue" ? value : "blue"; }
function pct(a: number, b: number) { return b ? Math.round((a / b) * 100) : 0; }
function clamp(n: number) { return Math.max(0, Math.min(100, Math.round(n))); }
function json(value: unknown) { return JSON.stringify(value, null, 2); }
function num(value?: number | null) { return typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"; }
function ensureFiveNews(items: NewsItem[]) {
  const clean = (items || []).filter(Boolean).map((item, index) => ({ ...item, id: item.id || `live-${index}`, tone: tone(item.tone), imageUrl: item.imageUrl || fallbackImages[index % fallbackImages.length] }));
  let i = 0;
  while (clean.length < 5) { clean.push({ ...fallbackNews[i % fallbackNews.length], id: `fill-${i}-${Date.now()}` }); i += 1; }
  return clean.slice(0, 5);
}

export default function CapitalForge() {
  const [tab, setTab] = useState<Tab>("Home");
  const [store, setStore] = useState<Store>(baseStore);
  const [news, setNews] = useState<NewsItem[]>(fallbackNews);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [apiResult, setApiResult] = useState<unknown>({ status: "Ready", message: "API command center ready." });
  const [symbol, setSymbol] = useState("AAPL");
  const [currentQuestion, setCurrentQuestion] = useState<Question>(questions[0]);
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<null | { correct: boolean; score: number; feedback: string }>(null);
  const [selectedModule, setSelectedModule] = useState<Module>(modules[1]);
  const [moduleInput, setModuleInput] = useState("Create a live finance drill from today's market conditions.");
  const [aiOutput, setAiOutput] = useState("Launch an advanced module to generate AI output here.");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [lastUpdated, setLastUpdated] = useState("Just now");

  useEffect(() => { try { const raw = localStorage.getItem(storeKey); if (raw) setStore({ ...baseStore, ...JSON.parse(raw) }); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(storeKey, JSON.stringify(store)); } catch {} }, [store]);
  useEffect(() => { void refreshAll(); }, []);

  const attempts = store.attempts;
  const correct = attempts.filter((x) => x.correct).length;
  const accuracy = pct(correct, attempts.length);
  const progress = clamp(store.xp / 20);
  const connected = apiSlots.filter(([, key]) => health?.keyStatus?.[key]).length;
  const activeNews = useMemo(() => ensureFiveNews(news), [news]);

  async function getJson(url: string, init?: RequestInit) { const res = await fetch(url, { ...init, cache: "no-store" }); return res.json(); }
  async function refreshHealth() { const data = await getJson("/api/health"); setHealth(data); return data; }
  async function refreshNews() {
    setBusy("news");
    try {
      const data = await getJson(`/api/news?limit=5&t=${Date.now()}`);
      setNews(ensureFiveNews(Array.isArray(data.news) ? data.news : []));
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setApiResult(data);
    } catch (error) { setNews(fallbackNews); setApiResult({ error: error instanceof Error ? error.message : "News failed" }); }
    finally { setBusy(""); }
  }
  async function refreshQuote(next = symbol) { setBusy("quote"); try { const data = await getJson(`/api/market?symbol=${encodeURIComponent(next || "AAPL")}`); setQuote(data.quote || null); setApiResult(data); } finally { setBusy(""); } }
  async function testFundamentals() { setBusy("fmp"); try { const data = await getJson(`/api/fundamentals?symbol=${encodeURIComponent(symbol || "AAPL")}`); setApiResult(data); } finally { setBusy(""); } }
  async function refreshAll() { await Promise.allSettled([refreshHealth(), refreshNews(), refreshQuote("AAPL")]); }

  function submitAnswer() {
    const normalized = answer.trim().toLowerCase();
    const isCorrect = currentQuestion.options?.length ? normalized === String(currentQuestion.correct).toLowerCase() : typeof currentQuestion.numeric === "number" ? Math.abs(Number(normalized.replace(/[₹,x\s]/g, "")) - currentQuestion.numeric) <= Math.max(0.05, currentQuestion.numeric * 0.02) : normalized.length > 120;
    const score = isCorrect ? 9 : normalized.length > 50 ? 6 : 4;
    const attempt: Attempt = { id: crypto.randomUUID(), question: currentQuestion.title, answer, score, correct: isCorrect, createdAt: new Date().toISOString(), category: currentQuestion.category };
    setStore((s) => ({ ...s, xp: s.xp + (isCorrect ? currentQuestion.xp : 20), attempts: [attempt, ...s.attempts].slice(0, 40), streak: Math.max(1, s.streak || 1) }));
    setGrade({ correct: isCorrect, score, feedback: isCorrect ? currentQuestion.solution : `Not yet. ${currentQuestion.solution}` });
  }
  function nextQuestion() { const i = questions.findIndex((q) => q.id === currentQuestion.id); setCurrentQuestion(questions[(i + 1) % questions.length]); setAnswer(""); setGrade(null); }
  async function launchModule(module = selectedModule) {
    setSelectedModule(module); setTab("Advanced"); setBusy("ai"); setAiOutput("Running AI module...");
    try { const data = await getJson("/api/lab", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ module: module.name, input: moduleInput }) }); setApiResult(data); setAiOutput(data.output || data.feedback || json(data)); }
    catch (e) { setAiOutput(e instanceof Error ? e.message : "AI failed"); }
    finally { setBusy(""); }
  }
  async function testCoach() { setBusy("coach"); try { const data = await getJson("/api/coach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "test", question: "Capital Forge API test", answer: "I would analyze revenue, margins, cash conversion, valuation, risk and decision impact.", context: "live platform test" }) }); setApiResult(data); } finally { setBusy(""); } }
  function saveNote() { if (!note.trim()) return; setStore((s) => ({ ...s, notes: [`${new Date().toLocaleString()}: ${note.trim()}`, ...s.notes].slice(0, 25) })); setNote(""); }

  return (
    <div className="app-frame">
      <Header setTab={setTab} />
      <aside className="sidebar">
        <nav className="side-nav">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}><span>{icon[item]}</span>{item}</button>)}</nav>
        <div className="upgrade-card"><h3>Upgrade to Pro</h3><p>Unlock advanced AI, analytics, and unlimited practice.</p><button>⚡ Upgrade Now</button></div>
        <div className="side-footer"><i /><b>Capital Forge v3.2</b><span>Built for your best tomorrow.</span></div>
      </aside>
      <main className="workspace">
        {tab === "Home" && <Home />}
        {tab === "Practice" && <Practice />}
        {tab === "Advanced" && <Advanced />}
        {tab === "Dashboard" && <Dashboard />}
        {tab === "Feedback" && <Feedback />}
        {tab === "Interview Room" && <Interview />}
        {tab === "API" && <API />}
      </main>
    </div>
  );

  function Home() {
    return (
      <div className="home-layout">
        <section className="main-column">
          <section className="hero-panel">
            <div className="hero-copy"><p className="eyebrow">AI-powered finance learning</p><h1>Welcome back, <span>Deepak!</span> 👋</h1><p>Practice smarter across IB, PE, VC, private credit, valuation, markets and interviews.</p><div className="hero-stats"><MiniStat label="AI Accuracy" value={`${accuracy}%`} tone="green" /><MiniStat label="Questions Solved" value={String(attempts.length)} tone="blue" /><MiniStat label="Time Saved" value={`${Math.max(32, Math.round(store.xp / 30))}h`} tone="red" /></div></div>
            <div className="hero-art"><div className="orbit one" /><div className="orbit two" /><div className="ai-block">AI</div><b className="hero-chip left">DCF</b><b className="hero-chip right">LBO</b></div>
          </section>
          <section className="news-section">
            <SectionHead title="Live News & Updates" subtitle="Curated insights from markets, AI, and global finance." icon="dot" action={<><small>Last updated: {lastUpdated}</small><button onClick={refreshNews} disabled={busy === "news"}>{busy === "news" ? "Refreshing..." : "↻ Refresh"}</button></>} />
            <div className="news-row">{activeNews.map((item, index) => <NewsCard item={item} index={index} key={item.id} />)}</div>
          </section>
          <section className="case-section">
            <SectionHead title="Featured Short Cases" subtitle="Real-world scenarios to sharpen your thinking." icon="case" action={<button onClick={() => setStore((s) => ({ ...s, xp: s.xp + 5 }))}>↻ Refresh Cases</button>} />
            <div className="case-row">{cases.map((item, i) => <CaseCard key={item.title} item={item} index={i + 1} />)}</div>
          </section>
        </section>
        <aside className="right-rail"><ProgressCard /><StreakCard /><InsightsCard /><RecommendedCard /><QuickActions /></aside>
      </div>
    );
  }

  function Header({ setTab }: { setTab: (tab: Tab) => void }) {
    return <header className="global-header"><div className="brand"><div className="logo-mark">CF</div><div><b>Capital Forge</b><span>Finance mastery OS</span></div></div><div className="search-box"><span>⌕</span><input placeholder="Search topics, news, cases, questions..." /><kbd>⌘ K</kbd></div><button className="assistant-btn" onClick={() => setTab("Advanced")}>✦ AI Assistant</button><button className="icon-btn"><em>3</em>🔔</button><button className="icon-btn">🏆</button><div className="profile"><span>DC</span><div><b>Deepak</b><small>Keep Going!</small></div></div></header>;
  }
  function SectionHead({ title, subtitle, icon, action }: { title: string; subtitle: string; icon: "dot" | "case"; action: React.ReactNode }) { return <div className="section-head"><div><h2>{icon === "dot" ? <span className="red-dot" /> : <span className="case-icon">▰</span>}{title}</h2><p>{subtitle}</p></div><div className="head-actions">{action}</div></div>; }
  function MiniStat({ label, value, tone }: { label: string; value: string; tone: Tone }) { return <div className={`mini-stat ${tone}`}><span>{label}</span><b>{value}</b></div>; }
  function NewsCard({ item, index }: { item: NewsItem; index: number }) { return <article className="news-card"><div className={`news-visual ${item.tone}`}>{item.imageUrl ? <img src={item.imageUrl} alt="" onError={(e) => { e.currentTarget.src = fallbackImages[index % fallbackImages.length]; }} /> : <span>{item.visual || "📰"}</span>}</div><div className="news-meta"><span className={`pill ${item.tone}`}>{item.tag || "Markets"}</span><small>{item.time || "Live"}</small></div><h3>{item.title}</h3><p>{item.summary}</p><div className="news-footer"><small>{item.source || "Live"}</small><button onClick={() => item.url && window.open(item.url, "_blank", "noopener,noreferrer")}>Read Source →</button></div></article>; }
  function CaseCard({ item, index }: { item: CaseItem; index: number }) { return <article className="case-card"><div className="case-meta"><span>Case {index}</span><b className={`pill ${item.tone}`}>{item.tag}</b></div><h3>{item.title}</h3><p>{item.summary}</p><div className="case-stats"><span>▥ {item.difficulty}</span><span>◷ ~{item.minutes} min</span></div><button onClick={() => setTab("Practice")}>Solve Now →</button></article>; }
  function ProgressCard() { return <div className="rail-card progress-card"><div className="rail-title"><h3>Your Progress</h3><button onClick={() => setTab("Dashboard")}>View Dashboard →</button></div><div className="progress-body"><div className="donut" style={{ background: `conic-gradient(#1769F7 ${Math.max(18, progress) * 3.6}deg,#E8EDF4 0deg)` }}><span><b>{Math.max(18, progress)}%</b><small>Overall</small></span></div><div className="progress-list"><Row label="Practice" value={Math.max(0, accuracy)} tone="green" /><Row label="Advanced" value={Math.min(84, connected * 14)} tone="blue" /><Row label="Interview" value={Math.max(0, attempts.length ? 68 : 0)} tone="purple" /></div></div></div>; }
  function Row({ label, value, tone }: { label: string; value: number; tone: Tone }) { return <div className="meter-row"><span>{label}</span><i><b className={tone} style={{ width: `${value}%` }} /></i><strong>{value}%</strong></div>; }
  function StreakCard() { return <div className="rail-card streak-card"><div><h3>🔥 7 Day Streak</h3><p>Keep it up!</p></div><b>{store.streak || 7}<small>Days</small></b><div className="week">{["✓", "✓", "✓", "✓", "F", "S", "S"].map((x, i) => <span key={i} className={i === 4 ? "today" : i < 4 ? "done" : ""}>{x}</span>)}</div></div>; }
  function InsightsCard() { return <div className="rail-card insight-card"><h3>AI Insights <span>New</span></h3><p>You perform best in Valuation and Modeling. Focus on Market Analysis to balance your skill set and boost interview readiness.</p><button onClick={() => launchModule(modules[1])}>View Insights →</button><div className="orb">AI</div></div>; }
  function RecommendedCard() { return <div className="rail-card rec-card"><h3>Recommended For You</h3>{["Complete 5 more Advanced questions", "Try a Hard case this weekend", "Book a mock interview"].map((r, i) => <button key={r} onClick={() => setTab(i === 2 ? "Interview Room" : i === 1 ? "Practice" : "Advanced")}><span>{i === 0 ? "🎯" : i === 1 ? "🧠" : "👤"}</span><div><b>{r}</b><small>+{(i + 1) * 100} XP</small></div><i>›</i></button>)}</div>; }
  function QuickActions() { return <div className="rail-card quick-card"><h3>Quick Actions</h3><div><button onClick={() => setTab("Practice")}><span>▶</span><small>Start Practice</small></button><button onClick={() => setTab("Advanced")}><span>▮</span><small>Go Advanced</small></button><button onClick={() => setTab("Interview Room")}><span>▣</span><small>Interview Room</small></button><button onClick={() => setTab("API")}><span>⬒</span><small>API Vault</small></button></div></div>; }

  function Practice() { return <div className="workspace-grid"><section className="panel"><div className="section-head"><div><h2>Practice Engine</h2><p>Primary drills across formulas, modeling, valuation, PE and credit.</p></div><div className="head-actions"><button onClick={nextQuestion}>Next</button></div></div><div className="question-card"><div><span className="pill blue">{currentQuestion.category}</span><span className="pill red">{currentQuestion.difficulty}</span><span className="pill green">{currentQuestion.xp} XP</span></div><h3>{currentQuestion.title}</h3><p>{currentQuestion.prompt}</p>{currentQuestion.options ? <div className="option-grid">{currentQuestion.options.map((o) => <button key={o} className={answer === o ? "selected" : ""} onClick={() => setAnswer(o)}>{o}</button>)}</div> : <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Write your answer..." />}</div><div className="actions"><button onClick={submitAnswer}>Submit Answer</button><button className="ghost" onClick={() => setGrade({ correct: false, score: 0, feedback: currentQuestion.solution })}>Show Solution</button></div>{grade && <div className={`result ${grade.correct ? "good" : "bad"}`}><b>Score: {grade.score}/10</b><p>{grade.feedback}</p></div>}</section><aside className="panel slim"><h3>Recent Attempts</h3>{attempts.length ? attempts.slice(0, 8).map((a) => <div className="mini-row" key={a.id}><b>{a.question}</b><span>{a.score}/10</span></div>) : <p>No attempts yet.</p>}</aside></div>; }
  function Advanced() { return <section className="panel"><div className="section-head"><div><h2>Advanced Modules</h2><p>The 25-thing advanced layer: pressure rounds, live news drills, memo writing and deal math.</p></div><button onClick={() => launchModule()}>{busy === "ai" ? "Running..." : "Run Selected"}</button></div><textarea value={moduleInput} onChange={(e) => setModuleInput(e.target.value)} /><div className="module-grid">{modules.map((m) => <article className="module-card" key={m.name}><span>{m.bucket}</span><h3>{m.name}</h3><p>{m.description}</p><button onClick={() => launchModule(m)}>Launch</button></article>)}</div><pre>{aiOutput}</pre></section>; }
  function Dashboard() { return <div className="dashboard-grid"><section className="panel span2"><h2>Performance Overview</h2><div className="metric-grid"><MiniMetric label="Total XP" value={store.xp} /><MiniMetric label="Accuracy" value={`${accuracy}%`} /><MiniMetric label="Attempts" value={attempts.length} /><MiniMetric label="Connected APIs" value={`${connected}/6`} /></div></section><section className="panel"><h2>Market Snapshot</h2><p>{quote?.symbol || symbol}: {num(quote?.price)} {quote?.currency || "USD"}</p><p>{num(quote?.change)} / {num(quote?.percentChange)}%</p></section><section className="panel"><h2>Learning Journal</h2><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Save a note..." /><button onClick={saveNote}>Save Note</button></section><section className="panel span2"><h2>API Output</h2><pre>{json(apiResult)}</pre></section></div>; }
  function MiniMetric({ label, value }: { label: string; value: string | number }) { return <div className="mini-metric"><span>{label}</span><b>{value}</b></div>; }
  function Feedback() { return <section className="panel"><div className="section-head"><div><h2>Feedback Lab</h2><p>Use the live coach adapter to grade answers and rewrite weak responses.</p></div><button onClick={testCoach}>{busy === "coach" ? "Testing..." : "Run Coach Test"}</button></div><pre>{json(apiResult)}</pre></section>; }
  function Interview() { return <section className="panel"><div className="section-head"><div><h2>Interview Room</h2><p>Mock rounds for PE, IB, VC, private credit and market judgment.</p></div><button onClick={() => launchModule(modules[1])}>Start Mock</button></div><div className="case-row">{["PE Partner Round", "IB Technical Sprint", "Private Credit IC", "VC Growth Round"].map((x, i) => <article className="case-card" key={x}><h3>{x}</h3><p>Practice senior interview thinking with timed pressure and feedback.</p><div className="case-stats"><span>{i < 2 ? "Hard" : "MD"}</span><span>~30 min</span></div><button onClick={() => launchModule(modules[1])}>Start</button></article>)}</div></section>; }
  function API() { return <div className="api-grid"><section className="panel"><div className="section-head"><div><h2>API Command Center</h2><p>Dedicated API tab only. Home remains clean.</p></div><button onClick={refreshAll}>Refresh Health</button></div><div className="api-cards">{apiSlots.map(([name, key, desc]) => <article key={name} className="api-card"><h3>{name}</h3><span className={health?.keyStatus?.[key] ? "connected" : "missing"}>{health?.keyStatus?.[key] ? "Connected" : "Missing"}</span><p>{desc}</p></article>)}</div><label>Symbol<input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} /></label><div className="actions"><button onClick={() => refreshQuote(symbol)}>Test Market</button><button className="ghost" onClick={testFundamentals}>Test FMP</button><button className="ghost" onClick={testCoach}>Test AI</button></div></section><section className="panel"><h2>Latest API Output</h2><pre>{json(apiResult)}</pre></section></div>; }
}
