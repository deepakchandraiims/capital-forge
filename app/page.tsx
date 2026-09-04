"use client";

import { useState } from "react";

type Tab = "Home" | "Practice" | "Advanced" | "Dashboard" | "Feedback" | "Interview Room" | "API";

type Question = {
  id: string;
  category: string;
  difficulty: string;
  time: string;
  title: string;
  helper: string;
  answer: string;
};

const tabs: Tab[] = ["Home", "Practice", "Advanced", "Dashboard", "Feedback", "Interview Room", "API"];
const icons: Record<Tab, string> = { Home: "⌂", Practice: "▣", Advanced: "▧", Dashboard: "▦", Feedback: "▱", "Interview Room": "▻", API: "⌘" };

const news = [
  { id: "n1", tag: "Markets", tone: "green", time: "2h ago", title: "Equities rally on cooling inflation; tech leads gains", summary: "S&P 500 rises as investors weigh rates and earnings.", source: "Marketaux", image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=800&auto=format&fit=crop" },
  { id: "n2", tag: "AI & Tech", tone: "purple", time: "3h ago", title: "AI capex cycle creates a new valuation debate", summary: "Turn this into a DCF and terminal multiple drill.", source: "Marketaux", image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop" },
  { id: "n3", tag: "Strategy", tone: "blue", time: "4h ago", title: "PE firms stay selective as exits remain muted", summary: "Deal teams focus on margins, cash conversion and debt capacity.", source: "Marketaux", image: "https://images.unsplash.com/photo-1460317442991-0ec209397118?q=80&w=800&auto=format&fit=crop" },
  { id: "n4", tag: "Business", tone: "red", time: "5h ago", title: "Renewables M&A accelerates across infra funds", summary: "Sponsors continue screening scale platforms.", source: "Marketaux", image: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=800&auto=format&fit=crop" },
  { id: "n5", tag: "Global", tone: "blue", time: "6h ago", title: "Global markets mixed before central-bank decisions", summary: "Investors watch rates, growth and risk appetite.", source: "Marketaux", image: "https://images.unsplash.com/photo-1446776709462-d6b525c57bd3?q=80&w=800&auto=format&fit=crop" }
];

const categories = [
  ["All", "2,000+", "▦", "blue"],
  ["IB", "320", "▥", "blue"],
  ["PE", "280", "P", "red"],
  ["VC", "260", "♆", "green"],
  ["Financial Modeling", "350", "▣", "green"],
  ["Markets", "220", "▥", "purple"],
  ["Accounting", "180", "▤", "amber"]
];

const questions: Question[] = [
  { id: "q1", category: "Financial Modeling", difficulty: "Intermediate", time: "5 min", title: "What is the formula for FCFF and explain each component?", helper: "Write the formula and explain the logic behind each component and when it is used.", answer: "FCFF = EBIT(1-T) + D&A - Capex - ΔNWC. Explain operating cash flow available to all capital providers." },
  { id: "q2", category: "Investment Banking", difficulty: "Easy", time: "3 min", title: "Explain the difference between an LBO model and a DCF model.", helper: "Compare the purpose, key assumptions and typical use cases.", answer: "DCF estimates intrinsic value from free cash flows discounted by WACC. LBO tests sponsor returns using debt, cash generation, exit value and IRR/MOIC." },
  { id: "q3", category: "Markets", difficulty: "Medium", time: "4 min", title: "Why do interest rates impact equity valuations?", helper: "Explain the transmission mechanism and its effect on different sectors.", answer: "Higher rates increase discount rates and debt costs, reduce PV of future cash flows and pressure multiples, especially long-duration growth assets." },
  { id: "q4", category: "Private Equity", difficulty: "Hard", time: "6 min", title: "Walk me through a typical PE deal lifecycle from sourcing to exit.", helper: "Cover key stages, stakeholders, due diligence, value creation and exit options.", answer: "Sourcing, screening, NDA, CIM, IOI, diligence, QoE, financing, IC, SPA, close, 100-day plan, value creation, monitoring and exit." }
];

export default function CapitalForge() {
  const [tab, setTab] = useState<Tab>("Practice");
  const [category, setCategory] = useState("All");
  const [mode, setMode] = useState("All Questions");
  const [session, setSession] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [showGrade, setShowGrade] = useState(false);

  const filtered = questions.filter((question) => {
    if (category === "All") return true;
    if (category === "IB") return question.category === "Investment Banking";
    if (category === "PE") return question.category === "Private Equity";
    return question.category === category;
  });

  function Header() {
    return (
      <header className="global-header">
        <div className="brand"><div className="logo-mark">CF</div><div><b>Capital Forge</b><span>Master Finance. Build Your Edge.</span></div></div>
        <div className="search-box"><span>⌕</span><input placeholder="Search questions, topics, companies, or keywords..." /><kbd>⌘ K</kbd></div>
        <button className="assistant-btn" onClick={() => setTab("Advanced")}>✦ AI Assistant</button>
        <button className="icon-btn">🔔<em /></button>
        <div className="profile"><span>DC</span><div><b>Deepak</b><small>Pro Plan</small></div><strong>⌄</strong></div>
      </header>
    );
  }

  function Sidebar() {
    return (
      <aside className="sidebar">
        <nav className="side-nav">
          {tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}><span>{icons[item]}</span>{item}</button>)}
        </nav>
        <div className="upgrade-card"><h3>👑 Upgrade to Pro</h3><p>Unlock advanced cases, AI feedback and more.</p><button>Upgrade Now →</button></div>
        <div className="side-footer"><b>Capital Forge v1.1.0</b><span>Built for your best tomorrow</span></div>
      </aside>
    );
  }

  function Practice() {
    return (
      <div className="practice-layout">
        <section className="practice-main">
          <div className="practice-top">
            <div><div className="crumb"><span>Practice</span><b>›</b><em>Questions</em></div><h1>Practice</h1><p>Sharpen your skills with 2,000+ curated questions across finance, markets, and interviews.</p></div>
            <div className="practice-stats-strip"><Metric icon="📘" title="2,000+" sub="Questions" /><Metric icon="▧" title="50+" sub="Categories" /><Metric icon="↗" title="AI-Powered" sub="Personalization" /></div>
          </div>

          <div className="practice-banner"><div><h2>Consistent Practice Creates<br /><span>Extraordinary Results</span></h2><p>Practice. Learn. Improve. Repeat.</p></div><blockquote>“The expert in anything<br />was once a beginner.”<i /></blockquote></div>

          <div className="category-strip">
            {categories.map(([name, count, icon, tone]) => <button key={name} className={category === name ? "selected" : ""} onClick={() => setCategory(name)}><span className={`cat-icon ${tone}`}>{icon}</span><b>{name}</b><small>{count}</small></button>)}
            <button className="cat-next">›</button>
          </div>

          <div className="filter-row">
            <select><option>Difficulty</option><option>Easy</option><option>Medium</option><option>Hard</option></select>
            <select><option>Question Type</option><option>Formula</option><option>Calculation</option><option>Case</option></select>
            <select><option>Time</option><option>&lt; 5 min</option><option>5+ min</option></select>
            <select><option>Sub Topic</option><option>FCFF</option><option>LBO</option><option>DCF</option></select>
            <div className="practice-search"><span>⌕</span><input placeholder="Search questions..." /></div>
            <button className="ghost" onClick={() => setCategory("All")}>Reset Filters</button>
            <button className="view-toggle">☷</button>
          </div>

          <div className="practice-body">
            <aside className="practice-subnav">
              {[["All Questions", "2,000+"], ["Recently Practiced", "24"], ["Bookmarked", "56"], ["Weak Areas", "18"], ["Custom Practice", "0"]].map(([name, count]) => <button key={name} className={mode === name ? "selected" : ""} onClick={() => setMode(name)}><span>{name === "All Questions" ? "▦" : name === "Recently Practiced" ? "◷" : name === "Bookmarked" ? "♡" : name === "Weak Areas" ? "◎" : "▤"}</span><b>{name}</b><small>{count}</small></button>)}
            </aside>
            <section className="question-feed">
              {filtered.slice(0, 4).map((question) => <QuestionCard key={question.id} question={question} />)}
            </section>
          </div>

          {session && <section className="session-panel"><div className="section-head"><div><h2>Active Practice Session</h2><p>{session.title}</p></div><button className="ghost" onClick={() => setSession(null)}>Close</button></div><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Write your answer with formula, logic, assumptions and interview-style conclusion." /><div className="actions"><button onClick={() => setShowGrade(true)}>Submit Answer</button><button className="ghost" onClick={() => setShowGrade(true)}>Show Model Answer</button></div>{showGrade && <div className="grade-card good"><b>Overall score: 82/100</b><p>{session.answer}</p><div className="rubric-grid"><span>Technical accuracy</span><b>88</b><span>Completeness</span><b>78</b><span>Structure</span><b>82</b><span>Interview effectiveness</span><b>80</b></div></div>}</section>}
        </section>

        <aside className="practice-rail"><PracticeStats /><PracticeStreak /><WeakAreas /><QuickPractice /></aside>
      </div>
    );
  }

  function QuestionCard({ question }: { question: Question }) {
    const tone = question.category === "Markets" ? "red" : question.category === "Private Equity" ? "purple" : question.category === "Investment Banking" ? "blue" : "green";
    const level = question.difficulty === "Hard" ? "red" : question.difficulty === "Easy" ? "green" : "blue";
    return <article className="practice-question-card"><div><div className="q-tags"><span className={`pill ${tone}`}>{question.category}</span><span className={`pill ${level}`}>{question.difficulty}</span><small>◷ {question.time}</small></div><h3>{question.title}</h3><p>{question.helper}</p></div><div className="q-actions"><button className="bookmark">♡</button><button onClick={() => { setSession(question); setAnswer(""); setShowGrade(false); }}>Start Practice →</button></div></article>;
  }

  function PracticeStats() { return <section className="practice-rail-card stats-card"><div className="rail-head"><h3>Your Practice Stats</h3><button onClick={() => setTab("Dashboard")}>View Dashboard →</button></div><div className="stats-content"><div className="big-donut" style={{ background: "conic-gradient(#0875fa 244deg, #e8edf4 0deg)" }}><div><b>68%</b><span>Questions<br />Solved</span></div></div><div className="stats-list"><RowDot label="Correct" value="142" tone="green" /><RowDot label="Incorrect" value="67" tone="red" /><RowDot label="Skipped" value="23" tone="gray" /><hr /><RowDot label="Total" value="232" tone="black" /></div></div></section>; }
  function PracticeStreak() { return <section className="practice-rail-card practice-streak"><div><h3>🔥 Practice Streak</h3><p>Keep going! 5 days in a row.</p></div><b>5 days</b><div className="days">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => <span key={day} className={index < 5 ? "done" : ""}><i>{index < 5 ? "✓" : ""}</i>{day}</span>)}</div></section>; }
  function WeakAreas() { return <section className="practice-rail-card weak-card"><div className="rail-head"><div><h3>🎯 Weak Areas</h3><p>Focus on these topics</p></div><button onClick={() => setMode("Weak Areas")}>View All →</button></div>{[["Financial Modeling", 14, "red"], ["M&A", 52, "red"], ["Accounting", 60, "amber"], ["Valuation", 62, "amber"]].map(([name, score, tone]) => <button key={String(name)}><span>{name}</span><i><b className={String(tone)} style={{ width: `${score}%` }} /></i><strong>{score}%</strong></button>)}</section>; }
  function QuickPractice() { return <section className="practice-rail-card quick-practice"><div className="rail-head"><div><h3>⚡ Quick Practice</h3><p>Start with a quick session</p></div><button>⚙ Custom</button></div><div>{[["10", "Questions", "blue"], ["20", "Questions", "green"], ["Mixed", "Difficulty", "red"], ["Previous", "Mistakes", "purple"]].map(([a, b, tone]) => <button key={a} className={tone} onClick={() => setSession(questions[0])}><span>{a}</span><small>{b}</small></button>)}</div></section>; }

  function Home() { return <div className="home-layout"><section className="main-column"><div className="hero-panel"><div><p className="eyebrow">AI-powered finance learning</p><h1>Welcome back, <span>Deepak!</span> 👋</h1><p>Practice smarter across IB, PE, VC, private credit, valuation, markets and interviews.</p><div className="hero-stats"><MiniStat label="AI Accuracy" value="68%" tone="green" /><MiniStat label="Questions Solved" value="232" tone="blue" /><MiniStat label="XP" value="1240" tone="red" /></div></div><div className="hero-art"><div className="orbit one" /><div className="orbit two" /><div className="ai-block">AI</div><div className="hero-chip left">DCF</div><div className="hero-chip right">LBO</div></div></div><section className="news-section"><div className="section-head"><div><h2><span className="red-dot" />Live News & Updates</h2><p>Curated insights from markets, AI, and global finance.</p></div><div className="head-actions"><small>Last updated: just now</small><button>Refresh</button></div></div><div className="news-row">{news.map((item) => <NewsCard key={item.id} item={item} />)}</div></section></section><aside className="right-rail"><HomeProgress /><HomeStreak /><HomeInsight /><HomeReco /><HomeQuick /></aside></div>; }
  function NewsCard({ item }: { item: (typeof news)[number] }) { return <article className="news-card"><div className="news-visual" style={{ backgroundImage: `url(${item.image})` }} /><div className="news-meta"><span className={`pill ${item.tone}`}>{item.tag}</span><small>{item.time}</small></div><h3>{item.title}</h3><p>{item.summary}</p><div className="news-footer"><small>{item.source}</small><a href="#">Read →</a></div></article>; }
  function MiniStat({ label, value, tone }: { label: string; value: string; tone: string }) { return <div className={`mini-stat ${tone}`}><span>{label}</span><b>{value}</b></div>; }
  function Metric({ icon, title, sub }: { icon: string; title: string; sub: string }) { return <div><span>{icon}</span><b>{title}</b><small>{sub}</small></div>; }
  function RowDot({ label, value, tone }: { label: string; value: string; tone: string }) { return <div className="row-dot"><span className={tone} /><p>{label}</p><b>{value}</b></div>; }
  function Row({ label, value, tone }: { label: string; value: string; tone: string }) { return <div className="meter-row"><span>{label}</span><i><b className={tone} style={{ width: value }} /></i><strong>{value}</strong></div>; }
  function HomeProgress() { return <section className="rail-card progress-card"><div className="rail-title"><h3>Your Progress</h3><button onClick={() => setTab("Dashboard")}>View Dashboard →</button></div><div className="progress-body"><div className="donut" style={{ background: "conic-gradient(#0875fa 260deg, #e8edf4 0deg)" }}><span><b>72%</b><small>Overall</small></span></div><div><Row label="Practice" value="84%" tone="green" /><Row label="Advanced" value="64%" tone="blue" /><Row label="Interview" value="68%" tone="purple" /></div></div></section>; }
  function HomeStreak() { return <section className="rail-card streak-card"><div><h3>🔥 7 Day Streak</h3><p>Keep it up!</p></div><b>7<small>Days</small></b><div className="week">{["✓", "✓", "✓", "✓", "F", "S", "S"].map((day, index) => <span key={index} className={index < 4 ? "done" : index === 4 ? "today" : ""}>{day}</span>)}</div></section>; }
  function HomeInsight() { return <section className="rail-card insight-card"><h3>AI Insights <span>New</span></h3><p>You perform best in Valuation and Modeling. Focus on Market Analysis to balance your skillset.</p><button onClick={() => setTab("Dashboard")}>View Insights →</button><div className="orb">AI</div></section>; }
  function HomeReco() { return <section className="rail-card rec-card"><h3>Recommended For You</h3>{["Complete 5 more Advanced questions", "Try a Hard case this weekend", "Book a mock interview"].map((item, index) => <button key={item} onClick={() => setTab(index === 2 ? "Interview Room" : "Practice")}><span>{index === 0 ? "🎯" : index === 1 ? "🧠" : "👤"}</span><div>{item}<small>+{(index + 1) * 100} XP</small></div><b>›</b></button>)}</section>; }
  function HomeQuick() { return <section className="rail-card quick-card"><h3>Quick Actions</h3><div><button onClick={() => setTab("Practice")}>▶<span>Start Practice</span></button><button onClick={() => setTab("Advanced")}>▥<span>Advanced</span></button><button onClick={() => setTab("Interview Room")}>▣<span>Interview</span></button><button onClick={() => setTab("API")}>⚙<span>API Vault</span></button></div></section>; }

  function SimplePage({ title }: { title: string }) { return <section className="section-card work-card"><h1>{title}</h1><p>{title === "API" ? "Dedicated API vault. Production keys remain in Vercel environment variables." : "This section remains connected while the Practice workstation is refined."}</p><div className="actions"><input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} /><button>{quote?.price ? `${symbol}: ${quote.price}` : `Quote ${symbol}`}</button><button>{busy || "Ready"}</button></div><pre>{JSON.stringify({ health, quote, apiResult }, null, 2)}</pre></section>; }

  return <div className="app-frame"><Header /><Sidebar /><main className="workspace">{tab === "Home" && <Home />}{tab === "Practice" && <Practice />}{tab === "Advanced" && <SimplePage title="Advanced" />}{tab === "Dashboard" && <SimplePage title="Dashboard" />}{tab === "Feedback" && <SimplePage title="Feedback" />}{tab === "Interview Room" && <SimplePage title="Interview Room" />}{tab === "API" && <SimplePage title="API" />}</main></div>;
}
