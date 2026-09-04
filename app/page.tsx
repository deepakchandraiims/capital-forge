"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";

type Tab = "Home" | "Practice" | "Advanced" | "Dashboard" | "Feedback" | "Interview Room" | "API";
type Tone = "blue" | "red" | "green" | "purple" | "black";
type NewsItem = { id: string; tag: string; tone: Tone; title: string; summary: string; time: string; visual?: string; imageUrl?: string; source?: string; url?: string };
type Health = { keyStatus?: Record<string, boolean>; sources?: Record<string, string> };
type Quote = { symbol?: string; currency?: string; price?: number | null; change?: number | null; percentChange?: number | null };
type Store = { xp: number; solved: number; correct: number; streak: number; notes: string[] };

const tabs: Tab[] = ["Home", "Practice", "Advanced", "Dashboard", "Feedback", "Interview Room", "API"];
const storeKey = "capital-forge-exact-phase-f-safe";
const icons: Record<Tab, string> = { Home: "⌂", Practice: "✣", Advanced: "⌁", Dashboard: "▥", Feedback: "▣", "Interview Room": "▹", API: "⚙" };
const baseStore: Store = { xp: 0, solved: 0, correct: 0, streak: 7, notes: [] };
const fallbackImages = [
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1460317442991-0ec209397118?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop"
];
const fallbackNews: NewsItem[] = [
  { id: "n1", tag: "Markets", tone: "green", title: "Equities rally on cooling inflation; tech leads gains", summary: "S&P 500 rises as investors weigh rates, earnings and positioning into quarter-end.", time: "2h ago", source: "Capital Forge", imageUrl: fallbackImages[0] },
  { id: "n2", tag: "AI & Tech", tone: "purple", title: "AI models improve complex finance reasoning", summary: "Enhanced models are changing financial analysis, scenario work and interview practice.", time: "3h ago", source: "Capital Forge", imageUrl: fallbackImages[1] },
  { id: "n3", tag: "Strategy", tone: "blue", title: "PE firms sit on record dry powder—what's next?", summary: "Sponsors continue screening resilient cash-flow platforms and disciplined entry points.", time: "4h ago", source: "Capital Forge", imageUrl: fallbackImages[2] },
  { id: "n4", tag: "Business", tone: "red", title: "Renewables M&A surges as energy transition accelerates", summary: "Strategic acquirers and infra funds compete for scale platforms in clean energy.", time: "5h ago", source: "Capital Forge", imageUrl: fallbackImages[3] },
  { id: "n5", tag: "Global", tone: "blue", title: "Global markets mixed ahead of central bank decisions", summary: "Investors await signals on rates, growth and the durability of risk appetite.", time: "6h ago", source: "Capital Forge", imageUrl: fallbackImages[4] }
];
const cases = [
  ["Build a 3-Statement Model", "Financial Modeling", "Build a full financial model and derive key valuation metrics.", "Medium", "45"],
  ["DCF Valuation Analysis", "Valuation", "Estimate intrinsic value and run sensitivity on key assumptions.", "Medium", "40"],
  ["Buy-Side M&A Case", "M&A", "Assess synergies, diligence risks and accretion/dilution impact.", "Hard", "60"],
  ["Market Entry Strategy", "Market Analysis", "Evaluate market attractiveness and propose a go-to-market thesis.", "Medium", "35"]
];
const apiSlots = [["Supabase", "supabaseConfigured"], ["News", "newsConfigured"], ["Market", "marketConfigured"], ["Backup", "backupMarketConfigured"], ["FMP", "fundamentalsConfigured"], ["AI", "aiConfigured"]] as const;

function normalizeTone(value?: string): Tone { return value === "red" || value === "green" || value === "purple" || value === "black" || value === "blue" ? value : "blue"; }
function ensureFive(items: NewsItem[]) { const out: NewsItem[] = (items || []).map((item, i) => ({ ...item, id: item.id || `live-${i}`, tone: normalizeTone(item.tone), imageUrl: item.imageUrl || fallbackImages[i % 5] })); let i = 0; while (out.length < 5) { out.push({ ...fallbackNews[i % 5], id: `fill-${i}` }); i += 1; } return out.slice(0, 5); }
function pct(a: number, b: number) { return b ? Math.round((a / b) * 100) : 0; }
function money(v?: number | null) { return typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"; }

export default function CapitalForge() {
  const [tab, setTab] = useState<Tab>("Home");
  const [store, setStore] = useState<Store>(baseStore);
  const [news, setNews] = useState<NewsItem[]>(fallbackNews);
  const [health, setHealth] = useState<Health>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [symbol, setSymbol] = useState("AAPL");
  const [answer, setAnswer] = useState("");
  const [apiResult, setApiResult] = useState<unknown>({ ready: true });
  const [busy, setBusy] = useState("");
  const [lastUpdated, setLastUpdated] = useState("Just now");

  useEffect(() => { try { const raw = localStorage.getItem(storeKey); if (raw) setStore({ ...baseStore, ...JSON.parse(raw) }); } catch {} }, []);
  useEffect(() => { localStorage.setItem(storeKey, JSON.stringify(store)); }, [store]);
  useEffect(() => { void refreshAll(); }, []);

  const accuracy = pct(store.correct, store.solved);
  const progress = Math.max(18, Math.min(100, Math.round(store.xp / 20)));
  const connected = apiSlots.filter(([, key]) => health.keyStatus?.[key]).length;
  const fiveNews = useMemo(() => ensureFive(news), [news]);

  async function getJson(url: string, init?: RequestInit) { const res = await fetch(url, { ...init, cache: "no-store" }); return res.json(); }
  async function refreshAll() { await Promise.allSettled([refreshHealth(), refreshNews(), refreshQuote("AAPL")]); }
  async function refreshHealth() { const data = await getJson("/api/health"); setHealth(data); setApiResult(data); }
  async function refreshNews() { setBusy("news"); try { const data = await getJson(`/api/news?limit=5&t=${Date.now()}`); setNews(ensureFive(Array.isArray(data.news) ? data.news : [])); setApiResult(data); setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })); } finally { setBusy(""); } }
  async function refreshQuote(next = symbol) { setBusy("quote"); try { const data = await getJson(`/api/market?symbol=${encodeURIComponent(next || "AAPL")}`); setQuote(data.quote || null); setApiResult(data); } finally { setBusy(""); } }
  async function testFmp() { setBusy("fmp"); try { const data = await getJson(`/api/fundamentals?symbol=${encodeURIComponent(symbol || "AAPL")}`); setApiResult(data); } finally { setBusy(""); } }
  async function testAi() { setBusy("ai"); try { const data = await getJson("/api/coach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: "Capital Forge test", answer: "I would start with thesis, valuation, risk, downside and decision impact." }) }); setApiResult(data); } finally { setBusy(""); } }
  function submitPractice() { const good = answer.trim().length > 20; setStore((s) => ({ ...s, solved: s.solved + 1, correct: s.correct + (good ? 1 : 0), xp: s.xp + (good ? 80 : 20), streak: Math.max(1, s.streak) })); setAnswer(""); }

  return <div className="app-frame"><Header /><Sidebar /> <main className="workspace">{tab === "Home" && <Home />}{tab === "Practice" && <Practice />}{tab === "Advanced" && <Advanced />}{tab === "Dashboard" && <Dashboard />}{tab === "Feedback" && <Feedback />}{tab === "Interview Room" && <Interview />}{tab === "API" && <API />}</main></div>;

  function Header() { return <header className="global-header"><div className="brand"><div className="logo-mark">CF</div><div><b>Capital Forge</b><span>Finance mastery OS</span></div></div><div className="search-box"><span>⌕</span><input placeholder="Search topics, news, cases, questions..." /><kbd>⌘ K</kbd></div><button className="assistant-btn" onClick={() => setTab("Advanced")}>✦ AI Assistant</button><button className="icon-btn"><em>3</em>🔔</button><button className="icon-btn">🏆</button><div className="profile"><span>DC</span><div><b>Deepak</b><small>Keep Going!</small></div></div></header>; }
  function Sidebar() { return <aside className="sidebar"><nav className="side-nav">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}><span>{icons[item]}</span>{item}</button>)}</nav><div className="upgrade-card"><h3>Upgrade to Pro</h3><p>Unlock advanced AI, analytics, and unlimited practice.</p><button>⚡ Upgrade Now</button></div><div className="side-footer"><i /><b>Capital Forge v3.2</b><span>Built for your best tomorrow.</span></div></aside>; }
  function Home() { return <div className="home-layout"><section className="main-column"><section className="hero-panel"><div className="hero-copy"><p className="eyebrow">AI-powered finance learning</p><h1>Welcome back, <span>Deepak!</span> 👋</h1><p>Practice smarter across IB, PE, VC, private credit, valuation, markets and interviews.</p><div className="hero-stats"><MiniStat label="AI Accuracy" value={`${accuracy}%`} tone="green" /><MiniStat label="Questions Solved" value={String(store.solved)} tone="blue" /><MiniStat label="Time Saved" value="32h" tone="red" /></div></div><div className="hero-art"><div className="orbit one" /><div className="orbit two" /><div className="ai-block">AI</div><b className="hero-chip left">DCF</b><b className="hero-chip right">LBO</b></div></section><section className="news-section"><Head title="Live News & Updates" subtitle="Curated insights from markets, AI, and global finance." kind="dot"><small>Last updated: {lastUpdated}</small><button onClick={refreshNews} disabled={busy === "news"}>{busy === "news" ? "Refreshing..." : "↻ Refresh"}</button></Head><div className="news-row">{fiveNews.map((item, i) => <NewsCard key={item.id} item={item} index={i} />)}</div></section><section className="case-section"><Head title="Featured Short Cases" subtitle="Real-world scenarios to sharpen your thinking." kind="case"><button onClick={() => setStore((s) => ({ ...s, xp: s.xp + 5 }))}>↻ Refresh Cases</button></Head><div className="case-row">{cases.map((item, i) => <CaseCard key={item[0]} item={item} index={i + 1} />)}</div></section></section><aside className="right-rail"><Progress /><Streak /><Insights /><Recommended /><Quick /></aside></div>; }
  function MiniStat({ label, value, tone }: { label: string; value: string; tone: Tone }) { return <div className={`mini-stat ${tone}`}><span>{label}</span><b>{value}</b></div>; }
  function Head({ title, subtitle, kind, children }: { title: string; subtitle: string; kind: "dot" | "case"; children: React.ReactNode }) { return <div className="section-head"><div><h2>{kind === "dot" ? <span className="red-dot" /> : <span className="case-icon">▰</span>}{title}</h2><p>{subtitle}</p></div><div className="head-actions">{children}</div></div>; }
  function NewsCard({ item, index }: { item: NewsItem; index: number }) { return <article className="news-card"><div className={`news-visual ${item.tone}`}>{item.imageUrl ? <img src={item.imageUrl} alt="" onError={(e) => { e.currentTarget.src = fallbackImages[index % 5]; }} /> : <span>{item.visual || "📰"}</span>}</div><div className="news-meta"><span className={`pill ${item.tone}`}>{item.tag}</span><small>{item.time}</small></div><h3>{item.title}</h3><p>{item.summary}</p><div className="news-footer"><small>{item.source || "Live"}</small><button onClick={() => item.url && window.open(item.url, "_blank", "noopener,noreferrer")}>Read Source →</button></div></article>; }
  function CaseCard({ item, index }: { item: string[]; index: number }) { return <article className="case-card"><div className="case-meta"><span>Case {index}</span><b className={`pill ${index === 2 ? "red" : index === 3 ? "green" : index === 4 ? "purple" : "blue"}`}>{item[1]}</b></div><h3>{item[0]}</h3><p>{item[2]}</p><div className="case-stats"><span>▥ {item[3]}</span><span>◷ ~{item[4]} min</span></div><button onClick={() => setTab("Practice")}>Solve Now →</button></article>; }
  function Progress() { return <div className="rail-card progress-card"><div className="rail-title"><h3>Your Progress</h3><button onClick={() => setTab("Dashboard")}>View Dashboard →</button></div><div className="progress-body"><div className="donut" style={{ background: `conic-gradient(#1769F7 ${progress * 3.6}deg,#E8EDF4 0deg)` }}><span><b>{progress}%</b><small>Overall</small></span></div><div><Row label="Practice" value={accuracy} tone="green" /><Row label="Advanced" value={Math.min(84, connected * 14)} tone="blue" /><Row label="Interview" value={store.solved ? 68 : 0} tone="purple" /></div></div></div>; }
  function Row({ label, value, tone }: { label: string; value: number; tone: Tone }) { return <div className="meter-row"><span>{label}</span><i><b className={tone} style={{ width: `${value}%` }} /></i><strong>{value}%</strong></div>; }
  function Streak() { return <div className="rail-card streak-card"><div><h3>🔥 7 Day Streak</h3><p>Keep it up!</p></div><b>{store.streak}<small>Days</small></b><div className="week">{["✓", "✓", "✓", "✓", "F", "S", "S"].map((x, i) => <span key={i} className={i < 4 ? "done" : i === 4 ? "today" : ""}>{x}</span>)}</div></div>; }
  function Insights() { return <div className="rail-card insight-card"><h3>AI Insights <span>New</span></h3><p>You perform best in Valuation and Modeling. Focus on Market Analysis to balance your skill set.</p><button onClick={testAi}>View Insights →</button><div className="orb">AI</div></div>; }
  function Recommended() { return <div className="rail-card rec-card"><h3>Recommended For You</h3>{["Complete 5 more Advanced questions", "Try a Hard case this weekend", "Book a mock interview"].map((r, i) => <button key={r} onClick={() => setTab(i === 2 ? "Interview Room" : i === 1 ? "Practice" : "Advanced")}><span>{i === 0 ? "🎯" : i === 1 ? "🧠" : "👤"}</span><div><b>{r}</b><small>+{(i + 1) * 100} XP</small></div><i>›</i></button>)}</div>; }
  function Quick() { return <div className="rail-card quick-card"><h3>Quick Actions</h3><div><button onClick={() => setTab("Practice")}><span>▶</span><small>Start Practice</small></button><button onClick={() => setTab("Advanced")}><span>▮</span><small>Go Advanced</small></button><button onClick={() => setTab("Interview Room")}><span>▣</span><small>Interview Room</small></button><button onClick={() => setTab("API")}><span>⬒</span><small>API Vault</small></button></div></div>; }
  function Practice() { return <div className="workspace-grid"><section className="panel"><h2>Practice Engine</h2><p>Primary finance drills. Answer in conclusion-first format.</p><div className="question-card"><span className="pill blue">Valuation</span><h3>FCFF from EBIT</h3><p>A company has EBIT of ₹100 Cr, tax 25%, D&A ₹12 Cr, capex ₹28 Cr and NWC increase ₹9 Cr. Calculate FCFF.</p><textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Write your answer..." /></div><div className="actions"><button onClick={submitPractice}>Submit Answer</button><button className="ghost" onClick={() => setAnswer("FCFF = 100 × 75% + 12 − 28 − 9 = ₹50 Cr")}>Show Solution</button></div></section><aside className="panel slim"><h3>Recent Progress</h3><p>{store.solved} solved · {accuracy}% accuracy · {store.xp} XP</p></aside></div>; }
  function Advanced() { return <section className="panel"><h2>Advanced Modules</h2><p>AI pressure rooms, deal teardowns, memo building and live-news drills.</p><div className="module-grid">{["MD Pressure Room", "Deal Teardown", "IC Memo Builder", "Private Credit"].map((m) => <article className="module-card" key={m}><span>Advanced</span><h3>{m}</h3><p>Launch a high-signal finance drill powered by the configured AI adapter.</p><button onClick={testAi}>Launch</button></article>)}</div><pre>{JSON.stringify(apiResult, null, 2)}</pre></section>; }
  function Dashboard() { return <div className="dashboard-grid"><section className="panel span2"><h2>Performance Overview</h2><div className="metric-grid"><Metric label="XP" value={store.xp} /><Metric label="Accuracy" value={`${accuracy}%`} /><Metric label="Solved" value={store.solved} /><Metric label="Connected APIs" value={`${connected}/6`} /></div></section><section className="panel"><h2>Market Snapshot</h2><p>{quote?.symbol || symbol}: {money(quote?.price)} {quote?.currency || "USD"}</p><button onClick={() => refreshQuote(symbol)}>Refresh Quote</button></section><section className="panel"><h2>Notes</h2><textarea /><button>Save Note</button></section></div>; }
  function Metric({ label, value }: { label: string; value: string | number }) { return <div className="mini-metric"><span>{label}</span><b>{value}</b></div>; }
  function Feedback() { return <section className="panel"><h2>Feedback Lab</h2><p>Run the AI coach test and review output.</p><button onClick={testAi}>Run Coach Test</button><pre>{JSON.stringify(apiResult, null, 2)}</pre></section>; }
  function Interview() { return <section className="panel"><h2>Interview Room</h2><p>Mock interviews for PE, IB, VC, private credit and market judgment.</p><div className="case-row">{["PE Partner Round", "IB Technical Sprint", "Private Credit IC", "VC Growth Round"].map((x) => <article className="case-card" key={x}><h3>{x}</h3><p>Timed pressure round with live feedback.</p><button onClick={testAi}>Start</button></article>)}</div></section>; }
  function API() { return <div className="api-grid"><section className="panel"><h2>API Command Center</h2><p>Dedicated API tab. No API card appears on Home.</p><div className="api-cards">{apiSlots.map(([name, key]) => <article key={name} className="api-card"><h3>{name}</h3><span className={health.keyStatus?.[key] ? "connected" : "missing"}>{health.keyStatus?.[key] ? "Connected" : "Missing"}</span></article>)}</div><label>Symbol<input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} /></label><div className="actions"><button onClick={refreshAll}>Refresh Health</button><button className="ghost" onClick={() => refreshQuote(symbol)}>Test Market</button><button className="ghost" onClick={testFmp}>Test FMP</button><button className="ghost" onClick={testAi}>Test AI</button></div></section><section className="panel"><h2>Latest Output</h2><pre>{JSON.stringify(apiResult, null, 2)}</pre></section></div>; }
}
