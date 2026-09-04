"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type Tab = "Home" | "Practice" | "Advanced" | "Dashboard" | "Feedback" | "Interview Room" | "API";
type Tone = "blue" | "red" | "green" | "purple" | "amber" | "gray";
type ModuleStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

type NewsItem = {
  id: string;
  tag: string;
  tone?: Tone;
  title: string;
  summary: string;
  time: string;
  imageUrl?: string;
  source?: string;
  url?: string;
};

type Health = { keyStatus?: Record<string, boolean>; status?: string; phase?: string };
type Quote = { symbol?: string; currency?: string; price?: number | null; change?: number | null; percentChange?: number | null };

type Question = {
  id: string;
  category: string;
  difficulty: string;
  minutes: number;
  title: string;
  helper: string;
};

type AdvancedModule = {
  id: string;
  rank: number;
  slug: string;
  name: string;
  description: string;
  family: string;
  tags: string[];
  icon: string;
  tone: Tone;
  difficulty: "Advanced" | "Expert";
  lessons: number;
  cases: number;
  questions: number;
};

type ProgressMap = Record<string, number>;
type RecentItem = { moduleId: string; title: string; openedAt: string };

type LearningPlan = {
  goal: string;
  deadline: string;
  hoursPerWeek: number;
  priority: string;
};

const tabs: Tab[] = ["Home", "Practice", "Advanced", "Dashboard", "Feedback", "Interview Room", "API"];
const tabIcons: Record<Tab, string> = {
  Home: "⌂",
  Practice: "▣",
  Advanced: "▥",
  Dashboard: "▦",
  Feedback: "▱",
  "Interview Room": "▻",
  API: "⌘"
};

const newsFallbackImages = [
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1460317442991-0ec209397118?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1446776709462-d6b525c57bd3?q=80&w=1000&auto=format&fit=crop"
];

const fallbackNews: NewsItem[] = [
  { id: "f1", tag: "Markets", tone: "green", title: "Markets reprice growth and rates into the next policy cycle", summary: "Use the move to think through discount rates, valuation and sector sensitivity.", time: "2h ago", source: "Capital Forge", imageUrl: newsFallbackImages[0] },
  { id: "f2", tag: "AI & Tech", tone: "purple", title: "AI capex keeps reshaping technology valuation debates", summary: "Revenue growth, margin durability and terminal value remain the central questions.", time: "3h ago", source: "Capital Forge", imageUrl: newsFallbackImages[1] },
  { id: "f3", tag: "Strategy", tone: "blue", title: "Private equity remains selective as exit markets normalize", summary: "Sponsors are prioritizing cash conversion, leverage headroom and clean downside cases.", time: "4h ago", source: "Capital Forge", imageUrl: newsFallbackImages[2] },
  { id: "f4", tag: "Business", tone: "red", title: "Infrastructure and renewables deal activity stays active", summary: "Strategic and financial buyers continue to screen platforms with visible contracted cash flow.", time: "5h ago", source: "Capital Forge", imageUrl: newsFallbackImages[3] },
  { id: "f5", tag: "Global", tone: "blue", title: "Global markets await the next central-bank signal", summary: "Rates, currency moves and risk appetite remain key cross-asset drivers.", time: "6h ago", source: "Capital Forge", imageUrl: newsFallbackImages[4] }
];

const questions: Question[] = [
  { id: "p1", category: "Financial Modeling", difficulty: "Intermediate", minutes: 5, title: "What is the formula for FCFF and explain each component?", helper: "Write the formula, logic and when each component matters." },
  { id: "p2", category: "Investment Banking", difficulty: "Easy", minutes: 3, title: "Explain the difference between an LBO model and a DCF model.", helper: "Compare purpose, assumptions and common use cases." },
  { id: "p3", category: "Markets", difficulty: "Medium", minutes: 4, title: "Why do interest rates impact equity valuations?", helper: "Explain the transmission mechanism and sector impact." },
  { id: "p4", category: "Private Equity", difficulty: "Hard", minutes: 6, title: "Walk me through a typical PE deal lifecycle from sourcing to exit.", helper: "Cover diligence, financing, value creation and exit." }
];

const advancedModules: AdvancedModule[] = [
  { id: "afm", rank: 1, slug: "advanced-financial-modeling", name: "Advanced Financial Modeling", description: "Build complex models with real-world assumptions, sensitivity analysis, and scenario planning.", family: "Financial Modeling", tags: ["Modeling", "Valuation", "Excel"], icon: "▣", tone: "green", difficulty: "Advanced", lessons: 12, cases: 8, questions: 18 },
  { id: "ma", rank: 2, slug: "mergers-acquisitions", name: "Mergers & Acquisitions (M&A)", description: "Deep dive into deal structures, valuation, synergies, and integration processes.", family: "M&A", tags: ["M&A", "Valuation", "Private Markets"], icon: "▦", tone: "blue", difficulty: "Advanced", lessons: 10, cases: 6, questions: 15 },
  { id: "lbo", rank: 3, slug: "leveraged-buyouts", name: "Leveraged Buyouts (LBO)", description: "Master LBO modeling, debt structuring, returns analysis, and exit strategies.", family: "Financial Modeling", tags: ["Modeling", "Private Markets", "Valuation"], icon: "▥", tone: "purple", difficulty: "Advanced", lessons: 11, cases: 7, questions: 16 },
  { id: "er", rank: 4, slug: "equity-research-analysis", name: "Equity Research & Analysis", description: "Learn in-depth company analysis, industry research, and investment recommendations.", family: "Markets", tags: ["Capital Markets", "Valuation", "Research"], icon: "▥", tone: "amber", difficulty: "Expert", lessons: 9, cases: 5, questions: 14 },
  { id: "cm", rank: 5, slug: "capital-markets-ipos", name: "Capital Markets & IPOs", description: "Explore ECM, DCM, IPO processes, and market dynamics.", family: "Markets", tags: ["Capital Markets", "Markets"], icon: "◕", tone: "red", difficulty: "Advanced", lessons: 10, cases: 6, questions: 15 },
  { id: "dcf", rank: 6, slug: "advanced-dcf", name: "Advanced DCF & Intrinsic Valuation", description: "Build multi-stage DCFs, terminal value frameworks and probability-weighted valuation cases.", family: "Valuation", tags: ["Valuation", "Modeling"], icon: "ƒx", tone: "blue", difficulty: "Advanced", lessons: 10, cases: 6, questions: 18 },
  { id: "comps", rank: 7, slug: "trading-transaction-comps", name: "Trading & Transaction Comps", description: "Use public and precedent transaction benchmarks with rigorous normalization and judgment.", family: "Valuation", tags: ["Valuation", "M&A"], icon: "≋", tone: "green", difficulty: "Advanced", lessons: 8, cases: 6, questions: 15 },
  { id: "qoe", rank: 8, slug: "quality-of-earnings", name: "Quality of Earnings & Normalization", description: "Bridge reported earnings to sustainable EBITDA and identify recurring versus non-recurring items.", family: "Accounting", tags: ["Risk", "Private Markets", "Accounting"], icon: "✓", tone: "red", difficulty: "Expert", lessons: 9, cases: 8, questions: 16 },
  { id: "credit", rank: 9, slug: "private-credit-underwriting", name: "Private Credit Underwriting", description: "Underwrite leverage, coverage, covenants, collateral, downside protection and refinancing risk.", family: "Credit", tags: ["Risk", "Private Markets", "Credit"], icon: "◆", tone: "blue", difficulty: "Expert", lessons: 12, cases: 9, questions: 20 },
  { id: "rx", rank: 10, slug: "restructuring-distressed", name: "Restructuring & Distressed Investing", description: "Analyze liquidity, debt waterfalls, recovery values, restructuring paths and fulcrum securities.", family: "Credit", tags: ["Risk", "Private Markets", "Distressed"], icon: "⚠", tone: "red", difficulty: "Expert", lessons: 12, cases: 10, questions: 22 },
  { id: "vc", rank: 11, slug: "venture-growth-investing", name: "Venture & Growth Investing", description: "Evaluate market size, product moat, unit economics, cohorts, dilution and growth-stage returns.", family: "Private Markets", tags: ["Private Markets", "Valuation"], icon: "↗", tone: "green", difficulty: "Advanced", lessons: 10, cases: 7, questions: 18 },
  { id: "cap", rank: 12, slug: "cap-table-dilution", name: "Cap Tables, Dilution & Waterfalls", description: "Model ownership, option pools, preferred terms, liquidation preferences and exit waterfalls.", family: "Private Markets", tags: ["Private Markets", "Modeling"], icon: "%", tone: "purple", difficulty: "Advanced", lessons: 8, cases: 6, questions: 16 },
  { id: "deriv", rank: 13, slug: "derivatives-hedging", name: "Derivatives & Hedging", description: "Understand options, forwards, swaps, hedging logic and payoff structures used in capital markets.", family: "Markets", tags: ["Capital Markets", "Risk", "Markets"], icon: "∿", tone: "blue", difficulty: "Expert", lessons: 12, cases: 5, questions: 22 },
  { id: "risk", rank: 14, slug: "risk-scenario-analysis", name: "Risk, Scenarios & Stress Testing", description: "Design downside cases, scenario trees, sensitivities and decision thresholds for investment work.", family: "Risk", tags: ["Risk", "Modeling"], icon: "△", tone: "amber", difficulty: "Advanced", lessons: 9, cases: 7, questions: 18 },
  { id: "p2p", rank: 15, slug: "public-to-private", name: "Public-to-Private Transactions", description: "Evaluate take-private feasibility, premium, financing, shareholder dynamics and exit optionality.", family: "M&A", tags: ["M&A", "Private Markets", "Capital Markets"], icon: "↘", tone: "purple", difficulty: "Expert", lessons: 9, cases: 8, questions: 17 },
  { id: "s2s", rank: 16, slug: "sponsor-to-sponsor", name: "Sponsor-to-Sponsor Deals", description: "Analyze secondary buyouts, entry re-underwriting, value creation and exit risk between sponsors.", family: "Private Markets", tags: ["Private Markets", "M&A"], icon: "⇄", tone: "blue", difficulty: "Expert", lessons: 8, cases: 8, questions: 16 },
  { id: "buildup", rank: 17, slug: "buy-and-build", name: "Buy-and-Build Strategy", description: "Design platform-plus-bolt-on acquisition strategies, integration economics and multiple arbitrage.", family: "Private Markets", tags: ["M&A", "Private Markets", "Strategy"], icon: "+", tone: "green", difficulty: "Expert", lessons: 10, cases: 9, questions: 18 },
  { id: "ipo", rank: 18, slug: "ipo-ecm-execution", name: "IPO & ECM Execution", description: "Work through equity story, valuation, bookbuilding, dilution, pricing and investor positioning.", family: "Markets", tags: ["Capital Markets", "Markets"], icon: "▲", tone: "red", difficulty: "Advanced", lessons: 8, cases: 6, questions: 14 },
  { id: "dcm", rank: 19, slug: "dcm-leveraged-finance", name: "DCM & Leveraged Finance", description: "Understand debt instruments, pricing, covenants, ratings, syndication and acquisition financing.", family: "Credit", tags: ["Capital Markets", "Risk", "Credit"], icon: "≡", tone: "blue", difficulty: "Expert", lessons: 11, cases: 7, questions: 19 },
  { id: "portfolio", rank: 20, slug: "portfolio-hedge-fund", name: "Portfolio & Hedge Fund Analysis", description: "Analyze factor exposure, catalysts, risk budgets, long/short construction and portfolio attribution.", family: "Markets", tags: ["Markets", "Risk"], icon: "◎", tone: "purple", difficulty: "Expert", lessons: 10, cases: 6, questions: 18 },
  { id: "saas", rank: 21, slug: "saas-unit-economics", name: "SaaS & Unit Economics", description: "Evaluate ARR, retention, cohorts, CAC, LTV, burn multiple and growth-quality trade-offs.", family: "Private Markets", tags: ["Private Markets", "Valuation"], icon: "S", tone: "green", difficulty: "Advanced", lessons: 8, cases: 7, questions: 16 },
  { id: "infra", rank: 22, slug: "infra-project-finance", name: "Infrastructure & Project Finance", description: "Model project cash flows, DSCR, concession economics, contracted revenues and financing structures.", family: "Credit", tags: ["Private Markets", "Risk", "Modeling"], icon: "⌂", tone: "amber", difficulty: "Expert", lessons: 12, cases: 8, questions: 20 },
  { id: "realassets", rank: 23, slug: "real-assets-valuation", name: "Real Assets Valuation", description: "Value real estate, infrastructure and asset-heavy businesses using sector-specific cash-flow drivers.", family: "Valuation", tags: ["Valuation", "Private Markets"], icon: "▤", tone: "blue", difficulty: "Advanced", lessons: 9, cases: 7, questions: 16 },
  { id: "ic", rank: 24, slug: "investment-committee-judgment", name: "Investment Committee Judgment", description: "Translate analysis into recommendation, downside framing, key debates and decision-ready IC communication.", family: "Interview Prep", tags: ["Private Markets", "Risk", "Interview"], icon: "IC", tone: "red", difficulty: "Expert", lessons: 8, cases: 10, questions: 18 },
  { id: "md", rank: 25, slug: "md-partner-interviews", name: "MD / Partner Interview Mastery", description: "Practice senior judgment, ambiguity, pressure questions, investment defense and concise executive communication.", family: "Interview Prep", tags: ["Interview", "Private Markets", "Risk"], icon: "★", tone: "purple", difficulty: "Expert", lessons: 8, cases: 12, questions: 24 }
];

const defaultProgress: ProgressMap = {
  afm: 68, ma: 42, lbo: 35, er: 28, cm: 50,
  dcf: 20, comps: 0, qoe: 0, credit: 12, rx: 0,
  vc: 0, cap: 0, deriv: 0, risk: 22, p2p: 0,
  s2s: 0, buildup: 0, ipo: 0, dcm: 16, portfolio: 0,
  saas: 0, infra: 0, realassets: 0, ic: 0, md: 0
};

const advancedFilters = ["All Topics", "Modeling", "Valuation", "M&A", "Capital Markets", "Risk", "Private Markets"];

function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }
function moduleStatus(progress: number): ModuleStatus { return progress >= 100 ? "COMPLETED" : progress > 0 ? "IN_PROGRESS" : "NOT_STARTED"; }
function statusCta(progress: number) { return progress >= 100 ? "Review" : progress > 0 ? "Continue" : "Start"; }
function fiveNews(items: NewsItem[]) {
  const out = items.slice(0, 5).map((item, index) => ({ ...item, imageUrl: item.imageUrl || newsFallbackImages[index] }));
  for (let i = out.length; i < 5; i += 1) out.push({ ...fallbackNews[i], id: `fallback-${i}` });
  return out.slice(0, 5);
}

export default function CapitalForge() {
  const [tab, setTab] = useState<Tab>("Advanced");
  const [news, setNews] = useState<NewsItem[]>(fallbackNews);
  const [health, setHealth] = useState<Health | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState("");
  const [apiResult, setApiResult] = useState<unknown>({ status: "ready" });
  const [practiceSearch, setPracticeSearch] = useState("");
  const [practiceCategory, setPracticeCategory] = useState("All");

  const [advancedFilter, setAdvancedFilter] = useState("All Topics");
  const [advancedSearch, setAdvancedSearch] = useState("");
  const [advancedSort, setAdvancedSort] = useState("Default Curriculum");
  const [progress, setProgress] = useState<ProgressMap>(defaultProgress);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentItem[]>([
    { moduleId: "lbo", title: "LBO Modeling: Returns Analysis", openedAt: "2 hours ago" },
    { moduleId: "dcf", title: "DCF Advanced Assumptions", openedAt: "5 hours ago" },
    { moduleId: "ma", title: "M&A Deal Structuring", openedAt: "1 day ago" }
  ]);
  const [plan, setPlan] = useState<LearningPlan>({ goal: "PE Interview Preparation", deadline: "6 weeks", hoursPerWeek: 8, priority: "LBO, M&A, Modeling" });
  const [editingPlan, setEditingPlan] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem("capital-forge-advanced-progress-v1");
      const savedRecent = localStorage.getItem("capital-forge-advanced-recent-v1");
      const savedPlan = localStorage.getItem("capital-forge-learning-plan-v1");
      if (savedProgress) setProgress({ ...defaultProgress, ...JSON.parse(savedProgress) });
      if (savedRecent) setRecent(JSON.parse(savedRecent));
      if (savedPlan) setPlan(JSON.parse(savedPlan));
    } catch {}
    void refreshAll();
  }, []);

  useEffect(() => { try { localStorage.setItem("capital-forge-advanced-progress-v1", JSON.stringify(progress)); } catch {} }, [progress]);
  useEffect(() => { try { localStorage.setItem("capital-forge-advanced-recent-v1", JSON.stringify(recent)); } catch {} }, [recent]);
  useEffect(() => { try { localStorage.setItem("capital-forge-learning-plan-v1", JSON.stringify(plan)); } catch {} }, [plan]);

  async function getJson(url: string, init?: RequestInit): Promise<any> {
    const response = await fetch(url, { ...init, cache: "no-store" });
    return response.json();
  }

  async function refreshAll() {
    await Promise.allSettled([refreshHealth(), refreshNews(), refreshQuote("AAPL")]);
  }

  async function refreshHealth() {
    try {
      const data = await getJson("/api/health");
      setHealth(data);
      setApiResult(data);
      return data;
    } catch { return null; }
  }

  async function refreshNews() {
    setBusy("news");
    try {
      const data = await getJson("/api/news?limit=5");
      setNews(fiveNews(Array.isArray(data.news) ? data.news : fallbackNews));
      setApiResult(data);
    } catch {
      setNews(fallbackNews);
    } finally {
      setBusy("");
    }
  }

  async function refreshQuote(symbol: string) {
    try {
      const data = await getJson(`/api/market?symbol=${encodeURIComponent(symbol)}`);
      setQuote(data.quote || null);
      setApiResult(data);
    } catch {}
  }

  async function askAdvancedAI() {
    setBusy("ai");
    try {
      const module = advancedModules.find((item) => item.id === activeModuleId) || advancedModules[0];
      const data = await getJson("/api/lab", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ module: `Advanced Tutor - ${module.name}`, input: "Challenge me with one institutional-level question, then give only a hint before any full solution." })
      });
      setApiResult(data);
      setMessage(data.output || data.feedback || "AI tutor responded. Open API tab to inspect the full payload.");
    } catch {
      setMessage("AI tutor could not respond. Check the AI provider in the API tab.");
    } finally {
      setBusy("");
    }
  }

  const visibleNews = useMemo(() => fiveNews(news), [news]);

  const filteredAdvanced = useMemo(() => {
    let items = [...advancedModules];
    if (advancedFilter !== "All Topics") {
      items = items.filter((module) => module.tags.includes(advancedFilter) || module.family === advancedFilter);
    }
    const needle = advancedSearch.trim().toLowerCase();
    if (needle) {
      items = items.filter((module) => `${module.name} ${module.description} ${module.family} ${module.tags.join(" ")}`.toLowerCase().includes(needle));
    }
    if (advancedSort === "Progress") items.sort((a, b) => (progress[b.id] || 0) - (progress[a.id] || 0));
    if (advancedSort === "Lowest Mastery") items.sort((a, b) => (progress[a.id] || 0) - (progress[b.id] || 0));
    if (advancedSort === "Difficulty") items.sort((a, b) => (a.difficulty === b.difficulty ? a.rank - b.rank : a.difficulty === "Expert" ? -1 : 1));
    return items;
  }, [advancedFilter, advancedSearch, advancedSort, progress]);

  const counts = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;
    advancedModules.forEach((module) => {
      const state = moduleStatus(progress[module.id] || 0);
      if (state === "COMPLETED") completed += 1;
      else if (state === "IN_PROGRESS") inProgress += 1;
      else notStarted += 1;
    });
    return { completed, inProgress, notStarted };
  }, [progress]);

  const advancedPct = Math.round((counts.completed / advancedModules.length) * 100) || 36;

  function openModule(module: AdvancedModule) {
    setActiveModuleId(module.id);
    setRecent((items) => [{ moduleId: module.id, title: `${module.name}: Learning Path`, openedAt: "Just now" }, ...items.filter((item) => item.moduleId !== module.id)].slice(0, 6));
    setMessage("");
  }

  function continueLearning() {
    const last = recent[0]?.moduleId;
    const candidate = advancedModules.find((module) => module.id === last)
      || advancedModules.find((module) => (progress[module.id] || 0) > 0 && (progress[module.id] || 0) < 100)
      || advancedModules[0];
    openModule(candidate);
  }

  function markResourceComplete(module: AdvancedModule) {
    setProgress((current) => ({ ...current, [module.id]: clamp((current[module.id] || 0) + 8) }));
    setMessage(`Progress saved for ${module.name}. Practice, Dashboard and Interview Room can consume this mastery signal next.`);
  }

  function downloadNotes() {
    const module = advancedModules.find((item) => item.id === activeModuleId) || advancedModules[0];
    const text = `${module.name}\n\n${module.description}\n\nKey path:\n- Concepts\n- Technical Notes\n- Worked Examples\n- Real Cases\n- Practice\n- Assessment\n- Interview Drill\n`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${module.slug}-notes.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function Header() {
    return (
      <header className="global-header">
        <div className="brand">
          <div className="logo-mark">CF</div>
          <div><b>Capital Forge</b><span>Master Finance. Build Your Future.</span></div>
        </div>
        <div className="search-box"><span>⌕</span><input placeholder="Search topics, concepts, or questions..." /><kbd>⌘ K</kbd></div>
        <button className="assistant-btn" onClick={askAdvancedAI}>✦ AI Assistant</button>
        <button className="icon-btn">🔔<em /></button>
        <div className="profile"><span>DC</span><div><b>Deepak</b><small>Pro Plan</small></div><strong>⌄</strong></div>
      </header>
    );
  }

  function Sidebar() {
    return (
      <aside className="sidebar">
        <nav className="side-nav">
          {tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}><span>{tabIcons[item]}</span>{item}</button>)}
        </nav>
        <div className="upgrade-card"><h3>👑 Upgrade to Pro</h3><p>Get full access to advanced cases, AI feedback and more.</p><button>Upgrade Now →</button></div>
        <div className="side-footer"><b>Capital Forge v1.2.0</b><span>Built for your best tomorrow</span></div>
      </aside>
    );
  }

  function Home() {
    return (
      <div className="home-simple">
        <section className="home-hero"><div><p className="eyebrow">AI-powered finance learning</p><h1>Welcome back, <span>Deepak!</span> 👋</h1><p>Practice smarter across IB, PE, VC, private credit, valuation, markets and interviews.</p></div><div className="home-ai">AI</div></section>
        <section className="home-news"><div className="section-title"><div><h2>🔴 Live News & Updates</h2><p>Curated market and finance headlines.</p></div><button onClick={refreshNews}>{busy === "news" ? "Refreshing..." : "Refresh"}</button></div><div className="home-news-row">{visibleNews.map((item, index) => <article key={item.id}><div className="home-news-image" style={{ backgroundImage: `url(${item.imageUrl || newsFallbackImages[index]})` }} /><span>{item.tag}</span><h3>{item.title}</h3><p>{item.summary}</p></article>)}</div></section>
      </div>
    );
  }

  function Practice() {
    const filtered = questions.filter((question) => {
      const categoryOk = practiceCategory === "All" || question.category.includes(practiceCategory);
      const searchOk = !practiceSearch.trim() || `${question.title} ${question.helper} ${question.category}`.toLowerCase().includes(practiceSearch.toLowerCase());
      return categoryOk && searchOk;
    });
    return (
      <div className="practice-layout-ref">
        <section className="practice-primary">
          <div className="page-breadcrumb"><span>Practice</span><b>›</b><em>Questions</em></div>
          <div className="practice-heading"><div><h1>Practice</h1><p>Sharpen your skills with 2,000+ curated questions across finance, markets, and interviews.</p></div><div className="cap-strip"><Metric icon="📘" value="2,000+" label="Questions" /><Metric icon="▦" value="50+" label="Categories" /><Metric icon="↗" value="AI-Powered" label="Personalization" /></div></div>
          <div className="practice-banner-ref"><div><h2>Consistent Practice Creates<br /><span>Extraordinary Results</span></h2><p>Practice. Learn. Improve. Repeat.</p></div><blockquote>“The expert in anything<br />was once a beginner.”</blockquote></div>
          <div className="practice-category-row">{["All", "IB", "PE", "VC", "Financial Modeling", "Markets", "Accounting"].map((item) => <button key={item} className={practiceCategory === item ? "selected" : ""} onClick={() => setPracticeCategory(item)}>{item}</button>)}</div>
          <div className="practice-filter-row"><button>Difficulty⌄</button><button>Question Type⌄</button><button>Time⌄</button><button>Sub Topic⌄</button><div><span>⌕</span><input value={practiceSearch} onChange={(e) => setPracticeSearch(e.target.value)} placeholder="Search questions..." /></div><button>Reset Filters</button></div>
          <div className="practice-content-grid"><aside>{["All Questions", "Recently Practiced", "Bookmarked", "Weak Areas", "Custom Practice"].map((item, index) => <button key={item} className={index === 0 ? "selected" : ""}><span>{index === 0 ? "▦" : index === 1 ? "◷" : index === 2 ? "♡" : index === 3 ? "◎" : "▤"}</span><b>{item}</b><small>{index === 0 ? "2,000+" : index === 1 ? "24" : index === 2 ? "56" : index === 3 ? "18" : "0"}</small></button>)}</aside><section>{filtered.map((q) => <article key={q.id}><div><div className="question-tags"><span>{q.category}</span><em>{q.difficulty}</em><small>◷ {q.minutes} min</small></div><h3>{q.title}</h3><p>{q.helper}</p></div><button onClick={() => setMessage(`Practice session started: ${q.title}`)}>Start Practice →</button></article>)}</section></div>
        </section>
        <aside className="practice-right"><RailCard title="Your Practice Stats"><div className="practice-donut"><b>68%</b><span>Questions Solved</span></div><p>Correct 142 · Incorrect 67 · Skipped 23</p></RailCard><RailCard title="Practice Streak"><h2>🔥 5 days</h2><p>Keep going! 5 days in a row.</p></RailCard><RailCard title="Weak Areas"><p>Financial Modeling 14%</p><p>M&A 52%</p><p>Accounting 60%</p><p>Valuation 62%</p></RailCard><RailCard title="Quick Practice"><div className="quick-inline"><button>10 Questions</button><button>20 Questions</button><button>Mixed</button><button>Previous</button></div></RailCard></aside>
      </div>
    );
  }

  function Advanced() {
    return (
      <div className="advanced-layout">
        <section className="advanced-primary">
          <div className="advanced-topline">
            <div>
              <div className="page-breadcrumb"><span>Advanced</span><b>›</b><em>Modules</em></div>
              <h1>Advanced</h1>
              <p>Master the 25 advanced topics with in-depth concepts, real-world applications, and expert-level practice.</p>
            </div>
            <div className="advanced-capabilities"><Metric icon="◎" value="25" label="Advanced Topics" /><Metric icon="↪" value="250+" label="In-depth Resources" /><Metric icon="♟" value="Expert" label="Level Content" /></div>
          </div>

          <section className="advanced-hero">
            <div className="advanced-hero-copy"><h2>Go Deeper. Think Like a Pro.</h2><p>Explore advanced concepts, real-world case studies, and interview-level challenges designed to set you apart.</p><button onClick={continueLearning}>Continue Learning →</button></div>
            <div className="advanced-city" />
            <blockquote>“The details<br />differentiate<br />the good from<br />the great.”<i /></blockquote>
          </section>

          <div className="advanced-filter-row">
            {advancedFilters.map((filter) => <button key={filter} className={advancedFilter === filter ? "selected" : ""} onClick={() => setAdvancedFilter(filter)}>{filter}</button>)}
            <button onClick={() => setMessage("More categories: Accounting, Credit, Private Credit, Restructuring, Distressed, Derivatives, Portfolio/HF, Interview, Deal Judgment, Excel/Technical")}>More⌄</button>
          </div>

          <section className="advanced-master">
            <div className="advanced-master-head">
              <div><h2>25 Advanced Topics</h2><p>Structured learning paths with video lessons, notes, cases and practice questions.</p></div>
              <div className="advanced-controls"><div><span>⌕</span><input value={advancedSearch} onChange={(e) => setAdvancedSearch(e.target.value)} placeholder="Search advanced topics..." /></div><select value={advancedSort} onChange={(e) => setAdvancedSort(e.target.value)}><option>Default Curriculum</option><option>Progress</option><option>Lowest Mastery</option><option>Difficulty</option></select></div>
            </div>
            <div className="advanced-module-list">
              {filteredAdvanced.map((module) => <AdvancedModuleRow key={module.id} module={module} value={progress[module.id] || 0} />)}
            </div>
          </section>
        </section>

        <aside className="advanced-rail">
          <section className="advanced-rail-card advanced-progress-card">
            <div className="rail-head"><h3>Your Advanced Progress</h3><button onClick={() => setTab("Dashboard")}>View Details →</button></div>
            <div className="advanced-progress-body"><div className="advanced-donut" style={{ background: `conic-gradient(#0875fa ${advancedPct * 3.6}deg, #e8edf4 0deg)` }}><div><b>{advancedPct}%</b><span>Completed</span></div></div><div className="advanced-legend"><LegendDot color="blue" label="Completed" value={`${counts.completed}/25`} /><LegendDot color="pale" label="In Progress" value={`${counts.inProgress}/25`} /><LegendDot color="gray" label="Not Started" value={`${counts.notStarted}/25`} /></div></div>
          </section>

          <section className="advanced-rail-card learning-plan-card">
            <div className="rail-head"><h3>Learning Plan</h3><button onClick={() => setEditingPlan(true)}>Edit Plan →</button></div>
            <div className="plan-summary"><span>▣</span><div><b>3 topics this week</b><p>Stay on track with your goals.</p></div></div>
            <div className="plan-items"><button onClick={() => openModule(advancedModules[0])}><i className="done">✓</i>Advanced Financial Modeling<b>›</b></button><button onClick={() => openModule(advancedModules[1])}><i className="active">●</i>M&A Case Studies<b>›</b></button><button onClick={() => openModule(advancedModules[4])}><i>○</i>Capital Markets Deep Dive<b>›</b></button></div>
          </section>

          <section className="advanced-rail-card recent-card">
            <div className="rail-head"><h3>Recently Viewed</h3><button>View All →</button></div>
            <div className="recent-list">{recent.slice(0, 3).map((item, index) => <button key={`${item.moduleId}-${index}`} onClick={() => { const module = advancedModules.find((m) => m.id === item.moduleId); if (module) openModule(module); }}><span className={`recent-icon r${index + 1}`}>{index === 0 ? "▥" : index === 1 ? "▣" : "▦"}</span><div><b>{item.title}</b><small>{item.openedAt}</small></div><strong>›</strong></button>)}</div>
          </section>

          <section className="advanced-rail-card advanced-quick-card">
            <h3>Quick Actions</h3>
            <div><button onClick={continueLearning}><span>▶</span><small>Continue<br />Learning</small></button><button onClick={() => setTab("Practice")}><span>▤</span><small>Take Quiz</small></button><button onClick={() => { setAdvancedFilter("M&A"); setMessage("Real Cases filtered to transaction and investment case modules."); }}><span>▣</span><small>Real Cases</small></button><button onClick={downloadNotes}><span>▥</span><small>Download<br />Notes</small></button></div>
          </section>
        </aside>
      </div>
    );
  }

  function AdvancedModuleRow({ module, value }: { module: AdvancedModule; value: number }) {
    return (
      <article className="advanced-module-row">
        <span className="module-rank">{module.rank}</span>
        <div className={`module-icon ${module.tone}`}>{module.icon}</div>
        <div className="module-content"><h3>{module.name}</h3><p>{module.description}</p><div className="module-meta"><span>▤ {module.lessons} lessons</span><span>▱ {module.cases} cases</span><span>▣ {module.questions} questions</span></div></div>
        <span className={`difficulty-badge ${module.difficulty === "Expert" ? "expert" : "advanced"}`}>{module.difficulty}</span>
        <div className="module-action"><div className="module-progress"><i><b style={{ width: `${value}%` }} /></i><span>{value}%</span></div><button onClick={() => openModule(module)}>{statusCta(value)} →</button></div>
      </article>
    );
  }

  function Dashboard() {
    return <div className="simple-workspace"><h1>Dashboard</h1><p>Advanced completion, mastery, time spent, case scores and Practice results will feed this workspace from the same user-progress model.</p><div className="simple-grid"><RailCard title="Advanced Completion"><h2>{advancedPct}%</h2><p>{counts.completed} completed · {counts.inProgress} in progress · {counts.notStarted} not started</p></RailCard><RailCard title="Live Market"><h2>{quote?.symbol || "AAPL"} {quote?.price ?? "—"}</h2><p>{quote?.currency || "USD"} · {quote?.percentChange ?? "—"}%</p></RailCard><RailCard title="API Health"><h2>{health?.status || "checking"}</h2><p>{health?.phase || "Capital Forge"}</p></RailCard></div></div>;
  }

  function SimplePage({ title }: { title: string }) {
    return <div className="simple-workspace"><h1>{title}</h1><p>This workspace remains connected to the same Capital Forge learning graph.</p><div className="simple-grid"><RailCard title="Connected Layer"><p>Practice → Advanced → Feedback → Dashboard → Interview Room</p></RailCard><RailCard title="API Output"><pre>{JSON.stringify(apiResult, null, 2)}</pre></RailCard></div></div>;
  }

  function Metric({ icon, value, label }: { icon: string; value: string; label: string }) {
    return <div className="metric"><span>{icon}</span><div><b>{value}</b><small>{label}</small></div></div>;
  }

  function RailCard({ title, children }: { title: string; children: ReactNode }) {
    return <section className="rail-card-generic"><h3>{title}</h3>{children}</section>;
  }

  function LegendDot({ color, label, value }: { color: string; label: string; value: string }) {
    return <div><span className={color} /><p>{label}</p><b>{value}</b></div>;
  }

  const activeModule = advancedModules.find((module) => module.id === activeModuleId) || null;

  return (
    <div className="app-frame">
      <Header />
      <Sidebar />
      <main className="workspace">
        {tab === "Home" && <Home />}
        {tab === "Practice" && <Practice />}
        {tab === "Advanced" && <Advanced />}
        {tab === "Dashboard" && <Dashboard />}
        {tab === "Feedback" && <SimplePage title="Feedback" />}
        {tab === "Interview Room" && <SimplePage title="Interview Room" />}
        {tab === "API" && <SimplePage title="API Vault" />}
      </main>

      {message && <div className="toast-message"><button onClick={() => setMessage("")}>×</button>{message}</div>}

      {activeModule && (
        <div className="modal-backdrop" onMouseDown={() => setActiveModuleId(null)}>
          <section className="module-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><div><span>Advanced Module</span><h2>{activeModule.name}</h2><p>{activeModule.description}</p></div><button onClick={() => setActiveModuleId(null)}>×</button></div>
            <div className="module-path"><button>Overview</button><button>Concept Lessons</button><button>Technical Notes</button><button>Worked Examples</button><button>Real Deals / Cases</button><button>Practice</button><button>Assessment</button><button>Interview Drill</button><button>Mastery Review</button></div>
            <div className="modal-progress"><div><span>Completion</span><b>{progress[activeModule.id] || 0}%</b></div><i><b style={{ width: `${progress[activeModule.id] || 0}%` }} /></i></div>
            <div className="modal-actions"><button onClick={() => markResourceComplete(activeModule)}>Mark Next Resource Complete</button><button className="secondary" onClick={() => { setTab("Practice"); setPracticeCategory(activeModule.family === "M&A" ? "PE" : activeModule.family); setActiveModuleId(null); }}>Practice this Topic</button><button className="secondary" onClick={askAdvancedAI}>{busy === "ai" ? "Asking..." : "Ask AI"}</button></div>
          </section>
        </div>
      )}

      {editingPlan && (
        <div className="modal-backdrop" onMouseDown={() => setEditingPlan(false)}>
          <section className="plan-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><div><span>Weekly Learning Plan</span><h2>Edit Advanced Plan</h2></div><button onClick={() => setEditingPlan(false)}>×</button></div>
            <label>Goal<input value={plan.goal} onChange={(e) => setPlan({ ...plan, goal: e.target.value })} /></label>
            <label>Deadline<input value={plan.deadline} onChange={(e) => setPlan({ ...plan, deadline: e.target.value })} /></label>
            <label>Hours / week<input type="number" value={plan.hoursPerWeek} onChange={(e) => setPlan({ ...plan, hoursPerWeek: Number(e.target.value) })} /></label>
            <label>Priority topics<input value={plan.priority} onChange={(e) => setPlan({ ...plan, priority: e.target.value })} /></label>
            <button className="save-plan" onClick={() => { setEditingPlan(false); setMessage("Learning plan updated. Completed historical work was preserved."); }}>Save Plan</button>
          </section>
        </div>
      )}
    </div>
  );
}
