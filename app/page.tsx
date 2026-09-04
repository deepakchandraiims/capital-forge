"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

type Tab = "Home" | "Practice" | "Advanced" | "Dashboard" | "Feedback" | "Interview Room" | "API";
type Tone = "blue" | "red" | "green" | "purple" | "black" | "amber" | "gray";
type Difficulty = "Easy" | "Intermediate" | "Medium" | "Hard" | "MD";
type QType = "Formula" | "Subjective" | "Calculation" | "Case" | "Market" | "Accounting";

type NewsItem = { id: string; tag: string; tone: Tone; title: string; summary: string; time: string; visual?: string; imageUrl?: string; source?: string; url?: string };
type Health = { keyStatus?: Record<string, boolean>; sources?: Record<string, string>; phase?: string };
type Quote = { symbol?: string; currency?: string; price?: number | null; change?: number | null; percentChange?: number | null };
type Question = { id: string; title: string; helper: string; category: string; subtopic: string; difficulty: Difficulty; type: QType; minutes: number; xp: number; answer: string; numeric?: number; accepted?: string[] };
type Attempt = { id: string; questionId: string; title: string; category: string; correct: boolean; score: number; createdAt: string; answer: string };
type Store = { xp: number; attempts: Attempt[]; bookmarks: string[]; skipped: number; streak: number; notes: string[] };

const tabs: Tab[] = ["Home", "Practice", "Advanced", "Dashboard", "Feedback", "Interview Room", "API"];
const storeKey = "capital-forge-practice-workstation-v1";
const baseStore: Store = { xp: 0, attempts: [], bookmarks: [], skipped: 23, streak: 5, notes: [] };
const icons: Record<Tab, string> = { Home: "⌂", Practice: "▣", Advanced: "▧", Dashboard: "▦", Feedback: "▱", "Interview Room": "▻", API: "⌘" };

const fallbackImages = [
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1460317442991-0ec209397118?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1446776709462-d6b525c57bd3?q=80&w=800&auto=format&fit=crop"
];

const fallbackNews: NewsItem[] = [
  { id: "n1", tag: "Markets", tone: "green", title: "Equities rally on cooling inflation; tech leads gains", summary: "S&P 500 rises as investors weigh rates, earnings and positioning into quarter-end.", time: "2h ago", source: "Capital Forge", imageUrl: fallbackImages[0] },
  { id: "n2", tag: "AI & Tech", tone: "purple", title: "AI capex cycle creates new valuation debate", summary: "Turn this into a margin, DCF and terminal multiple practice question.", time: "3h ago", source: "Capital Forge", imageUrl: fallbackImages[1] },
  { id: "n3", tag: "Strategy", tone: "blue", title: "PE firms sit on dry powder as exits remain selective", summary: "Deal teams are focusing on resilient margins, cash conversion and debt capacity.", time: "4h ago", source: "Capital Forge", imageUrl: fallbackImages[2] },
  { id: "n4", tag: "Business", tone: "red", title: "Renewables M&A accelerates across infra funds", summary: "Strategics and sponsors continue screening scale platforms in energy transition.", time: "5h ago", source: "Capital Forge", imageUrl: fallbackImages[3] },
  { id: "n5", tag: "Global", tone: "blue", title: "Global markets mixed before central-bank decisions", summary: "Investors are watching rates, growth and risk appetite into the next policy cycle.", time: "6h ago", source: "Capital Forge", imageUrl: fallbackImages[4] }
];

const categories = [
  { name: "All", count: "2,000+", icon: "▦", tone: "blue" as Tone },
  { name: "IB", count: "320", icon: "▥", tone: "blue" as Tone },
  { name: "PE", count: "280", icon: "P", tone: "red" as Tone },
  { name: "VC", count: "260", icon: "♆", tone: "green" as Tone },
  { name: "Financial Modeling", count: "350", icon: "▣", tone: "green" as Tone },
  { name: "Markets", count: "220", icon: "▥", tone: "purple" as Tone },
  { name: "Accounting", count: "180", icon: "▤", tone: "amber" as Tone },
  { name: "Credit", count: "210", icon: "◩", tone: "black" as Tone },
  { name: "Valuation", count: "300", icon: "◇", tone: "blue" as Tone }
];

const questions: Question[] = [
  { id: "q1", title: "What is the formula for FCFF and explain each component?", helper: "Write the formula and explain the logic behind each component and when it is used.", category: "Financial Modeling", subtopic: "FCFF", difficulty: "Intermediate", type: "Formula", minutes: 5, xp: 80, answer: "FCFF = EBIT(1-T) + D&A - Capex - ΔNWC. EBIT after tax is operating profit available to all capital providers; D&A is added back as non-cash; capex and working capital are cash reinvestment needs.", accepted: ["ebit", "tax", "d&a", "capex", "nwc"] },
  { id: "q2", title: "Explain the difference between an LBO model and a DCF model.", helper: "Compare the purpose, key assumptions and typical use cases.", category: "Investment Banking", subtopic: "LBO vs DCF", difficulty: "Easy", type: "Subjective", minutes: 3, xp: 60, answer: "A DCF values intrinsic enterprise value from future free cash flows discounted by WACC. An LBO assesses what a financial sponsor can pay using debt, operating cash flow, exit value and required IRR/MOIC." },
  { id: "q3", title: "Why do interest rates impact equity valuations?", helper: "Explain the transmission mechanism and its effect on different sectors.", category: "Markets", subtopic: "Rates", difficulty: "Medium", type: "Market", minutes: 4, xp: 70, answer: "Higher rates raise the discount rate, reduce present value of future cash flows, increase debt cost, pressure multiples and can shift investor allocation toward fixed income. Long-duration growth stocks usually suffer more." },
  { id: "q4", title: "Walk me through a typical PE deal lifecycle from sourcing to exit.", helper: "Cover key stages, stakeholders, due diligence, value creation and exit options.", category: "Private Equity", subtopic: "Deal Process", difficulty: "Hard", type: "Case", minutes: 6, xp: 100, answer: "Sourcing, initial screen, NDA, CIM review, IOI, diligence, QoE, debt financing, IC approval, SPA negotiation, closing, 100-day plan, value creation, monitoring and exit via strategic sale, sponsor sale or IPO." },
  { id: "q5", title: "Calculate FCFF from EBIT of ₹100 Cr, tax 25%, D&A ₹12 Cr, Capex ₹28 Cr and NWC increase ₹9 Cr.", helper: "Use the standard FCFF bridge and show the math.", category: "Financial Modeling", subtopic: "FCFF", difficulty: "Medium", type: "Calculation", minutes: 4, xp: 80, numeric: 50, answer: "FCFF = 100 × (1 - 25%) + 12 - 28 - 9 = ₹50 Cr." },
  { id: "q6", title: "What are the most important checks in a three-statement model?", helper: "Think like a model reviewer before an investment committee.", category: "Accounting", subtopic: "3-Statement", difficulty: "Intermediate", type: "Accounting", minutes: 5, xp: 75, answer: "Balance sheet balance, cash flow reconciliation, debt schedule links, working capital logic, depreciation schedule, tax calculation, circular references, sign convention and hardcoded formulas." }
];

const weakAreas = [
  { name: "Financial Modeling", score: 14, tone: "red" as Tone },
  { name: "M&A", score: 52, tone: "red" as Tone },
  { name: "Accounting", score: 60, tone: "amber" as Tone },
  { name: "Valuation", score: 62, tone: "amber" as Tone }
];

function normalizeTone(value?: string): Tone {
  return value === "red" || value === "green" || value === "purple" || value === "black" || value === "amber" || value === "gray" || value === "blue" ? value : "blue";
}
function pct(n: number, d: number) { return d ? Math.round((n / d) * 100) : 0; }
function money(n?: number | null) { return typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"; }
function cssPct(n: number): CSSProperties { return { "--p": `${Math.max(0, Math.min(100, n))}%` } as CSSProperties; }
function safeJson(value: unknown) { return JSON.stringify(value, null, 2); }
function fiveNews(items: NewsItem[]) {
  const merged = [...items].filter(Boolean).map((item, index) => ({ ...item, tone: normalizeTone(item.tone), imageUrl: item.imageUrl || fallbackImages[index % fallbackImages.length] }));
  let cursor = 0;
  while (merged.length < 5) merged.push({ ...fallbackNews[cursor % fallbackNews.length], id: `fill-${cursor}-${fallbackNews[cursor % fallbackNews.length].id}` }), cursor += 1;
  return merged.slice(0, 5);
}

export default function CapitalForge() {
  const [tab, setTab] = useState<Tab>("Home");
  const [store, setStore] = useState<Store>(baseStore);
  const [news, setNews] = useState<NewsItem[]>(fallbackNews);
  const [health, setHealth] = useState<Health | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [apiResult, setApiResult] = useState<unknown>({ status: "ready", message: "Capital Forge loaded." });
  const [busy, setBusy] = useState("");
  const [symbol, setSymbol] = useState("AAPL");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [qType, setQType] = useState("All");
  const [timeFilter, setTimeFilter] = useState("All");
  const [subtopic, setSubtopic] = useState("All");
  const [search, setSearch] = useState("");
  const [practiceMode, setPracticeMode] = useState("All Questions");
  const [sessionQ, setSessionQ] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<{ score: number; correct: boolean; feedback: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState("Just now");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) setStore({ ...baseStore, ...JSON.parse(raw) });
    } catch {}
    void refreshAll();
  }, []);

  useEffect(() => {
    try { localStorage.setItem(storeKey, JSON.stringify(store)); } catch {}
  }, [store]);

  const correct = store.attempts.filter((a) => a.correct).length;
  const incorrect = store.attempts.filter((a) => !a.correct).length;
  const displayCorrect = store.attempts.length ? correct : 142;
  const displayIncorrect = store.attempts.length ? incorrect : 67;
  const displaySkipped = store.attempts.length ? store.skipped : 23;
  const displayTotal = displayCorrect + displayIncorrect + displaySkipped;
  const accuracy = pct(displayCorrect, displayCorrect + displayIncorrect);
  const solved = store.attempts.length;
  const visibleNews = useMemo(() => fiveNews(news), [news]);
  const connected = ["supabaseConfigured", "newsConfigured", "marketConfigured", "backupMarketConfigured", "fundamentalsConfigured", "aiConfigured"].filter((key) => health?.keyStatus?.[key]).length;

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const text = `${q.title} ${q.helper} ${q.category} ${q.subtopic} ${q.type} ${q.difficulty}`.toLowerCase();
      const inCategory = category === "All" || q.category === category || (category === "IB" && q.category === "Investment Banking") || (category === "PE" && q.category === "Private Equity");
      const inDifficulty = difficulty === "All" || q.difficulty === difficulty || (difficulty === "Expert" && q.difficulty === "MD");
      const inType = qType === "All" || q.type === qType;
      const inTime = timeFilter === "All" || (timeFilter === "< 5 min" ? q.minutes < 5 : timeFilter === "5+ min" ? q.minutes >= 5 : true);
      const inSubtopic = subtopic === "All" || q.subtopic === subtopic;
      const inSearch = !search.trim() || text.includes(search.toLowerCase());
      const inMode = practiceMode === "Bookmarked" ? store.bookmarks.includes(q.id) : practiceMode === "Recently Practiced" ? store.attempts.some((a) => a.questionId === q.id) : practiceMode === "Weak Areas" ? ["Financial Modeling", "M&A", "Accounting", "Valuation"].includes(q.category) : true;
      return inCategory && inDifficulty && inType && inTime && inSubtopic && inSearch && inMode;
    }).slice(0, 4);
  }, [category, difficulty, qType, timeFilter, subtopic, search, practiceMode, store.bookmarks, store.attempts]);

  async function getJson(url: string, init?: RequestInit) {
    const response = await fetch(url, { ...init, cache: "no-store" });
    return response.json();
  }
  async function refreshHealth() {
    const data = await getJson("/api/health");
    setHealth(data); setApiResult(data); return data;
  }
  async function refreshNews() {
    setBusy("news");
    try {
      const data = await getJson("/api/news?limit=5");
      setNews(fiveNews(Array.isArray(data.news) ? data.news : fallbackNews));
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setApiResult(data);
    } catch (error) {
      setNews(fallbackNews); setApiResult({ error: error instanceof Error ? error.message : "News failed" });
    } finally { setBusy(""); }
  }
  async function refreshQuote() {
    setBusy("quote");
    try {
      const data = await getJson(`/api/market?symbol=${encodeURIComponent(symbol || "AAPL")}`);
      setQuote(data.quote || null); setApiResult(data);
    } finally { setBusy(""); }
  }
  async function testAI() {
    setBusy("ai");
    try {
      const data = await getJson("/api/lab", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ module: "Practice AI", input: "Create one hard finance practice question." }) });
      setApiResult(data);
    } finally { setBusy(""); }
  }
  async function refreshAll() { await Promise.allSettled([refreshHealth(), refreshNews(), refreshQuote()]); }

  function startPractice(q: Question) {
    setSessionQ(q); setAnswer(""); setGrade(null); setPracticeMode("All Questions");
  }
  function toggleBookmark(id: string) {
    setStore((s) => ({ ...s, bookmarks: s.bookmarks.includes(id) ? s.bookmarks.filter((x) => x !== id) : [id, ...s.bookmarks] }));
  }
  function submitPractice() {
    if (!sessionQ) return;
    const clean = answer.toLowerCase().trim();
    let score = 0;
    if (typeof sessionQ.numeric === "number") {
      const num = Number(clean.replace(/[^0-9.-]/g, ""));
      score = Math.abs(num - sessionQ.numeric) <= Math.max(0.05, sessionQ.numeric * 0.02) ? 92 : 45;
    } else if (sessionQ.accepted?.length) {
      const hits = sessionQ.accepted.filter((x) => clean.includes(x.toLowerCase())).length;
      score = Math.round((hits / sessionQ.accepted.length) * 100);
    } else {
      const required = sessionQ.answer.toLowerCase().split(/\s+/).filter((w) => w.length > 5).slice(0, 12);
      const hits = required.filter((w) => clean.includes(w)).length;
      score = Math.max(35, Math.min(94, Math.round((hits / Math.max(1, required.length)) * 80 + Math.min(15, clean.length / 35))));
    }
    const correctNow = score >= 70;
    const attempt: Attempt = { id: crypto.randomUUID(), questionId: sessionQ.id, title: sessionQ.title, category: sessionQ.category, correct: correctNow, score, createdAt: new Date().toISOString(), answer };
    setStore((s) => ({ ...s, xp: s.xp + (correctNow ? sessionQ.xp : 20), attempts: [attempt, ...s.attempts].slice(0, 50), streak: Math.max(1, s.streak) }));
    setGrade({ correct: correctNow, score, feedback: `${correctNow ? "Strong answer." : "Needs work."} Model answer: ${sessionQ.answer}` });
  }
  function resetFilters() { setCategory("All"); setDifficulty("All"); setQType("All"); setTimeFilter("All"); setSubtopic("All"); setSearch(""); setPracticeMode("All Questions"); }
  function quick(mode: string) { setPracticeMode(mode); setSessionQ(questions[0]); setAnswer(""); setGrade(null); }

  function Header() {
    return <header className="global-header"><div className="brand"><div className="logo-mark">CF</div><div><b>Capital Forge</b><span>Master Finance. Build Your Edge.</span></div></div><div className="search-box"><span>⌕</span><input placeholder="Search questions, topics, companies, or keywords..." /><kbd>⌘ K</kbd></div><button className="assistant-btn" onClick={() => setTab("Advanced")}>✦ AI Assistant</button><button className="icon-btn">🔔<em>3</em></button><div className="profile"><span>DC</span><div><b>Deepak</b><small>Pro Plan</small></div><strong>⌄</strong></div></header>;
  }
  function Sidebar() {
    return <aside className="sidebar"><nav className="side-nav">{tabs.map((t) => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}><span>{icons[t]}</span>{t}</button>)}</nav><div className="upgrade-card"><h3>👑 Upgrade to Pro</h3><p>Unlock advanced cases, AI feedback and more.</p><button>Upgrade Now →</button></div><div className="side-footer"><b>Capital Forge v1.1.0</b><span>Built for your best tomorrow</span></div></aside>;
  }

  function Home() {
    return <div className="home-layout"><section className="main-column"><div className="hero-panel"><div><p className="eyebrow">AI-powered finance learning</p><h1>Welcome back, <span>Deepak!</span> 👋</h1><p>Practice smarter across IB, PE, VC, private credit, valuation, markets and interviews.</p><div className="hero-stats"><MiniStat label="AI Accuracy" value={`${accuracy}%`} tone="green" /><MiniStat label="Questions Solved" value={String(solved)} tone="blue" /><MiniStat label="XP" value={String(store.xp)} tone="red" /></div></div><div className="hero-art"><div className="orbit one"/><div className="orbit two"/><div className="ai-block">AI</div><div className="hero-chip left">DCF</div><div className="hero-chip right">LBO</div></div></div><section className="news-section"><div className="section-head"><div><h2><span className="red-dot"/>Live News & Updates</h2><p>Curated insights from markets, AI, and global finance.</p></div><div className="head-actions"><small>Last updated: {lastUpdated}</small><button onClick={refreshNews}>{busy === "news" ? "Refreshing..." : "Refresh"}</button></div></div><div className="news-row">{visibleNews.map((n) => <NewsCard key={n.id} item={n}/>)}</div></section></section><aside className="right-rail"><ProgressHome/><StreakHome/><InsightsHome/><RecommendedHome/><QuickHome/></aside></div>;
  }

  function Practice() {
    return <div className="practice-layout"><section className="practice-main"><div className="practice-top"><div><div className="crumb"><span>Practice</span><b>›</b><em>Questions</em></div><h1>Practice</h1><p>Sharpen your skills with 2,000+ curated questions across finance, markets, and interviews.</p></div><div className="practice-stats-strip"><Metric icon="📘" title="2,000+" sub="Questions"/><Metric icon="▧" title="50+" sub="Categories"/><Metric icon="↗" title="AI-Powered" sub="Personalization"/></div></div><div className="practice-banner"><div><h2>Consistent Practice Creates<br/><span>Extraordinary Results</span></h2><p>Practice. Learn. Improve. Repeat.</p></div><blockquote>“The expert in anything<br/>was once a beginner.”<i/></blockquote></div><div className="category-strip">{categories.slice(0, 7).map((c) => <button key={c.name} className={category === c.name ? "selected" : ""} onClick={() => setCategory(c.name)}><span className={`cat-icon ${c.tone}`}>{c.icon}</span><b>{c.name}</b><small>{c.count}</small></button>)}<button className="cat-next">›</button></div><div className="filter-row"><select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option>All</option><option>Easy</option><option>Intermediate</option><option>Medium</option><option>Hard</option><option>MD</option></select><select value={qType} onChange={(e) => setQType(e.target.value)}><option>All</option><option>Formula</option><option>Subjective</option><option>Calculation</option><option>Case</option><option>Market</option><option>Accounting</option></select><select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}><option>All</option><option>{"< 5 min"}</option><option>5+ min</option></select><select value={subtopic} onChange={(e) => setSubtopic(e.target.value)}><option>All</option><option>FCFF</option><option>LBO vs DCF</option><option>Rates</option><option>Deal Process</option><option>3-Statement</option></select><div className="practice-search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions..."/></div><button onClick={resetFilters} className="ghost">Reset Filters</button><button className="view-toggle">☷</button></div><div className="practice-body"><aside className="practice-subnav">{[["All Questions","2,000+"],["Recently Practiced",String(store.attempts.length || 24)],["Bookmarked",String(store.bookmarks.length || 56)],["Weak Areas","18"],["Custom Practice","0"]].map(([name,count]) => <button key={name} className={practiceMode === name ? "selected" : ""} onClick={() => setPracticeMode(name)}><span>{name === "All Questions" ? "▦" : name === "Recently Practiced" ? "◷" : name === "Bookmarked" ? "♡" : name === "Weak Areas" ? "◎" : "▤"}</span><b>{name}</b><small>{count}</small></button>)}</aside><section className="question-feed">{filteredQuestions.length ? filteredQuestions.map((q) => <QuestionCard key={q.id} q={q}/>) : <div className="empty-state"><h3>No questions match these filters.</h3><button onClick={resetFilters}>Clear Filters</button></div>}</section></div>{sessionQ && <section className="session-panel"><div className="section-head"><div><h2>Active Practice Session</h2><p>{sessionQ.title}</p></div><button className="ghost" onClick={() => setSessionQ(null)}>Close</button></div><textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Write your answer here. Add formula, logic, assumptions and interview-style conclusion."/><div className="actions"><button onClick={submitPractice}>Submit Answer</button><button className="ghost" onClick={() => setGrade({ score: 0, correct: false, feedback: sessionQ.answer })}>Show Model Answer</button></div>{grade && <div className={`grade-card ${grade.correct ? "good" : "bad"}`}><b>Overall score: {grade.score}/100</b><p>{grade.feedback}</p><div className="rubric-grid"><span>Technical accuracy</span><b>{Math.min(98, grade.score + 4)}</b><span>Completeness</span><b>{grade.score}</b><span>Structure</span><b>{Math.max(50, grade.score - 5)}</b><span>Interview effectiveness</span><b>{Math.max(45, grade.score - 8)}</b></div></div>}</section>}</section><aside className="practice-rail"><PracticeStats/><PracticeStreak/><WeakAreas/><QuickPractice/></aside></div>;
  }

  function QuestionCard({ q }: { q: Question }) {
    const bookmarked = store.bookmarks.includes(q.id);
    return <article className="practice-question-card"><div className="q-copy"><div className="q-tags"><span className={`pill ${q.category === "Markets" ? "red" : q.category === "Private Equity" ? "purple" : q.category === "Investment Banking" ? "blue" : "green"}`}>{q.category}</span><span className={`pill ${q.difficulty === "Hard" || q.difficulty === "MD" ? "red" : q.difficulty === "Easy" ? "green" : "blue"}`}>{q.difficulty}</span><small>◷ {q.minutes} min</small></div><h3>{q.title}</h3><p>{q.helper}</p></div><div className="q-actions"><button className="bookmark" onClick={() => toggleBookmark(q.id)}>{bookmarked ? "★" : "♡"}</button><button onClick={() => startPractice(q)}>Start Practice →</button></div></article>;
  }
  function PracticeStats() { return <section className="practice-rail-card stats-card"><div className="rail-head"><h3>Your Practice Stats</h3><button onClick={() => setTab("Dashboard")}>View Dashboard →</button></div><div className="stats-content"><div className="big-donut" style={cssPct(accuracy)}><div><b>{accuracy}%</b><span>Questions<br/>Solved</span></div></div><div className="stats-list"><RowDot label="Correct" value={displayCorrect} tone="green"/><RowDot label="Incorrect" value={displayIncorrect} tone="red"/><RowDot label="Skipped" value={displaySkipped} tone="gray"/><hr/><RowDot label="Total" value={displayTotal} tone="black"/></div></div></section>; }
  function PracticeStreak() { return <section className="practice-rail-card practice-streak"><div><h3>🔥 Practice Streak</h3><p>Keep going! {store.streak} days in a row.</p></div><b>{store.streak} days</b><div className="days">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d,i) => <span key={d} className={i < 5 ? "done" : ""}><i>{i < 5 ? "✓" : ""}</i>{d}</span>)}</div></section>; }
  function WeakAreas() { return <section className="practice-rail-card weak-card"><div className="rail-head"><div><h3>🎯 Weak Areas</h3><p>Focus on these topics</p></div><button onClick={() => setPracticeMode("Weak Areas")}>View All →</button></div>{weakAreas.map((w) => <button key={w.name} onClick={() => { setCategory(w.name === "M&A" ? "PE" : w.name); setPracticeMode("Weak Areas"); }}><span>{w.name}</span><i><b className={w.tone} style={cssPct(w.score)}/></i><strong>{w.score}%</strong></button>)}</section>; }
  function QuickPractice() { return <section className="practice-rail-card quick-practice"><div className="rail-head"><div><h3>⚡ Quick Practice</h3><p>Start with a quick session</p></div><button onClick={() => setPracticeMode("Custom Practice")}>⚙ Custom</button></div><div>{[["10","Questions","blue"],["20","Questions","green"],["Mixed","Difficulty","red"],["Previous","Mistakes","purple"]].map(([a,b,t]) => <button key={a} className={t} onClick={() => quick(a === "Previous" ? "Recently Practiced" : "All Questions")}><span>{a}</span><small>{b}</small></button>)}</div></section>; }

  function MiniStat({ label, value, tone }: { label: string; value: string; tone: Tone }) { return <div className={`mini-stat ${tone}`}><span>{label}</span><b>{value}</b></div>; }
  function Metric({ icon, title, sub }: { icon: string; title: string; sub: string }) { return <div><span>{icon}</span><b>{title}</b><small>{sub}</small></div>; }
  function NewsCard({ item }: { item: NewsItem }) { return <article className="news-card"><div className="news-visual">{item.imageUrl ? <img src={item.imageUrl} alt=""/> : <span>{item.visual || "📰"}</span>}</div><div className="news-meta"><span className={`pill ${item.tone}`}>{item.tag}</span><small>{item.time}</small></div><h3>{item.title}</h3><p>{item.summary}</p><div className="news-footer"><small>{item.source}</small><button onClick={() => item.url ? window.open(item.url, "_blank", "noopener,noreferrer") : undefined}>Read →</button></div></article>; }
  function Row({ label, value, tone }: { label: string; value: number; tone: Tone }) { return <div className="meter-row"><span>{label}</span><i><b className={tone} style={cssPct(value)}/></i><strong>{value}%</strong></div>; }
  function RowDot({ label, value, tone }: { label: string; value: number; tone: Tone }) { return <div className="row-dot"><span className={tone}/><p>{label}</p><b>{value}</b></div>; }
  function ProgressHome() { return <section className="rail-card progress-card"><div className="rail-title"><h3>Your Progress</h3><button onClick={() => setTab("Dashboard")}>View Dashboard →</button></div><div className="progress-body"><div className="donut" style={cssPct(Math.max(18, Math.min(100, store.xp / 20)))}><span><b>{Math.max(18, Math.min(100, Math.round(store.xp / 20)))}%</b><small>Overall</small></span></div><div><Row label="Practice" value={accuracy} tone="green"/><Row label="Advanced" value={connected * 14} tone="blue"/><Row label="Interview" value={68} tone="purple"/></div></div></section>; }
  function StreakHome() { return <section className="rail-card streak-card"><div><h3>🔥 7 Day Streak</h3><p>Keep it up!</p></div><b>{store.streak}<small>Days</small></b><div className="week">{["✓","✓","✓","✓","F","S","S"].map((d,i) => <span key={i} className={i < 4 ? "done" : i === 4 ? "today" : ""}>{d}</span>)}</div></section>; }
  function InsightsHome() { return <section className="rail-card insight-card"><h3>AI Insights <span>New</span></h3><p>You perform best in Valuation and Modeling. Focus on Market Analysis to balance your skill set.</p><button onClick={testAI}>View Insights →</button><div className="orb">AI</div></section>; }
  function RecommendedHome() { return <section className="rail-card rec-card"><h3>Recommended For You</h3>{["Complete 5 more Advanced questions", "Try a Hard case this weekend", "Book a mock interview"].map((r,i) => <button key={r} onClick={() => setTab(i === 2 ? "Interview Room" : i === 1 ? "Practice" : "Advanced")}><span>{i === 0 ? "🎯" : i === 1 ? "🧠" : "👤"}</span><div>{r}<small>+{(i + 1) * 100} XP</small></div><b>›</b></button>)}</section>; }
  function QuickHome() { return <section className="rail-card quick-card"><h3>Quick Actions</h3><div><button onClick={() => setTab("Practice")}>▶<span>Start Practice</span></button><button onClick={() => setTab("Advanced")}>▥<span>Advanced</span></button><button onClick={() => setTab("Interview Room")}>▣<span>Interview</span></button><button onClick={() => setTab("API")}>⚙<span>API Vault</span></button></div></section>; }

  function Advanced() { return <section className="section-card work-card"><h1>Advanced</h1><p>25 advanced AI modules are connected to the AI provider when configured.</p><div className="module-grid">{["Recruiter Mode", "MD Pressure Room", "Deal Teardown Library", "Excel Muscle Memory", "Model Error Hunter", "IC Memo Builder", "Would You Invest Game", "Live News Question Engine"].map((m) => <article key={m}><span>AI Module</span><h3>{m}</h3><p>Generate pressure-tested finance practice output.</p><button onClick={testAI}>{busy === "ai" ? "Running..." : "Launch"}</button></article>)}</div><pre>{safeJson(apiResult)}</pre></section>; }
  function Dashboard() { return <section className="section-card work-card"><h1>Dashboard</h1><div className="dash-grid"><MiniStat label="XP" value={String(store.xp)} tone="blue"/><MiniStat label="Accuracy" value={`${accuracy}%`} tone="green"/><MiniStat label="Attempts" value={String(store.attempts.length)} tone="red"/><MiniStat label="APIs" value={`${connected}/6`} tone="purple"/></div><pre>{safeJson({ quote, health })}</pre></section>; }
  function Feedback() { return <section className="section-card work-card"><h1>Feedback</h1><p>AI feedback history and practice recommendations.</p><button onClick={testAI}>{busy === "ai" ? "Testing..." : "Run AI Feedback Test"}</button><pre>{safeJson(apiResult)}</pre></section>; }
  function InterviewRoom() { return <section className="section-card work-card"><h1>Interview Room</h1><div className="module-grid">{["PE Partner Round", "IB Technical Sprint", "Private Credit IC", "VC Growth Round"].map((m) => <article key={m}><h3>{m}</h3><p>Practice structured, timed interview answers.</p><button onClick={() => setTab("Practice")}>Start Mock</button></article>)}</div></section>; }
  function API() { return <section className="section-card work-card"><h1>API Vault</h1><p>Production APIs are read from Vercel environment variables. API configuration stays out of Home and Practice.</p><div className="api-grid">{["supabaseConfigured","newsConfigured","marketConfigured","backupMarketConfigured","fundamentalsConfigured","aiConfigured"].map((k) => <article key={k}><b>{k.replace("Configured","")}</b><span className={health?.keyStatus?.[k] ? "ok" : "miss"}>{health?.keyStatus?.[k] ? "Connected" : "Missing"}</span></article>)}</div><div className="actions"><input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}/><button onClick={refreshQuote}>{busy === "quote" ? "Loading..." : `Refresh ${symbol}`}</button><button className="ghost" onClick={refreshHealth}>Refresh Health</button></div><pre>{safeJson(apiResult)}</pre></section>; }

  return <div className="app-frame"><Header/><Sidebar/><main className="workspace">{tab === "Home" && <Home/>}{tab === "Practice" && <Practice/>}{tab === "Advanced" && <Advanced/>}{tab === "Dashboard" && <Dashboard/>}{tab === "Feedback" && <Feedback/>}{tab === "Interview Room" && <InterviewRoom/>}{tab === "API" && <API/>}</main></div>;
}
