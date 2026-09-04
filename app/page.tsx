"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";

type Tab = "Home" | "Practice" | "Advanced" | "Dashboard" | "Feedback" | "Interview Room" | "API";
type Tone = "blue" | "red" | "green" | "purple" | "black";
type Difficulty = "Easy" | "Medium" | "Hard" | "MD";

type NewsItem = { id: string; tag: string; tone: Tone; title: string; summary: string; time: string; visual?: string; imageUrl?: string; source?: string; url?: string };
type Quote = { symbol?: string; name?: string; price?: number | null; change?: number | null; percentChange?: number | null; currency?: string; timestamp?: string };
type Health = { status?: string; phase?: string; providers?: Record<string, string>; sources?: Record<string, string>; keyStatus?: Record<string, boolean> };
type Attempt = { id: string; question: string; answer: string; score: number; correct: boolean; createdAt: string; category: string };
type Store = { xp: number; attempts: Attempt[]; notes: string[]; streak: number };
type Question = { id: string; category: string; difficulty: Difficulty; title: string; prompt: string; options?: string[]; correct?: string; numeric?: number; solution: string; xp: number };
type Module = { name: string; bucket: string; description: string; prompt: string; accent: Tone };
type CaseItem = { title: string; tag: string; difficulty: Difficulty; minutes: number; summary: string; tone: Tone };

const tabs: Tab[] = ["Home", "Practice", "Advanced", "Dashboard", "Feedback", "Interview Room", "API"];
const storeKey = "capital-forge-prepmate-live-v1";
const baseStore: Store = { xp: 0, attempts: [], notes: [], streak: 0 };

const fallbackNews: NewsItem[] = [
  { id: "demo1", tag: "Markets", tone: "blue", title: "Live market feed loading", summary: "Marketaux is connected. Press refresh to pull the latest finance headlines.", time: "Live", visual: "📈", source: "Capital Forge" },
  { id: "demo2", tag: "AI & Tech", tone: "purple", title: "AI capex cycle creates valuation debate", summary: "Convert this into a DCF, margin and terminal multiple mini-case.", time: "Practice", visual: "🤖", source: "Capital Forge" },
  { id: "demo3", tag: "PE / M&A", tone: "green", title: "Sponsors stay selective on entry multiples", summary: "Use this as a paper LBO entry leverage and exit multiple drill.", time: "Practice", visual: "🏦", source: "Capital Forge" }
];

const cases: CaseItem[] = [
  { title: "Build a 3-Statement Model", tag: "Financial Modeling", difficulty: "Medium", minutes: 45, summary: "Forecast revenue, margins, working capital, capex, debt and cash flow linkage.", tone: "blue" },
  { title: "DCF Valuation Analysis", tag: "Valuation", difficulty: "Medium", minutes: 40, summary: "Estimate intrinsic value using WACC, terminal growth and exit multiple checks.", tone: "red" },
  { title: "Buy-Side M&A Case", tag: "M&A", difficulty: "Hard", minutes: 60, summary: "Assess synergy, accretion/dilution, diligence risk and deal recommendation.", tone: "green" },
  { title: "Market Entry Strategy", tag: "Strategy", difficulty: "Medium", minutes: 35, summary: "Evaluate market size, competition, go-to-market and investment attractiveness.", tone: "purple" }
];

const questions: Question[] = [
  { id: "q1", category: "Valuation", difficulty: "Medium", title: "FCFF from EBIT", prompt: "A company has EBIT of ₹100 Cr, tax rate 25%, D&A ₹12 Cr, capex ₹28 Cr and NWC increase ₹9 Cr. Calculate FCFF.", numeric: 50, solution: "FCFF = EBIT × (1 − tax) + D&A − capex − ΔNWC = 100 × 75% + 12 − 28 − 9 = ₹50 Cr.", xp: 80 },
  { id: "q2", category: "Private Equity", difficulty: "Hard", title: "Paper LBO", prompt: "Buy at 10.0x EBITDA. EBITDA is ₹50 Cr. Debt is 5.0x EBITDA. Exit after 5 years at 9.0x EBITDA with EBITDA ₹90 Cr and zero debt. Calculate MOIC.", numeric: 3.24, solution: "Entry EV ₹500 Cr, debt ₹250 Cr, equity ₹250 Cr. Exit EV ₹810 Cr. MOIC = 810 / 250 = 3.24x.", xp: 120 },
  { id: "q3", category: "Investment Banking", difficulty: "Easy", title: "Enterprise Value Bridge", prompt: "Which formula is correct?", options: ["Equity Value + Debt + Preferred + Minority Interest − Cash", "Equity Value − Debt + Cash", "EBITDA + Debt − Cash", "Revenue × EBITDA margin"], correct: "Equity Value + Debt + Preferred + Minority Interest − Cash", solution: "EV equals equity value plus debt, preferred equity and minority interest, minus cash and equivalents.", xp: 50 },
  { id: "q4", category: "Private Credit", difficulty: "MD", title: "Credit Committee View", prompt: "A sponsor wants 5.5x leverage on a cyclical asset with 18% EBITDA margin and weak cash conversion. What questions do you ask before lending?", solution: "Focus on cash conversion, maintenance capex, cyclicality, customer concentration, covenant headroom, collateral value, repayment path and downside recovery.", xp: 150 }
];

const modules: Module[] = [
  { name: "MD Pressure Room", bucket: "Interview", description: "Turn any weak answer into a senior pressure round.", prompt: "Pressure test my answer like a PE managing director.", accent: "red" },
  { name: "Deal Teardown Library", bucket: "M&A", description: "Break live headlines into thesis, valuation, financing and risks.", prompt: "Create a deal teardown using today’s market context.", accent: "blue" },
  { name: "IC Memo Builder", bucket: "Private Equity", description: "Convert raw investment thinking into IC-ready memo sections.", prompt: "Build an IC memo structure for a mid-market acquisition.", accent: "green" },
  { name: "Model Error Hunter", bucket: "Modeling", description: "Find broken assumptions, sign errors and weak forecast logic.", prompt: "Audit this financial model logic for errors.", accent: "purple" },
  { name: "Private Credit Underwriting", bucket: "Credit", description: "Practice DSCR, covenants, downside case and recovery.", prompt: "Create a private credit underwriting case.", accent: "black" },
  { name: "Bad Answer Rewriter", bucket: "Communication", description: "Rewrite answers into crisp associate/VP-level responses.", prompt: "Rewrite my answer into a strong interview response.", accent: "blue" }
];

const apiSlots = [
  ["News", "newsConfigured", "Marketaux live headlines"],
  ["Market Data", "marketConfigured", "Twelve Data quotes"],
  ["Backup Market", "backupMarketConfigured", "Alpha Vantage fallback"],
  ["Fundamentals", "fundamentalsConfigured", "FMP stable statements"],
  ["AI Coach", "aiConfigured", "NVIDIA/OpenAI-compatible"],
  ["Supabase", "supabaseConfigured", "Cloud persistence base"]
];

function money(value?: number | null) {
  if (typeof value !== "number") return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function pct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0;
}

function safeJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function tone(value?: string): Tone {
  return value === "red" || value === "green" || value === "purple" || value === "black" || value === "blue" ? value : "blue";
}

export default function CapitalForge() {
  const [tab, setTab] = useState<Tab>("Home");
  const [store, setStore] = useState<Store>(baseStore);
  const [news, setNews] = useState<NewsItem[]>(fallbackNews);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [symbol, setSymbol] = useState("AAPL");
  const [health, setHealth] = useState<Health | null>(null);
  const [apiResult, setApiResult] = useState<unknown>(null);
  const [currentQuestion, setCurrentQuestion] = useState(questions[0]);
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<null | { correct: boolean; score: number; feedback: string }>(null);
  const [moduleInput, setModuleInput] = useState("Create a live finance drill from today’s market conditions.");
  const [selectedModule, setSelectedModule] = useState(modules[0]);
  const [aiOutput, setAiOutput] = useState("Launch an advanced module to generate AI output here.");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [lastUpdated, setLastUpdated] = useState("Just now");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) setStore({ ...baseStore, ...JSON.parse(raw) });
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(storeKey, JSON.stringify(store));
  }, [store]);

  useEffect(() => {
    refreshAll();
  }, []);

  const accuracy = pct(store.attempts.filter((x) => x.correct).length, store.attempts.length);
  const progress = Math.min(100, Math.round(store.xp / 20));

  async function getJson(url: string, init?: RequestInit) {
    const response = await fetch(url, { ...init, cache: "no-store" });
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
      setNews(Array.isArray(data.news) && data.news.length ? data.news.map((n: NewsItem) => ({ ...n, tone: tone(n.tone) })) : fallbackNews);
      setApiResult(data);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
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
    } finally {
      setBusy("");
    }
  }

  async function testFundamentals() {
    setBusy("fmp");
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
    setStore((s) => ({ ...s, xp: s.xp + (correct ? currentQuestion.xp : 20), attempts: [attempt, ...s.attempts].slice(0, 30), streak: Math.max(1, s.streak || 1) }));
    setGrade({ correct, score, feedback: correct ? currentQuestion.solution : `Not yet. ${currentQuestion.solution}` });
  }

  async function launchModule(module = selectedModule) {
    setSelectedModule(module);
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
    setStore((s) => ({ ...s, notes: [`${new Date().toLocaleString()}: ${note.trim()}`, ...s.notes].slice(0, 25) }));
    setNote("");
  }

  const healthOk = apiSlots.filter(([, key]) => health?.keyStatus?.[String(key)]).length;

  return (
    <div className="pm-shell">
      <aside className="pm-sidebar">
        <div className="pm-brand">
          <div className="pm-logo">CF</div>
          <div><b>Capital Forge</b><span>Finance mastery OS</span></div>
        </div>
        <nav className="pm-nav">
          {tabs.map((x) => <button key={x} className={tab === x ? "active" : ""} onClick={() => setTab(x)}>{iconFor(x)} {x}</button>)}
        </nav>
        <div className="pm-upgrade">
          <b>AI Finance Lab</b>
          <p>Live news, market data, FMP fundamentals and AI interview coaching are connected through Vercel.</p>
          <button onClick={() => setTab("API")}>Open API Center</button>
        </div>
        <div className="pm-version">Capital Forge v3.0<br />Built for IB / PE / VC / Credit.</div>
      </aside>

      <main className="pm-main">
        <header className="pm-topbar">
          <div className="pm-search">⌕ <input placeholder="Search topics, news, cases, questions..." onFocus={() => setTab("Practice")} /></div>
          <button className="pm-ai" onClick={() => setTab("Advanced")}>✦ AI Assistant</button>
          <button className="pm-round">🔔</button>
          <button className="pm-round">🏆</button>
          <div className="pm-profile"><span>DC</span><div><b>Deepak</b><small>Keep going!</small></div></div>
        </header>

        {tab === "Home" && <Home />}
        {tab === "Practice" && <Practice />}
        {tab === "Advanced" && <Advanced />}
        {tab === "Dashboard" && <Dashboard />}
        {tab === "Feedback" && <Feedback />}
        {tab === "Interview Room" && <Interview />}
        {tab === "API" && <ApiCenter />}
      </main>
    </div>
  );

  function Home() {
    return (
      <div className="pm-dashboard">
        <section className="pm-content">
          <div className="pm-hero">
            <div>
              <p className="pm-eyebrow">AI-powered finance learning</p>
              <h1>Welcome back, <span>Deepak!</span> 👋</h1>
              <p>Practice smarter across IB, PE, VC, private credit, valuation, markets and interviews.</p>
              <div className="pm-stats">
                <div><small>AI Accuracy</small><b>{accuracy || 92}%</b></div>
                <div><small>Questions Solved</small><b>{store.attempts.length}</b></div>
                <div><small>XP</small><b>{store.xp}</b></div>
              </div>
            </div>
            <div className="pm-cube"><span>AI</span><p>Live provider adapters + NVIDIA coach layer.</p></div>
          </div>

          <div className="pm-panel">
            <div className="pm-panel-head">
              <div><h2><span className="pm-red-dot" /> Live News & Updates</h2><p>Curated insights from markets, AI and global finance.</p></div>
              <div className="pm-actions"><button className="pm-secondary">Last updated: {lastUpdated}</button><button onClick={refreshNews}>{busy === "news" ? "Refreshing..." : "⟳ Refresh"}</button></div>
            </div>
            <div className="pm-news-row">
              {news.slice(0, 5).map((item) => <NewsCard item={item} key={item.id} />)}
            </div>
          </div>

          <div className="pm-panel">
            <div className="pm-panel-head">
              <div><h2>📄 Featured Short Cases</h2><p>Real-world scenarios to sharpen your thinking.</p></div>
              <button onClick={() => setTab("Practice")}>⟳ Refresh Cases</button>
            </div>
            <div className="pm-case-row">
              {cases.map((c, i) => <CaseCard item={c} index={i + 1} key={c.title} />)}
            </div>
          </div>
        </section>
        <RightRail />
      </div>
    );
  }

  function RightRail() {
    return (
      <aside className="pm-rail">
        <div className="pm-card">
          <h3>Market Snapshot</h3>
          <label>Symbol<input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} /></label>
          <button onClick={() => refreshQuote(symbol)}>{busy === "quote" ? "Loading..." : "Refresh Quote"}</button>
          <p><b>{quote?.symbol || symbol}:</b> {money(quote?.price)} {quote?.currency || "USD"} · {money(quote?.change)} / {money(quote?.percentChange)}%</p>
          <small>Live provider through Vercel env.</small>
        </div>
        <div className="pm-card pm-progress">
          <div className="pm-donut" style={{ background: `conic-gradient(#2563eb ${progress * 3.6}deg, #eef2f7 0deg)` }}><span>{progress}%</span></div>
          <p>Overall progress based on XP target.</p>
        </div>
        <div className="pm-card pm-streak"><h3>🔥 7 Day Streak</h3><b>{store.streak || 1}</b><p>Keep it up!</p><div>{["✓", "✓", "✓", "✓", "F", "S", "S"].map((x, i) => <span key={i}>{x}</span>)}</div></div>
        <div className="pm-card pm-insight"><h3>AI Insights <em>New</em></h3><p>You perform best in valuation and modeling. Balance this with market analysis and credit risk drills.</p><button onClick={() => setTab("Dashboard")}>View Insights →</button></div>
        <div className="pm-card"><h3>Quick Actions</h3><div className="pm-quick"><button onClick={() => setTab("Practice")}>▶ Start Practice</button><button onClick={() => setTab("Advanced")}>▣ Advanced</button><button onClick={() => setTab("Interview Room")}>▣ Mock</button><button onClick={() => setTab("Feedback")}>▣ Notes</button></div></div>
      </aside>
    );
  }

  function NewsCard({ item }: { item: NewsItem }) {
    const t = tone(item.tone);
    return <article className="pm-news-card"><div className={`pm-art ${t}`}>{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span>{item.visual || "📈"}</span>}</div><span className={`pm-tag ${t}`}>{item.tag || "Markets"}</span><small>{item.time} · {item.source}</small><h3>{item.title}</h3><p>{item.summary}</p><button onClick={() => item.url && window.open(item.url, "_blank")}>Read Source →</button></article>;
  }

  function CaseCard({ item, index }: { item: CaseItem; index: number }) {
    return <article className="pm-case-card"><div><span>Case {index}</span><em className={`pm-tag ${item.tone}`}>{item.tag}</em></div><h3>{item.title}</h3><p>{item.summary}</p><small>▥ {item.difficulty} · ◷ ~{item.minutes} min</small><button onClick={() => { setTab("Practice"); setCurrentQuestion(questions[index % questions.length]); }}>Solve Now →</button></article>;
  }

  function Practice() {
    return <div className="pm-workspace"><div className="pm-panel"><div className="pm-panel-head"><div><h2>Practice Room</h2><p>Formula, objective, subjective and case-style finance drills.</p></div><button onClick={() => { const next = questions[(questions.indexOf(currentQuestion) + 1) % questions.length]; setCurrentQuestion(next); setAnswer(""); setGrade(null); }}>Next Question</button></div><span className={`pm-tag ${currentQuestion.difficulty === "MD" ? "red" : "blue"}`}>{currentQuestion.category} · {currentQuestion.difficulty}</span><h1>{currentQuestion.title}</h1><p className="pm-prompt">{currentQuestion.prompt}</p>{currentQuestion.options?.length ? <div className="pm-options">{currentQuestion.options.map((x) => <button key={x} className={answer === x ? "active" : ""} onClick={() => setAnswer(x)}>{x}</button>)}</div> : <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your answer with calculation, driver, risk and decision impact..." />}<div className="pm-actions"><button onClick={submitAnswer}>Submit Answer</button><button className="pm-secondary" onClick={() => setGrade({ correct: false, score: 0, feedback: currentQuestion.solution })}>Show Solution</button></div>{grade && <div className={`pm-result ${grade.correct ? "good" : "bad"}`}><b>{grade.correct ? "Correct" : "Needs work"} · Score {grade.score}/10</b><p>{grade.feedback}</p></div>}</div><div className="pm-card"><h3>Practice Focus</h3><p>Answer like a deal professional: conclusion first, then math, then risk, then decision.</p><button onClick={testCoach}>Ask AI Coach</button></div></div>;
  }

  function Advanced() {
    return <div className="pm-workspace"><div className="pm-panel"><div className="pm-panel-head"><div><h2>Advanced AI Modules</h2><p>25-module engine upgraded with live provider adapters.</p></div><button onClick={() => launchModule(selectedModule)}>{busy === "ai" ? "Running..." : "Launch Selected"}</button></div><textarea value={moduleInput} onChange={(e) => setModuleInput(e.target.value)} /><div className="pm-module-grid">{modules.map((m) => <article key={m.name} className={`pm-module ${selectedModule.name === m.name ? "active" : ""}`} onClick={() => setSelectedModule(m)}><span className={`pm-tag ${m.accent}`}>{m.bucket}</span><h3>{m.name}</h3><p>{m.description}</p><button onClick={(e) => { e.stopPropagation(); launchModule(m); }}>Launch</button></article>)}</div></div><div className="pm-panel"><h2>AI Output</h2><pre>{aiOutput}</pre></div></div>;
  }

  function Dashboard() {
    return <div className="pm-dashboard-lite"><div className="pm-panel"><h2>Performance Dashboard</h2><div className="pm-stats big"><div><small>Accuracy</small><b>{accuracy}%</b></div><div><small>Attempts</small><b>{store.attempts.length}</b></div><div><small>XP</small><b>{store.xp}</b></div><div><small>Live APIs</small><b>{healthOk}/6</b></div></div></div><div className="pm-panel"><h2>Recent Attempts</h2>{store.attempts.length ? store.attempts.map((a) => <div className="pm-attempt" key={a.id}><b>{a.question}</b><span>{a.category}</span><em>{a.score}/10</em></div>) : <p>No attempts yet. Start in Practice.</p>}</div></div>;
  }

  function Feedback() {
    return <div className="pm-workspace"><div className="pm-panel"><h2>Mistake Journal</h2><p>Save lessons from wrong answers, interviews and live market drills.</p><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Example: I forgot to connect EBITDA growth to cash conversion and debt capacity..." /><button onClick={saveNote}>Save Note</button></div><div className="pm-panel"><h2>Saved Notes</h2>{store.notes.length ? store.notes.map((n, i) => <div className="pm-note" key={i}>{n}</div>) : <p>No notes yet.</p>}</div></div>;
  }

  function Interview() {
    return <div className="pm-workspace"><div className="pm-panel"><h2>Interview Room</h2><p>Mock interviews for IB, PE, VC, private credit and market judgment.</p><textarea value={moduleInput} onChange={(e) => setModuleInput(e.target.value)} /><div className="pm-actions"><button onClick={() => { setSelectedModule(modules[0]); launchModule(modules[0]); }}>Start MD Mock</button><button className="pm-secondary" onClick={testCoach}>Grade My Answer</button></div></div><div className="pm-panel"><h2>Coach Output</h2><pre>{aiOutput}</pre></div></div>;
  }

  function ApiCenter() {
    return <div className="pm-workspace"><div className="pm-panel"><div className="pm-panel-head"><div><h2>API Command Center</h2><p>All core providers should show connected from Vercel env.</p></div><button onClick={refreshHealth}>Refresh Health</button></div><div className="pm-api-grid">{apiSlots.map(([label, key, desc]) => { const ok = Boolean(health?.keyStatus?.[String(key)]); return <div className="pm-api" key={String(key)}><div><b>{label}</b><span className={ok ? "ok" : "no"}>{ok ? "Connected" : "Missing"}</span></div><p>{desc}</p><small>{health?.sources?.[label.toLowerCase().replace(" ", "")] || "vercel-env"}</small></div>; })}</div><div className="pm-actions"><button onClick={refreshNews}>Test News</button><button onClick={() => refreshQuote(symbol)}>Test Market</button><button onClick={testFundamentals}>Test FMP</button><button onClick={() => launchModule(selectedModule)}>Test AI Lab</button><button onClick={testCoach}>Test Coach</button></div></div><div className="pm-panel"><h2>Latest API Result</h2><pre>{apiResult ? safeJson(apiResult) : "No API test yet."}</pre></div></div>;
  }
}

function iconFor(tab: Tab) {
  const icons: Record<Tab, string> = { Home: "◆", Practice: "✥", Advanced: "▥", Dashboard: "▦", Feedback: "▱", "Interview Room": "▣", API: "⚙" };
  return icons[tab];
}
