"use client";

import { useEffect, useMemo, useState } from "react";

type Tab = "Home" | "Practice" | "Advanced" | "Dashboard" | "Feedback" | "Interview Room" | "API";
type Difficulty = "Easy" | "Medium" | "Hard" | "MD";
type QuestionType = "MCQ" | "Formula" | "Numerical" | "Subjective" | "Case" | "Interview" | "Model Review";
type NewsItem = { tag: string; title: string; summary: string; time: string; tone: "blue" | "red" | "green" | "black" };
type ShortCase = { category: string; title: string; summary: string; difficulty: Difficulty; minutes: number };
type Question = { id: string; category: string; type: QuestionType; difficulty: Difficulty; prompt: string; options?: string[]; answer: string; explanation: string; keywords?: string[] };
type Module = { name: string; bucket: string; description: string; required: string; demo: boolean };
type Attempt = { id: string; title: string; score: number; at: string; category: string };
type HealthResponse = { app?: string; phase?: string; status?: string; safeMode?: boolean; modules?: number; keyStatus?: Record<string, boolean>; message?: string };

const tabs: Tab[] = ["Home", "Practice", "Advanced", "Dashboard", "Feedback", "Interview Room", "API"];
const storeKey = "capital-forge-phase-a-open-ui";

const newsBank: NewsItem[] = [
  { tag: "Markets", title: "Equities rally as rate-cut expectations return", summary: "Practice angle: connect discount rates, terminal multiples and equity duration in a 5-line market view.", time: "2h ago", tone: "green" },
  { tag: "AI & Tech", title: "AI infrastructure spend forces new capex debates", summary: "Modeling angle: separate growth capex, maintenance capex and long-term ROIC compression risk.", time: "3h ago", tone: "blue" },
  { tag: "Private Equity", title: "Dry powder stays high but deployment remains selective", summary: "PE angle: underwrite entry valuation, leverage capacity and value creation without relying on multiple expansion.", time: "4h ago", tone: "black" },
  { tag: "M&A", title: "Strategic buyers keep using bolt-ons for growth", summary: "Deal angle: test synergy credibility, integration risk and whether the buyer is paying for its own execution.", time: "5h ago", tone: "red" },
  { tag: "Credit", title: "Private credit structures tighten around downside cases", summary: "Credit angle: focus on covenants, DSCR, recovery, sponsor support and documentation protection.", time: "6h ago", tone: "black" },
  { tag: "Macro", title: "Currency volatility changes cross-border deal math", summary: "Markets angle: translate FX movement into purchase price, debt capacity and exit return sensitivity.", time: "7h ago", tone: "blue" },
  { tag: "VC", title: "Growth investors demand clearer unit economics", summary: "VC angle: build a rule-of-40, CAC payback and dilution bridge before debating valuation.", time: "8h ago", tone: "green" },
  { tag: "Restructuring", title: "Maturity walls keep refinancing risk in focus", summary: "Special sits angle: locate the fulcrum security and build a recovery waterfall from enterprise value.", time: "9h ago", tone: "red" }
];

const caseBank: ShortCase[] = [
  { category: "Financial Modeling", title: "Build a 3-statement model check", summary: "Find the missing link between revenue growth, working capital, debt schedule and cash balance.", difficulty: "Medium", minutes: 45 },
  { category: "Valuation", title: "DCF terminal value stress test", summary: "Estimate intrinsic value and explain which assumption drives the largest valuation swing.", difficulty: "Medium", minutes: 40 },
  { category: "M&A", title: "Accretion / dilution quick case", summary: "Evaluate a buy-side acquisition using P/E, financing mix, synergies and integration risk.", difficulty: "Hard", minutes: 60 },
  { category: "Private Equity", title: "Paper LBO return bridge", summary: "Underwrite entry multiple, leverage, EBITDA growth, debt paydown and exit multiple sensitivity.", difficulty: "Hard", minutes: 50 },
  { category: "Private Credit", title: "Covenant and downside DSCR case", summary: "Structure a credit memo with base case, stress case, collateral and recovery logic.", difficulty: "Hard", minutes: 45 },
  { category: "VC", title: "Series B dilution and preference case", summary: "Model founder dilution, ESOP refresh, liquidation preference and exit outcomes.", difficulty: "Medium", minutes: 35 },
  { category: "Markets", title: "Rates up, multiples down", summary: "Translate a 75 bps rate move into valuation, cost of capital and portfolio implications.", difficulty: "Medium", minutes: 30 },
  { category: "Interview", title: "MD pressure answer drill", summary: "Answer a technical finance question with conclusion, formula, intuition and caveat.", difficulty: "MD", minutes: 20 }
];

const modules: Module[] = [
  { name: "Recruiter Mode", bucket: "Career", description: "Score projects like a PE/IB recruiter and identify proof gaps.", required: "AI_API_KEY", demo: true },
  { name: "MD Pressure Room", bucket: "Interview", description: "Senior-style follow-up questions with sharp interruptions.", required: "AI_API_KEY", demo: true },
  { name: "Deal Teardown Library", bucket: "Deals", description: "Convert deals into thesis, valuation, risks and return drivers.", required: "NEWS + AI", demo: true },
  { name: "Excel Muscle Memory", bucket: "Modeling", description: "Timed shortcut drills for analyst speed and accuracy.", required: "No key", demo: false },
  { name: "Model Error Hunter", bucket: "Modeling", description: "Find formula breaks, sign errors and assumption weaknesses.", required: "AI_API_KEY", demo: true },
  { name: "IC Memo Builder", bucket: "PE", description: "Turn rough investment thinking into IC-ready memo sections.", required: "AI_API_KEY", demo: true },
  { name: "Would You Invest Game", bucket: "Judgment", description: "Invest, pass or reprice based on incomplete business facts.", required: "AI_API_KEY", demo: true },
  { name: "Live News Question Engine", bucket: "Markets", description: "Turn current market news into valuation and credit drills.", required: "NEWS_API_KEY", demo: true },
  { name: "Personal Weakness Graph", bucket: "Analytics", description: "Map wrong answers into topic-level improvement areas.", required: "Supabase", demo: false },
  { name: "Interview Bank by Firm", bucket: "Recruiting", description: "Firm-style technical questions for IB, PE, VC and credit.", required: "AI_API_KEY", demo: true },
  { name: "Deal Math Speed Trainer", bucket: "Mental Math", description: "EV, EBITDA, leverage, CAGR, IRR and MOIC sprints.", required: "No key", demo: false },
  { name: "Investment Journal AI", bucket: "Thinking", description: "Rate daily market and deal thinking like an investor.", required: "AI_API_KEY", demo: true },
  { name: "Pitchbook Simulator", bucket: "IB", description: "Create teaser, CIM, valuation and buyer-list sections.", required: "AI_API_KEY", demo: true },
  { name: "LBO Paper Test", bucket: "PE", description: "30-minute paper LBO with return bridge and sensitivities.", required: "No key", demo: false },
  { name: "Private Credit Underwriting", bucket: "Credit", description: "Build DSCR, recovery, downside and term-sheet logic.", required: "AI_API_KEY", demo: true },
  { name: "Founder Call Simulator", bucket: "Diligence", description: "Ask diligence questions and detect hidden red flags.", required: "AI_API_KEY", demo: true },
  { name: "Red Flag Detector", bucket: "Diligence", description: "Scan financial facts for accounting and governance risk.", required: "FILINGS + AI", demo: true },
  { name: "Cap Table Simulator", bucket: "VC", description: "Model rounds, ESOP, preference and founder dilution.", required: "No key", demo: false },
  { name: "Career Path Engine", bucket: "Career", description: "Roadmap your profile toward IB, PE, VC or private credit.", required: "AI_API_KEY", demo: true },
  { name: "Portfolio Project Tracker", bucket: "Career", description: "Track models, memos, reports and recruiter proof points.", required: "Supabase", demo: false },
  { name: "Real Filing Reader", bucket: "Research", description: "Turn filings into questions and diligence checklists.", required: "FILINGS + AI", demo: true },
  { name: "AI Mentor Personas", bucket: "Mentors", description: "Choose IB Associate, PE VP, Credit IC, VC Partner or CFO.", required: "AI_API_KEY", demo: true },
  { name: "Bad Answer Rewriter", bucket: "Communication", description: "Upgrade weak interview answers into structured responses.", required: "AI_API_KEY", demo: true },
  { name: "Case Competition Mode", bucket: "Projects", description: "Simulated 48-hour deal case with memo, model and deck tasks.", required: "AI + Supabase", demo: true },
  { name: "Daily Killer Insight", bucket: "Learning", description: "One sharp finance concept, deal lesson or modeling trick.", required: "AI / News", demo: true }
];

const concepts = ["Accounting", "Corporate Finance", "Valuation", "Financial Modeling", "Excel", "Investment Banking", "M&A", "Private Equity", "VC", "Private Credit", "Markets", "Distressed", "Interviews", "Investment Judgment"];
const difficulties: Difficulty[] = ["Easy", "Medium", "Hard", "MD"];

function buildQuestions(): Question[] {
  return Array.from({ length: 220 }, (_, i) => {
    const category = concepts[i % concepts.length];
    const difficulty = difficulties[i % difficulties.length];
    const type: QuestionType = (["MCQ", "Formula", "Numerical", "Subjective", "Case", "Interview", "Model Review"] as QuestionType[])[i % 7];
    const revenue = 80 + (i * 17) % 420;
    const margin = 10 + (i % 18);
    const ebitda = Math.round(revenue * margin / 100);
    const debt = 40 + (i * 11) % 260;
    const cash = 8 + (i * 7) % 70;
    if (type === "MCQ") {
      return { id: `CF-${i + 1}`, category, type, difficulty, prompt: "Which formula best represents FCFF starting from EBIT?", options: ["EBIT x (1 - Tax) + D&A - Capex - Change in NWC", "Net Income + Dividends", "EBITDA - Interest", "Revenue - COGS"], answer: "EBIT x (1 - Tax) + D&A - Capex - Change in NWC", explanation: "FCFF is unlevered cash flow available to debt and equity holders before financing decisions.", keywords: ["ebit", "tax", "capex", "nwc"] };
    }
    if (type === "Numerical") {
      return { id: `CF-${i + 1}`, category, type, difficulty, prompt: `A company has debt of Rs ${debt} Cr and cash of Rs ${cash} Cr. Calculate net debt.`, answer: String(debt - cash), explanation: `Net debt = Debt - Cash = ${debt} - ${cash} = ${debt - cash} Cr.`, keywords: [String(debt - cash)] };
    }
    if (type === "Formula") {
      return { id: `CF-${i + 1}`, category, type, difficulty, prompt: "Write the enterprise value bridge formula.", answer: "Equity value + debt + preferred equity + minority interest - cash", explanation: "Enterprise value converts equity value into operating business value independent of capital structure.", keywords: ["equity", "debt", "cash", "minority"] };
    }
    if (type === "Model Review") {
      return { id: `CF-${i + 1}`, category, type, difficulty, prompt: `An analyst values a Rs ${ebitda} Cr EBITDA business but ignores maintenance capex and working capital. What is wrong?`, answer: "EBITDA is not free cash flow", explanation: "A strong model separates EBITDA from cash generation by including taxes, capex, working capital and financing constraints.", keywords: ["cash", "capex", "working", "tax"] };
    }
    if (type === "Interview") {
      return { id: `CF-${i + 1}`, category, type, difficulty, prompt: `Explain in 60 seconds why a company with Rs ${ebitda} Cr EBITDA can still be a weak LBO candidate.`, answer: "Weak cash conversion, high capex, cyclicality, expensive entry valuation or limited exit options can break returns", explanation: "Senior interview answers should lead with conclusion, then drivers, risks and what would change the decision.", keywords: ["cash", "capex", "valuation", "exit"] };
    }
    if (type === "Case") {
      return { id: `CF-${i + 1}`, category, type, difficulty, prompt: `Revenue is Rs ${revenue} Cr, EBITDA margin is ${margin}%, leverage is rising and growth is slowing. Would you invest, pass or reprice?`, answer: "conditional reprice", explanation: "The best answer is conditional: underwrite growth durability, cash conversion, leverage, downside protection and entry valuation.", keywords: ["valuation", "cash", "downside", "leverage"] };
    }
    return { id: `CF-${i + 1}`, category, type, difficulty, prompt: `Define ${category} in one professional sentence and give one use in IB/PE decision-making.`, answer: `${category} should be linked to valuation, risk, capital allocation or deal decision-making.`, explanation: "Definitions matter only when connected to an investment or transaction decision.", keywords: ["valuation", "risk", "deal", "decision"] };
  });
}

function rotated<T>(items: T[], count: number, offset: number) {
  return Array.from({ length: Math.min(count, items.length) }, (_, i) => items[(i + offset) % items.length]);
}

function evaluateAnswer(q: Question, submitted: string, selected: string) {
  const raw = q.type === "MCQ" ? selected : submitted;
  const answer = raw.trim().toLowerCase();
  if (!answer) return { score: 0, correct: false, text: "Write an answer first. In interviews, silence scores zero." };
  if (q.type === "MCQ") {
    const correct = selected === q.answer;
    return { score: correct ? 10 : 0, correct, text: correct ? "Correct. Now explain the intuition behind the formula." : `Not correct. Correct answer: ${q.answer}` };
  }
  if (q.type === "Numerical") {
    const target = Number(q.answer);
    const given = Number(answer.replace(/[^0-9.-]/g, ""));
    const correct = Number.isFinite(given) && Math.abs(given - target) <= 0.1;
    return { score: correct ? 10 : 4, correct, text: correct ? "Correct calculation." : `Expected approximately Rs ${target} Cr. ${q.explanation}` };
  }
  const hits = (q.keywords || []).filter((keyword) => answer.includes(keyword.toLowerCase())).length;
  const score = Math.min(10, Math.max(3, hits * 2 + (answer.length > 140 ? 2 : 0)));
  return { score, correct: score >= 7, text: score >= 7 ? "Good direction. Tighten it with conclusion, calculation, risk and decision impact." : `Partially developed. Stronger answer: ${q.explanation}` };
}

export default function Page() {
  const questions = useMemo(buildQuestions, []);
  const [tab, setTab] = useState<Tab>("Home");
  const [query, setQuery] = useState("");
  const [newsOffset, setNewsOffset] = useState(0);
  const [caseOffset, setCaseOffset] = useState(0);
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [selected, setSelected] = useState("");
  const [confidence, setConfidence] = useState(60);
  const [result, setResult] = useState<{ score: number; correct: boolean; text: string } | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [activeModule, setActiveModule] = useState<Module>(modules[0]);
  const [moduleInput, setModuleInput] = useState("Review my answer like a PE associate: EBITDA is high so the deal is good.");
  const [moduleOutput, setModuleOutput] = useState("Launch a module to see the output workspace here.");
  const [labLoading, setLabLoading] = useState(false);
  const [interviewMode, setInterviewMode] = useState("Private Equity");
  const [interviewQuestion, setInterviewQuestion] = useState("Walk me through how you would evaluate a founder-led L&D acquisition target.");
  const [interviewAnswer, setInterviewAnswer] = useState("");
  const [interviewScore, setInterviewScore] = useState("Start the mock and submit an answer to get feedback.");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [apiPrompt, setApiPrompt] = useState("Give me one hard private equity interview question on LBO downside cases.");
  const [apiOutput, setApiOutput] = useState("API output will appear here after you test a connected or demo provider.");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const saved = JSON.parse(raw) as { attempts?: Attempt[]; bookmarks?: string[]; notes?: string[] };
        setAttempts(saved.attempts || []);
        setBookmarks(saved.bookmarks || []);
        setNotes(saved.notes || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(storeKey, JSON.stringify({ attempts, bookmarks, notes })); } catch {}
  }, [attempts, bookmarks, notes]);

  async function refreshHealth() {
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      const data = await response.json() as HealthResponse;
      setHealth(data);
    } catch {
      setHealth({ status: "unavailable", keyStatus: {} });
    }
  }

  useEffect(() => { void refreshHealth(); }, []);

  const visibleNews = useMemo(() => rotated(newsBank, 5, newsOffset), [newsOffset]);
  const visibleCases = useMemo(() => rotated(caseBank, 4, caseOffset), [caseOffset]);
  const categories = ["All", ...Array.from(new Set(questions.map((q) => q.category)))];
  const filteredQuestions = questions.filter((q) => (category === "All" || q.category === category) && (difficulty === "All" || q.difficulty === difficulty) && (`${q.category} ${q.type} ${q.prompt}`.toLowerCase().includes(query.toLowerCase()) || !query));
  const currentQuestion = filteredQuestions[qIndex % Math.max(filteredQuestions.length, 1)] || questions[0];
  const accuracy = attempts.length ? Math.round((attempts.filter((a) => a.score >= 7).length / attempts.length) * 100) : 84;
  const xp = attempts.reduce((sum, item) => sum + item.score * 10, 1240);
  const connectedCount = Object.values(health?.keyStatus || {}).filter(Boolean).length;

  function submitPractice() {
    const grade = evaluateAnswer(currentQuestion, answer, selected);
    setResult(grade);
    setAttempts((prev) => [{ id: currentQuestion.id, title: currentQuestion.prompt.slice(0, 70), score: grade.score, at: new Date().toLocaleString(), category: currentQuestion.category }, ...prev].slice(0, 30));
  }

  function nextQuestion() {
    setQIndex((prev) => prev + 1);
    setAnswer("");
    setSelected("");
    setResult(null);
  }

  function solveCase(item: ShortCase) {
    setCategory(concepts.includes(item.category) ? item.category : "All");
    setDifficulty(item.difficulty === "MD" ? "MD" : item.difficulty);
    setTab("Practice");
    setResult(null);
  }

  async function launchModule(item: Module) {
    setActiveModule(item);
    setLabLoading(true);
    setModuleOutput("Generating workspace output...");
    try {
      const response = await fetch("/api/lab", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ module: item.name, input: moduleInput }) });
      const data = await response.json() as { output?: string; configured?: boolean; nextStep?: string };
      setModuleOutput(`${data.configured ? "Connected output" : "Demo/fallback output"}\n\n${data.output || "No output returned."}\n\nNext: ${data.nextStep || "Use this output inside practice or feedback."}`);
    } catch {
      setModuleOutput(`Demo output for ${item.name}: Start with conclusion, quantify the driver, pressure-test downside and end with a decision. This button is working even without an external AI key.`);
    } finally {
      setLabLoading(false);
    }
  }

  function startInterview() {
    const prompts: Record<string, string> = {
      "Private Equity": "Should a sponsor buy a founder-led services company at 13x EBITDA? Walk me through your framework.",
      "Investment Banking": "How would you pitch a sell-side process for a Rs 150 Cr enterprise value business?",
      "Venture Capital": "How do you assess whether a fast-growing company deserves a premium valuation?",
      "Private Credit": "How much debt would you underwrite for a cyclical business with weak cash conversion?",
      "MD Pressure": "Your model shows 25% IRR. Why should I not trust it?"
    };
    setInterviewQuestion(prompts[interviewMode] || prompts["Private Equity"]);
    setInterviewScore("Question started. Answer like this: conclusion -> framework -> numbers -> risks -> recommendation.");
  }

  function scoreInterview() {
    const text = interviewAnswer.toLowerCase();
    const keywords = ["valuation", "cash", "risk", "downside", "growth", "leverage", "exit"].filter((word) => text.includes(word)).length;
    const score = Math.min(10, Math.max(4, keywords + (interviewAnswer.length > 180 ? 3 : 1)));
    setInterviewScore(`Score: ${score}/10. ${score >= 7 ? "Strong structure. Add sharper numbers and one killer caveat." : "Needs more banker/PE structure. Add valuation, cash conversion, downside and what changes your view."}`);
  }

  async function testApi() {
    setApiOutput("Testing API/lab route...");
    try {
      const response = await fetch("/api/lab", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ module: "API Test Workspace", input: apiPrompt }) });
      const data = await response.json() as { output?: string; configured?: boolean; nextStep?: string };
      setApiOutput(`${data.configured ? "Connected" : "Safe demo"}\n\n${data.output || "No response body."}\n\n${data.nextStep || "Add API keys in Vercel to unlock real provider output."}`);
    } catch {
      setApiOutput("The route could not be reached from the browser. Check deployment and /api/lab.");
    }
  }

  function addNote() {
    if (!feedbackNote.trim()) return;
    setNotes((prev) => [feedbackNote.trim(), ...prev].slice(0, 20));
    setFeedbackNote("");
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brandMark"><div className="logo">CF</div><div><strong>Capital Forge</strong><span>Finance training OS</span></div></div>
        <nav className="navList">
          {tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}
        </nav>
        <div className="upgradeCard"><strong>Phase A Active</strong><p>Open app, no auth gate. White SaaS UI with working tabs and demo fallbacks.</p><button onClick={() => setTab("API")}>Check APIs</button></div>
      </aside>

      <section className="mainArea">
        <header className="topbar">
          <div className="searchBox"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search topics, cases, models, interviews..." /></div>
          <div className="profileCluster"><button onClick={() => setTab("Advanced")}>✦ AI Workspace</button><button onClick={() => setTab("Dashboard")}>🏆</button><div className="avatar">DC</div><div><strong>Deepak</strong><span>Keep forging</span></div></div>
        </header>

        {tab === "Home" && <section className="pageGrid">
          <div className="heroCard span8"><div><p className="eyebrow">AI-powered learning. Real-world edge.</p><h1>Welcome back, Deepak! 👋</h1><p>Practice smarter across PE, IB, VC, private credit, modeling and capital markets. Every button here is wired to a useful action or fallback.</p><div className="miniStats"><div><span>Accuracy</span><strong>{accuracy}%</strong></div><div><span>Questions Solved</span><strong>{attempts.length || 1248}</strong></div><div><span>XP</span><strong>{xp}</strong></div></div></div><div className="aiCube"><span>AI</span><small>Decision engine</small></div></div>
          <div className="panel span4 progressPanel"><div className="ring">{accuracy}%</div><h3>Your Progress</h3><p>Practice readiness is strong. Push more market analysis and MD-style judgment cases.</p><button onClick={() => setTab("Dashboard")}>View Dashboard →</button></div>

          <div className="panel span8"><div className="sectionHead"><div><h2><span className="redDot" /> Live News & Updates</h2><p>Demo-curated until a news API is connected. Refresh rotates new finance angles.</p></div><button onClick={() => setNewsOffset((prev) => prev + 1)}>Refresh</button></div><div className="newsGrid">{visibleNews.map((item) => <article key={item.title} className="newsCard"><div className={`thumb ${item.tone}`}>{item.tag.slice(0, 2)}</div><div className="cardMeta"><span className={`tag ${item.tone}`}>{item.tag}</span><small>{item.time}</small></div><h3>{item.title}</h3><p>{item.summary}</p><button onClick={() => setSelectedNews(item)}>Read More</button></article>)}</div>{selectedNews && <div className="inlineInsight"><strong>{selectedNews.title}</strong><p>{selectedNews.summary}</p><button onClick={() => setSelectedNews(null)}>Close</button></div>}</div>
          <div className="panel span4"><h2>AI Insights <span className="newBadge">New</span></h2><p>You perform best in valuation and modeling. Add more market judgment and private credit cases to balance readiness.</p><button onClick={() => setTab("Feedback")}>View Insights →</button><div className="recommend"><strong>Recommended</strong><button onClick={() => setTab("Practice")}>Complete 5 hard questions</button><button onClick={() => setTab("Interview Room")}>Book mock interview</button><button onClick={() => setTab("Advanced")}>Try Model Error Hunter</button></div></div>

          <div className="panel span8"><div className="sectionHead"><div><h2>Featured Short Cases</h2><p>Real-world scenario cards that change on refresh.</p></div><button onClick={() => setCaseOffset((prev) => prev + 1)}>Refresh Cases</button></div><div className="caseGrid">{visibleCases.map((item, index) => <article key={item.title} className="caseCard"><div><span>Case {index + 1}</span><b>{item.category}</b></div><h3>{item.title}</h3><p>{item.summary}</p><small>{item.difficulty} • ~{item.minutes} min</small><button onClick={() => solveCase(item)}>Solve Now →</button></article>)}</div></div>
          <div className="panel span4"><h2>Quick Actions</h2><div className="quickActions"><button onClick={() => setTab("Practice")}>▶ Start Practice</button><button onClick={() => setTab("Advanced")}>▥ Advanced</button><button onClick={() => setTab("Interview Room")}>🎥 Interview</button><button onClick={() => setTab("Feedback")}>✍ Save Note</button></div></div>
        </section>}

        {tab === "Practice" && <section className="pageGrid"><div className="panel span4"><h2>Practice Filters</h2><label>Category<select value={category} onChange={(event) => { setCategory(event.target.value); setQIndex(0); }}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Difficulty<select value={difficulty} onChange={(event) => { setDifficulty(event.target.value); setQIndex(0); }}><option>All</option>{difficulties.map((item) => <option key={item}>{item}</option>)}</select></label><div className="metricStack"><div><span>Available</span><strong>{filteredQuestions.length}</strong></div><div><span>Bookmarked</span><strong>{bookmarks.length}</strong></div><div><span>Confidence</span><strong>{confidence}%</strong></div></div></div><div className="panel span8 questionPanel"><div className="cardMeta"><span className="tag blue">{currentQuestion.category}</span><span className="tag black">{currentQuestion.type}</span><span className="tag red">{currentQuestion.difficulty}</span></div><h2>{currentQuestion.prompt}</h2>{currentQuestion.options && <div className="optionList">{currentQuestion.options.map((option) => <button key={option} className={selected === option ? "selected" : ""} onClick={() => setSelected(option)}>{option}</button>)}</div>}<textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Write your answer like an analyst: conclusion → formula/driver → risk → decision impact" /><label>Confidence<input type="range" min="0" max="100" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} /></label><div className="buttonRow"><button onClick={submitPractice}>Submit Answer</button><button onClick={() => setResult({ score: 0, correct: false, text: currentQuestion.explanation })}>Show Hint / Explanation</button><button onClick={() => setBookmarks((prev) => prev.includes(currentQuestion.id) ? prev.filter((id) => id !== currentQuestion.id) : [currentQuestion.id, ...prev])}>{bookmarks.includes(currentQuestion.id) ? "Bookmarked" : "Bookmark"}</button><button onClick={nextQuestion}>Next Question</button></div>{result && <div className="resultBox"><strong>{result.correct ? "Strong" : "Review"} • {result.score}/10</strong><p>{result.text}</p><p>{currentQuestion.explanation}</p></div>}</div></section>}

        {tab === "Advanced" && <section className="pageGrid"><div className="panel span12"><div className="sectionHead"><div><h2>Advanced AI Modules</h2><p>25 premium workspaces. Connected APIs unlock live output; otherwise demo fallback still works.</p></div><button onClick={() => void launchModule(activeModule)} disabled={labLoading}>{labLoading ? "Working..." : "Regenerate Output"}</button></div><textarea value={moduleInput} onChange={(event) => setModuleInput(event.target.value)} placeholder="Paste a deal thought, interview answer, model concern or memo paragraph..." /></div><div className="moduleGrid span8">{modules.map((item) => <article key={item.name} className={activeModule.name === item.name ? "moduleCard selectedModule" : "moduleCard"}><div className="cardMeta"><span className="tag blue">{item.bucket}</span><span className={item.demo ? "tag red" : "tag green"}>{item.required}</span></div><h3>{item.name}</h3><p>{item.description}</p><button onClick={() => void launchModule(item)}>Launch</button></article>)}</div><div className="panel span4 stickyPanel"><h2>{activeModule.name}</h2><pre>{moduleOutput}</pre></div></section>}

        {tab === "Dashboard" && <section className="pageGrid"><div className="panel span3 stat"><span>Total XP</span><strong>{xp}</strong></div><div className="panel span3 stat"><span>Accuracy</span><strong>{accuracy}%</strong></div><div className="panel span3 stat"><span>Attempts</span><strong>{attempts.length}</strong></div><div className="panel span3 stat"><span>API Connected</span><strong>{connectedCount}</strong></div><div className="panel span8"><h2>Skill Readiness</h2>{concepts.slice(0, 9).map((item, index) => <div className="bar" key={item}><div><span>{item}</span><b>{Math.max(48, Math.min(96, accuracy - index * 3 + 8))}%</b></div><i><em style={{ width: `${Math.max(48, Math.min(96, accuracy - index * 3 + 8))}%` }} /></i></div>)}</div><div className="panel span4"><h2>Recent Attempts</h2>{attempts.length === 0 ? <p>No attempts yet. Start practice to build analytics.</p> : attempts.slice(0, 8).map((item) => <div className="attempt" key={`${item.id}-${item.at}`}><strong>{item.category}</strong><span>{item.score}/10 • {item.at}</span></div>)}</div></section>}

        {tab === "Feedback" && <section className="pageGrid"><div className="panel span7"><h2>Feedback & Mistake Journal</h2><textarea value={feedbackNote} onChange={(event) => setFeedbackNote(event.target.value)} placeholder="Write what you got wrong, what you learned, or paste AI feedback..." /><button onClick={addNote}>Save Note</button><div className="notesList">{notes.length === 0 ? <p>No notes yet.</p> : notes.map((item, index) => <article key={`${item}-${index}`}><span>Note {index + 1}</span><p>{item}</p></article>)}</div></div><div className="panel span5"><h2>Improvement Plan</h2><p>1. Redo bookmarked concepts.</p><p>2. Convert every wrong answer into one formula, one intuition and one interview line.</p><p>3. Push more hard and MD-level cases every week.</p><button onClick={() => setTab("Practice")}>Retry Questions</button></div></section>}

        {tab === "Interview Room" && <section className="pageGrid"><div className="panel span4"><h2>Mock Setup</h2><label>Interview Type<select value={interviewMode} onChange={(event) => setInterviewMode(event.target.value)}>{["Private Equity", "Investment Banking", "Venture Capital", "Private Credit", "MD Pressure"].map((item) => <option key={item}>{item}</option>)}</select></label><button onClick={startInterview}>Start Mock</button><p className="muted">This room is open now. AI key later upgrades it into real adaptive follow-ups.</p></div><div className="panel span8"><h2>{interviewQuestion}</h2><textarea value={interviewAnswer} onChange={(event) => setInterviewAnswer(event.target.value)} placeholder="Answer in spoken interview style..." /><div className="buttonRow"><button onClick={scoreInterview}>Submit Interview Answer</button><button onClick={() => setInterviewAnswer("Conclusion: I would evaluate it through market quality, revenue durability, EBITDA quality, cash conversion, leverage capacity, valuation, exit route and downside protection.")}>Use Sample Structure</button></div><div className="resultBox"><strong>Feedback</strong><p>{interviewScore}</p></div></div></section>}

        {tab === "API" && <section className="pageGrid"><div className="panel span12"><div className="sectionHead"><div><h2>API Control Room</h2><p>Dedicated place for integrations. The main app stays clean.</p></div><button onClick={() => void refreshHealth()}>Refresh API Status</button></div></div>{["supabaseConfigured", "aiConfigured", "marketConfigured", "newsConfigured", "filingsConfigured", "recruiterReviewConfigured", "adminSecretConfigured"].map((key) => <article key={key} className="panel span3 apiCard"><span>{key.replace("Configured", "")}</span><strong className={health?.keyStatus?.[key] ? "connected" : "notConnected"}>{health?.keyStatus?.[key] ? "Connected" : "Not Connected"}</strong><p>{key === "supabaseConfigured" ? "Cloud persistence and user state database." : "Add the relevant Vercel environment variables to activate this space."}</p></article>)}<div className="panel span7"><h2>Output Test Area</h2><textarea value={apiPrompt} onChange={(event) => setApiPrompt(event.target.value)} /><button onClick={() => void testApi()}>Test Output</button><pre>{apiOutput}</pre></div><div className="panel span5"><h2>Raw Health</h2><pre>{JSON.stringify(health, null, 2)}</pre></div></section>}
      </section>
    </main>
  );
}
