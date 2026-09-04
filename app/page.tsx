"use client";

import { useEffect, useMemo, useState } from "react";

type Tab = "Home" | "Practice" | "Advanced" | "Dashboard" | "Feedback" | "Interview Room" | "API";
type Tone = "blue" | "red" | "green" | "purple" | "black" | "amber" | "gray";

type NewsItem = { id: string; tag: string; tone: Tone; title: string; summary: string; time: string; imageUrl?: string; source?: string; url?: string };
type Health = { keyStatus?: Record<string, boolean> };
type Quote = { symbol?: string; currency?: string; price?: number | null; change?: number | null; percentChange?: number | null };
type Question = { id: string; title: string; helper: string; category: string; subtopic: string; difficulty: string; qtype: string; minutes: number; xp: number; modelAnswer: string; numeric?: number; keywords?: string[] };
type Attempt = { id: string; questionId: string; title: string; category: string; correct: boolean; score: number; answer: string; createdAt: string };
type Store = { xp: number; attempts: Attempt[]; bookmarks: string[]; skipped: number; streak: number };

const tabs: Tab[] = ["Home", "Practice", "Advanced", "Dashboard", "Feedback", "Interview Room", "API"];
const navIcons: Record<Tab, string> = { Home: "⌂", Practice: "▣", Advanced: "▧", Dashboard: "▦", Feedback: "▱", "Interview Room": "▻", API: "⌘" };
const storeKey = "capital-forge-practice-workstation-stable-v2";
const baseStore: Store = { xp: 0, attempts: [], bookmarks: [], skipped: 23, streak: 5 };

const fallbackImages = [
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1460317442991-0ec209397118?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1446776709462-d6b525c57bd3?q=80&w=800&auto=format&fit=crop"
];

const fallbackNews: NewsItem[] = [
  { id: "n1", tag: "Markets", tone: "green", title: "Equities rally on cooling inflation; tech leads gains", summary: "S&P 500 rises as investors weigh rates, earnings and positioning into quarter-end.", time: "2h ago", source: "Capital Forge", imageUrl: fallbackImages[0] },
  { id: "n2", tag: "AI & Tech", tone: "purple", title: "AI capex cycle creates a new valuation debate", summary: "Turn this into a margin, DCF and terminal multiple practice question.", time: "3h ago", source: "Capital Forge", imageUrl: fallbackImages[1] },
  { id: "n3", tag: "Strategy", tone: "blue", title: "PE firms stay selective as exits remain muted", summary: "Deal teams are focusing on resilient margins, cash conversion and debt capacity.", time: "4h ago", source: "Capital Forge", imageUrl: fallbackImages[2] },
  { id: "n4", tag: "Business", tone: "red", title: "Renewables M&A accelerates across infra funds", summary: "Strategics and sponsors continue screening scale platforms in energy transition.", time: "5h ago", source: "Capital Forge", imageUrl: fallbackImages[3] },
  { id: "n5", tag: "Global", tone: "blue", title: "Global markets mixed before central bank decisions", summary: "Investors are watching rates, growth and risk appetite into the next policy cycle.", time: "6h ago", source: "Capital Forge", imageUrl: fallbackImages[4] }
];

const categoryCards = [
  { name: "All", count: "2,000+", icon: "▦", tone: "blue" },
  { name: "IB", count: "320", icon: "▥", tone: "blue" },
  { name: "PE", count: "280", icon: "P", tone: "red" },
  { name: "VC", count: "260", icon: "♆", tone: "green" },
  { name: "Financial Modeling", count: "350", icon: "▣", tone: "green" },
  { name: "Markets", count: "220", icon: "▥", tone: "purple" },
  { name: "Accounting", count: "180", icon: "▤", tone: "amber" }
];

const questions: Question[] = [
  { id: "q1", title: "What is the formula for FCFF and explain each component?", helper: "Write the formula and explain the logic behind each component and when it is used.", category: "Financial Modeling", subtopic: "FCFF", difficulty: "Intermediate", qtype: "Formula", minutes: 5, xp: 80, keywords: ["ebit", "tax", "d&a", "capex", "nwc"], modelAnswer: "FCFF = EBIT(1-T) + D&A - Capex - ΔNWC. EBIT after tax is operating profit available to all capital providers; D&A is non-cash; Capex and working capital are reinvestment needs." },
  { id: "q2", title: "Explain the difference between an LBO model and a DCF model.", helper: "Compare the purpose, key assumptions and typical use cases.", category: "Investment Banking", subtopic: "LBO vs DCF", difficulty: "Easy", qtype: "Subjective", minutes: 3, xp: 60, modelAnswer: "A DCF estimates intrinsic value from free cash flows discounted by WACC. An LBO solves what a sponsor can pay using leverage, cash-flow debt paydown, exit value and target IRR/MOIC." },
  { id: "q3", title: "Why do interest rates impact equity valuations?", helper: "Explain the transmission mechanism and its effect on different sectors.", category: "Markets", subtopic: "Rates", difficulty: "Medium", qtype: "Market", minutes: 4, xp: 70, modelAnswer: "Higher rates increase discount rates and debt costs, reduce the present value of future cash flows, pressure multiples and usually hurt long-duration growth assets more." },
  { id: "q4", title: "Walk me through a typical PE deal lifecycle from sourcing to exit.", helper: "Cover key stages, stakeholders, diligence, value creation and exit options.", category: "Private Equity", subtopic: "Deal Process", difficulty: "Hard", qtype: "Case", minutes: 6, xp: 100, modelAnswer: "Sourcing, screening, NDA, CIM review, IOI, diligence, QoE, debt financing, IC approval, SPA negotiation, close, 100-day plan, value creation, monitoring and exit." },
  { id: "q5", title: "Calculate FCFF from EBIT of ₹100 Cr, tax 25%, D&A ₹12 Cr, Capex ₹28 Cr and NWC increase ₹9 Cr.", helper: "Use the standard FCFF bridge and show the math.", category: "Financial Modeling", subtopic: "FCFF", difficulty: "Medium", qtype: "Calculation", minutes: 4, xp: 80, numeric: 50, modelAnswer: "FCFF = 100 × (1 - 25%) + 12 - 28 - 9 = ₹50 Cr." },
  { id: "q6", title: "What are the most important checks in a three-statement model?", helper: "Think like a model reviewer before an investment committee.", category: "Accounting", subtopic: "3-Statement", difficulty: "Intermediate", qtype: "Accounting", minutes: 5, xp: 75, modelAnswer: "Balance sheet balances, cash flow reconciles, working capital schedules roll forward, debt and interest link correctly, taxes are logical, signs are consistent and hardcodes are limited." }
];

function normalizeTone(value: unknown): Tone {
  return value === "red" || value === "green" || value === "purple" || value === "black" || value === "amber" || value === "gray" || value === "blue" ? value : "blue";
}
function pct(n: number, d: number) { return d ? Math.round((n / d) * 100) : 0; }
function fiveNews(items: NewsItem[]) {
  const out = items.map((item, index) => ({ ...item, tone: normalizeTone(item.tone), imageUrl: item.imageUrl || fallbackImages[index % fallbackImages.length] }));
  for (let i = out.length; i < 5; i += 1) out.push({ ...fallbackNews[i % fallbackNews.length], id: `fallback-${i}` });
  return out.slice(0, 5);
}
function json(value: unknown) { return JSON.stringify(value, null, 2); }

export default function CapitalForge() {
  const [tab, setTab] = useState<Tab>("Home");
  const [store, setStore] = useState<Store>(baseStore);
  const [news, setNews] = useState<NewsItem[]>(fallbackNews);
  const [health, setHealth] = useState<Health | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [apiResult, setApiResult] = useState<unknown>({ status: "ready" });
  const [busy, setBusy] = useState("");
  const [symbol, setSymbol] = useState("AAPL");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [qType, setQType] = useState("All");
  const [timeFilter, setTimeFilter] = useState("All");
  const [subtopic, setSubtopic] = useState("All");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("All Questions");
  const [session, setSession] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<{ score: number; correct: boolean; text: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState("Just now");

  useEffect(() => {
    try { const raw = localStorage.getItem(storeKey); if (raw) setStore({ ...baseStore, ...JSON.parse(raw) }); } catch {}
    void refreshAll();
  }, []);

  useEffect(() => { try { localStorage.setItem(storeKey, JSON.stringify(store)); } catch {} }, [store]);

  const correctActual = store.attempts.filter((a) => a.correct).length;
  const incorrectActual = store.attempts.filter((a) => !a.correct).length;
  const correct = store.attempts.length ? correctActual : 142;
  const incorrect = store.attempts.length ? incorrectActual : 67;
  const skipped = store.attempts.length ? store.skipped : 23;
  const total = correct + incorrect + skipped;
  const accuracy = pct(correct, correct + incorrect);
  const connectedApis = ["supabaseConfigured", "newsConfigured", "marketConfigured", "backupMarketConfigured", "fundamentalsConfigured", "aiConfigured"].filter((k) => health?.keyStatus?.[k]).length;
  const visibleNews = useMemo(() => fiveNews(news), [news]);

  const visibleQuestions = useMemo(() => questions.filter((q) => {
    const text = `${q.title} ${q.helper} ${q.category} ${q.subtopic} ${q.qtype} ${q.difficulty}`.toLowerCase();
    const catOk = category === "All" || q.category === category || (category === "IB" && q.category === "Investment Banking") || (category === "PE" && q.category === "Private Equity");
    const diffOk = difficulty === "All" || q.difficulty === difficulty;
    const typeOk = qType === "All" || q.qtype === qType;
    const timeOk = timeFilter === "All" || (timeFilter === "lt5" ? q.minutes < 5 : q.minutes >= 5);
    const subOk = subtopic === "All" || q.subtopic === subtopic;
    const queryOk = !query.trim() || text.includes(query.toLowerCase());
    const modeOk = mode === "Bookmarked" ? store.bookmarks.includes(q.id) : mode === "Recently Practiced" ? store.attempts.some((a) => a.questionId === q.id) : mode === "Weak Areas" ? ["Financial Modeling", "Accounting", "Private Equity"].includes(q.category) : true;
    return catOk && diffOk && typeOk && timeOk && subOk && queryOk && modeOk;
  }).slice(0, 4), [category, difficulty, qType, timeFilter, subtopic, query, mode, store.bookmarks, store.attempts]);

  async function getJson(url: string, init?: RequestInit): Promise<any> {
    const res = await fetch(url, { ...init, cache: "no-store" });
    return res.json();
  }
  async function refreshHealth() { const data = await getJson("/api/health"); setHealth(data); setApiResult(data); return data; }
  async function refreshNews() { setBusy("news"); try { const data = await getJson("/api/news?limit=5"); setNews(fiveNews(Array.isArray(data.news) ? data.news : fallbackNews)); setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })); setApiResult(data); } finally { setBusy(""); } }
  async function refreshQuote() { setBusy("quote"); try { const data = await getJson(`/api/market?symbol=${encodeURIComponent(symbol)}`); setQuote(data.quote || null); setApiResult(data); } finally { setBusy(""); } }
  async function testAI() { setBusy("ai"); try { const data = await getJson("/api/lab", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ module: "Practice AI", input: "Create one hard finance practice question." }) }); setApiResult(data); } finally { setBusy(""); } }
  async function refreshAll() { await Promise.allSettled([refreshHealth(), refreshNews(), refreshQuote()]); }

  function resetFilters() { setCategory("All"); setDifficulty("All"); setQType("All"); setTimeFilter("All"); setSubtopic("All"); setQuery(""); setMode("All Questions"); }
  function start(q: Question) { setSession(q); setAnswer(""); setGrade(null); }
  function bookmark(id: string) { setStore((s) => ({ ...s, bookmarks: s.bookmarks.includes(id) ? s.bookmarks.filter((x) => x !== id) : [id, ...s.bookmarks] })); }
  function submit() {
    if (!session) return;
    const clean = answer.toLowerCase();
    let score = 45;
    if (typeof session.numeric === "number") {
      const n = Number(clean.replace(/[^0-9.-]/g, ""));
      score = Math.abs(n - session.numeric) <= Math.max(0.05, session.numeric * 0.02) ? 92 : 45;
    } else if (session.keywords?.length) {
      const hits = session.keywords.filter((k) => clean.includes(k)).length;
      score = Math.round((hits / session.keywords.length) * 100);
    } else {
      score = Math.max(35, Math.min(94, Math.round(clean.length / 3)));
    }
    const correctNow = score >= 70;
    const attempt: Attempt = { id: String(Date.now()), questionId: session.id, title: session.title, category: session.category, correct: correctNow, score, answer, createdAt: new Date().toISOString() };
    setStore((s) => ({ ...s, xp: s.xp + (correctNow ? session.xp : 20), attempts: [attempt, ...s.attempts].slice(0, 50), streak: Math.max(1, s.streak) }));
    setGrade({ score, correct: correctNow, text: `${correctNow ? "Strong answer." : "Needs more investment logic."} Model answer: ${session.modelAnswer}` });
  }

  function Header() { return <header className="global-header"><div className="brand"><div className="logo-mark">CF</div><div><b>Capital Forge</b><span>Master Finance. Build Your Edge.</span></div></div><div className="search-box"><span>⌕</span><input placeholder="Search questions, topics, companies, or keywords..."/><kbd>⌘ K</kbd></div><button className="assistant-btn" onClick={() => setTab("Advanced")}>✦ AI Assistant</button><button className="icon-btn">🔔<em /></button><div className="profile"><span>DC</span><div><b>Deepak</b><small>Pro Plan</small></div><strong>⌄</strong></div></header>; }
  function Sidebar() { return <aside className="sidebar"><nav className="side-nav">{tabs.map((t) => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}><span>{navIcons[t]}</span>{t}</button>)}</nav><div className="upgrade-card"><h3>👑 Upgrade to Pro</h3><p>Unlock advanced cases, AI feedback and more.</p><button>Upgrade Now →</button></div><div className="side-footer"><b>Capital Forge v1.1.0</b><span>Built for your best tomorrow</span></div></aside>; }

  function Practice() {
    return <div className="practice-layout"><section className="practice-main"><div className="practice-top"><div><div className="crumb"><span>Practice</span><b>›</b><em>Questions</em></div><h1>Practice</h1><p>Sharpen your skills with 2,000+ curated questions across finance, markets, and interviews.</p></div><div className="practice-stats-strip"><Metric icon="📘" title="2,000+" sub="Questions"/><Metric icon="▧" title="50+" sub="Categories"/><Metric icon="↗" title="AI-Powered" sub="Personalization"/></div></div><div className="practice-banner"><div><h2>Consistent Practice Creates<br/><span>Extraordinary Results</span></h2><p>Practice. Learn. Improve. Repeat.</p></div><blockquote>“The expert in anything<br/>was once a beginner.”<i /></blockquote></div><div className="category-strip">{categoryCards.map((c) => <button key={c.name} className={category === c.name ? "selected" : ""} onClick={() => setCategory(c.name)}><span className={`cat-icon ${c.tone}`}>{c.icon}</span><b>{c.name}</b><small>{c.count}</small></button>)}<button className="cat-next">›</button></div><div className="filter-row"><select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option>All</option><option>Easy</option><option>Intermediate</option><option>Medium</option><option>Hard</option></select><select value={qType} onChange={(e) => setQType(e.target.value)}><option>All</option><option>Formula</option><option>Subjective</option><option>Calculation</option><option>Case</option><option>Market</option><option>Accounting</option></select><select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}><option value="All">Time</option><option value="lt5">&lt; 5 min</option><option value="gt5">5+ min</option></select><select value={subtopic} onChange={(e) => setSubtopic(e.target.value)}><option>All</option><option>FCFF</option><option>LBO vs DCF</option><option>Rates</option><option>Deal Process</option><option>3-Statement</option></select><div className="practice-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions..."/></div><button className="ghost" onClick={resetFilters}>Reset Filters</button><button className="view-toggle">☷</button></div><div className="practice-body"><aside className="practice-subnav">{[["All Questions","2,000+"],["Recently Practiced",String(store.attempts.length || 24)],["Bookmarked",String(store.bookmarks.length || 56)],["Weak Areas","18"],["Custom Practice","0"]].map(([name, count]) => <button key={name} className={mode === name ? "selected" : ""} onClick={() => setMode(name)}><span>{name === "All Questions" ? "▦" : name === "Recently Practiced" ? "◷" : name === "Bookmarked" ? "♡" : name === "Weak Areas" ? "◎" : "▤"}</span><b>{name}</b><small>{count}</small></button>)}</aside><section className="question-feed">{visibleQuestions.length ? visibleQuestions.map((q) => <QuestionCard key={q.id} q={q}/>) : <div className="empty-state"><h3>No questions match these filters.</h3><button onClick={resetFilters}>Clear Filters</button></div>}</section></div>{session && <section className="session-panel"><div className="section-head"><div><h2>Active Practice Session</h2><p>{session.title}</p></div><button className="ghost" onClick={() => setSession(null)}>Close</button></div><textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Write your answer with formula, logic, assumptions and interview-style conclusion."/><div className="actions"><button onClick={submit}>Submit Answer</button><button className="ghost" onClick={() => setGrade({ score: 0, correct: false, text: session.modelAnswer })}>Show Model Answer</button></div>{grade && <div className={`grade-card ${grade.correct ? "good" : "bad"}`}><b>Overall score: {grade.score}/100</b><p>{grade.text}</p><div className="rubric-grid"><span>Technical accuracy</span><b>{Math.min(98, grade.score + 4)}</b><span>Completeness</span><b>{grade.score}</b><span>Structure</span><b>{Math.max(50, grade.score - 5)}</b><span>Interview effectiveness</span><b>{Math.max(45, grade.score - 8)}</b></div></div>}</section>}</section><aside className="practice-rail"><PracticeStats/><PracticeStreak/><WeakAreas/><QuickPractice/></aside></div>;
  }

  function QuestionCard({ q }: { q: Question }) { const saved = store.bookmarks.includes(q.id); return <article className="practice-question-card"><div><div className="q-tags"><span className={`pill ${q.category === "Markets" ? "red" : q.category === "Private Equity" ? "purple" : q.category === "Investment Banking" ? "blue" : "green"}`}>{q.category}</span><span className={`pill ${q.difficulty === "Hard" ? "red" : q.difficulty === "Easy" ? "green" : "blue"}`}>{q.difficulty}</span><small>◷ {q.minutes} min</small></div><h3>{q.title}</h3><p>{q.helper}</p></div><div className="q-actions"><button className="bookmark" onClick={() => bookmark(q.id)}>{saved ? "★" : "♡"}</button><button onClick={() => start(q)}>Start Practice →</button></div></article>; }
  function PracticeStats() { return <section className="practice-rail-card stats-card"><div className="rail-head"><h3>Your Practice Stats</h3><button onClick={() => setTab("Dashboard")}>View Dashboard →</button></div><div className="stats-content"><div className="big-donut" style={{ background: `conic-gradient(#0875fa ${accuracy * 3.6}deg, #e8edf4 0deg)` }}><div><b>{accuracy}%</b><span>Questions<br/>Solved</span></div></div><div className="stats-list"><RowDot label="Correct" value={correct} tone="green"/><RowDot label="Incorrect" value={incorrect} tone="red"/><RowDot label="Skipped" value={skipped} tone="gray"/><hr/><RowDot label="Total" value={total} tone="black"/></div></div></section>; }
  function PracticeStreak() { return <section className="practice-rail-card practice-streak"><div><h3>🔥 Practice Streak</h3><p>Keep going! {store.streak} days in a row.</p></div><b>{store.streak} days</b><div className="days">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, i) => <span key={d} className={i < 5 ? "done" : ""}><i>{i < 5 ? "✓" : ""}</i>{d}</span>)}</div></section>; }
  function WeakAreas() { return <section className="practice-rail-card weak-card"><div className="rail-head"><div><h3>🎯 Weak Areas</h3><p>Focus on these topics</p></div><button onClick={() => setMode("Weak Areas")}>View All →</button></div>{[["Financial Modeling",14,"red"],["M&A",52,"red"],["Accounting",60,"amber"],["Valuation",62,"amber"]].map(([name, score, tone]) => <button key={String(name)} onClick={() => { setMode("Weak Areas"); setCategory(String(name) === "M&A" ? "PE" : String(name)); }}><span>{name}</span><i><b className={String(tone)} style={{ width: `${Number(score)}%` }}/></i><strong>{score}%</strong></button>)}</section>; }
  function QuickPractice() { return <section className="practice-rail-card quick-practice"><div className="rail-head"><div><h3>⚡ Quick Practice</h3><p>Start with a quick session</p></div><button onClick={() => setMode("Custom Practice")}>⚙ Custom</button></div><div>{[["10","Questions","blue"],["20","Questions","green"],["Mixed","Difficulty","red"],["Previous","Mistakes","purple"]].map(([a, b, t]) => <button key={a} className={t} onClick={() => { setMode(String(a) === "Previous" ? "Recently Practiced" : "All Questions"); start(questions[0]); }}><span>{a}</span><small>{b}</small></button>)}</div></section>; }

  function Home() { return <div className="home-layout"><section className="main-column"><div className="hero-panel"><div><p className="eyebrow">AI-powered finance learning</p><h1>Welcome back, <span>Deepak!</span> 👋</h1><p>Practice smarter across IB, PE, VC, private credit, valuation, markets and interviews.</p><div className="hero-stats"><MiniStat label="AI Accuracy" value={`${accuracy}%`} tone="green"/><MiniStat label="Questions Solved" value={String(store.attempts.length)} tone="blue"/><MiniStat label="XP" value={String(store.xp)} tone="red"/></div></div><div className="hero-art"><div className="orbit one"/><div className="orbit two"/><div className="ai-block">AI</div><div className="hero-chip left">DCF</div><div className="hero-chip right">LBO</div></div></div><section className="news-section"><div className="section-head"><div><h2><span className="red-dot"/>Live News & Updates</h2><p>Curated insights from markets, AI, and global finance.</p></div><div className="head-actions"><small>Last updated: {lastUpdated}</small><button onClick={refreshNews}>{busy === "news" ? "Refreshing..." : "Refresh"}</button></div></div><div className="news-row">{visibleNews.map((n) => <NewsCard key={n.id} item={n}/>)}</div></section></section><aside className="right-rail"><HomeProgress/><HomeStreak/><HomeInsight/><HomeReco/><HomeQuick/></aside></div>; }
  function NewsCard({ item }: { item: NewsItem }) { return <article className="news-card"><div className="news-visual"><img src={item.imageUrl || fallbackImages[0]} alt=""/></div><div className="news-meta"><span className={`pill ${item.tone}`}>{item.tag}</span><small>{item.time}</small></div><h3>{item.title}</h3><p>{item.summary}</p><div className="news-footer"><small>{item.source}</small><button onClick={() => item.url ? window.open(item.url, "_blank", "noopener,noreferrer") : undefined}>Read →</button></div></article>; }
  function MiniStat({ label, value, tone }: { label: string; value: string; tone: Tone }) { return <div className={`mini-stat ${tone}`}><span>{label}</span><b>{value}</b></div>; }
  function Metric({ icon, title, sub }: { icon: string; title: string; sub: string }) { return <div><span>{icon}</span><b>{title}</b><small>{sub}</small></div>; }
  function RowDot({ label, value, tone }: { label: string; value: number; tone: Tone }) { return <div className="row-dot"><span className={tone}/><p>{label}</p><b>{value}</b></div>; }
  function Row({ label, value, tone }: { label: string; value: number; tone: Tone }) { return <div className="meter-row"><span>{label}</span><i><b className={tone} style={{ width: `${value}%` }}/></i><strong>{value}%</strong></div>; }
  function HomeProgress() { const p = Math.max(18, Math.min(100, Math.round(store.xp / 20))); return <section className="rail-card progress-card"><div className="rail-title"><h3>Your Progress</h3><button onClick={() => setTab("Dashboard")}>View Dashboard →</button></div><div className="progress-body"><div className="donut" style={{ background: `conic-gradient(#0875fa ${p * 3.6}deg, #e8edf4 0deg)` }}><span><b>{p}%</b><small>Overall</small></span></div><div><Row label="Practice" value={accuracy} tone="green"/><Row label="Advanced" value={connectedApis * 14} tone="blue"/><Row label="Interview" value={68} tone="purple"/></div></div></section>; }
  function HomeStreak() { return <section className="rail-card streak-card"><div><h3>🔥 7 Day Streak</h3><p>Keep it up!</p></div><b>{store.streak}<small>Days</small></b><div className="week">{["✓","✓","✓","✓","F","S","S"].map((d, i) => <span key={i} className={i < 4 ? "done" : i === 4 ? "today" : ""}>{d}</span>)}</div></section>; }
  function HomeInsight() { return <section className="rail-card insight-card"><h3>AI Insights <span>New</span></h3><p>You perform best in Valuation and Modeling. Focus on Market Analysis to balance your skillset.</p><button onClick={testAI}>View Insights →</button><div className="orb">AI</div></section>; }
  function HomeReco() { return <section className="rail-card rec-card"><h3>Recommended For You</h3>{["Complete 5 more Advanced questions","Try a Hard case this weekend","Book a mock interview"].map((r, i) => <button key={r} onClick={() => setTab(i === 2 ? "Interview Room" : i === 1 ? "Practice" : "Advanced")}><span>{i === 0 ? "🎯" : i === 1 ? "🧠" : "👤"}</span><div>{r}<small>+{(i + 1) * 100} XP</small></div><b>›</b></button>)}</section>; }
  function HomeQuick() { return <section className="rail-card quick-card"><h3>Quick Actions</h3><div><button onClick={() => setTab("Practice")}>▶<span>Start Practice</span></button><button onClick={() => setTab("Advanced")}>▥<span>Advanced</span></button><button onClick={() => setTab("Interview Room")}>▣<span>Interview</span></button><button onClick={() => setTab("API")}>⚙<span>API Vault</span></button></div></section>; }

  function SimplePage({ title }: { title: string }) { return <section className="section-card work-card"><h1>{title}</h1><p>{title === "API Vault" ? "Production APIs are read from Vercel environment variables. API configuration stays out of Home and Practice." : "This workspace remains connected while the Practice workstation is rebuilt."}</p><div className="actions"><button onClick={refreshHealth}>Refresh Health</button><button onClick={testAI}>{busy === "ai" ? "Testing..." : "Test AI"}</button><input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}/><button onClick={refreshQuote}>{busy === "quote" ? "Loading..." : `Quote ${symbol}`}</button></div><pre>{json({ health, quote, apiResult })}</pre></section>; }

  return <div className="app-frame"><Header/><Sidebar/><main className="workspace">{tab === "Home" && <Home/>}{tab === "Practice" && <Practice/>}{tab === "Advanced" && <SimplePage title="Advanced"/>}{tab === "Dashboard" && <SimplePage title="Dashboard"/>}{tab === "Feedback" && <SimplePage title="Feedback"/>}{tab === "Interview Room" && <SimplePage title="Interview Room"/>}{tab === "API" && <SimplePage title="API Vault"/>}</main></div>;
}
