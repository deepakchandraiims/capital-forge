"use client";

import { useEffect, useMemo, useState } from "react";
import { PRIMARY_NAV, NAV_ICONS, routeForNav } from "../navigation";
import LiveDateTime from "../LiveDateTime";
import styles from "./practice.module.css";

type PracticeQuestion = {
  id: string;
  source_record_key?: string | null;
  question_type?: string | null;
  question: string;
  difficulty?: number | null;
  career_tracks?: string[] | null;
  seniority?: string | null;
  expected_time_seconds?: number | null;
  options?: string[] | null;
  correct_answer?: string | null;
  model_answer?: string | null;
  expected_points?: string[] | null;
  calculation_required?: boolean | null;
  quality_score?: number | null;
  domain_name?: string | null;
  domain_slug?: string | null;
  topic_name?: string | null;
  topic_slug?: string | null;
};

type Attempt = { id: string; correct: boolean | null; at: string; response?: string; savedResponse?: boolean; durationSeconds?: number; title?: string; category?: string };
type Mode = "all" | "recent" | "bookmarked" | "weak" | "custom";

const PAGE_SIZE = 8;
const CATALOG_CACHE = "capital-forge-practice-catalog-cache-v2";
const ATTEMPT_STORE = "capital-forge-canonical-practice-v1";
const tabs=PRIMARY_NAV;
const icons=NAV_ICONS;

function go(tab:string){
  const route=routeForNav(tab);
  if(route) window.location.assign(route);
}
function pretty(value?: string | null) {
  if (!value) return "Question";
  return value.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function difficultyLabel(value?: number | null) {
  const n = Number(value || 1);
  if (n <= 2) return "Foundation";
  if (n <= 4) return "Easy";
  if (n <= 6) return "Intermediate";
  if (n <= 8) return "Hard";
  return "MD / IC";
}

function categoryOf(q: PracticeQuestion) { return q.domain_name || q.career_tracks?.[0] || "General Finance"; }

function iconFor(name: string) {
  const n = name.toLowerCase();
  if (n.includes("model")) return "▥";
  if (n.includes("merger") || n.includes("acquisition")) return "M";
  if (n.includes("private equity")) return "P";
  if (n.includes("credit")) return "C";
  if (n.includes("venture")) return "V";
  if (n.includes("account")) return "A";
  if (n.includes("valuation")) return "V";
  if (n.includes("lbo")) return "L";
  if (n.includes("excel")) return "X";
  if (n.includes("market")) return "↗";
  if (n.includes("bank")) return "IB";
  if (n.includes("restruct")) return "R";
  return "▦";
}

export default function PracticePage() {
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [questionType, setQuestionType] = useState("All");
  const [time, setTime] = useState("All");
  const [subtopic, setSubtopic] = useState("All");
  const [mode, setMode] = useState<Mode>("all");
  const [page, setPage] = useState(1);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [customIds, setCustomIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<PracticeQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState("");
  const [response, setResponse] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [openedAt, setOpenedAt] = useState(0);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ATTEMPT_STORE);
      if (raw) setAttempts(JSON.parse(raw));
      const saved = localStorage.getItem("capital-forge-practice-bookmarks-v1");
      if (saved) setBookmarks(JSON.parse(saved));
      const cached = sessionStorage.getItem(CATALOG_CACHE);
      if (cached) {
        const rows = JSON.parse(cached);
        if (Array.isArray(rows) && rows.length) { setQuestions(rows); setLoading(false); }
      }
    } catch {}
    void loadQuestions();
  }, []);

  useEffect(() => { setPage(1); }, [search, category, difficulty, questionType, time, subtopic, mode]);

  async function loadQuestions() {
    if (!questions.length) setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/content?type=practice&view=summary");
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not load the canonical practice catalog.");
      const rows = Array.isArray(data.practice) ? data.practice : [];
      setQuestions(rows);
      try { sessionStorage.setItem(CATALOG_CACHE, JSON.stringify(rows)); } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the canonical practice catalog.");
    } finally { setLoading(false); }
  }

  const attemptMap = useMemo(() => new Map(attempts.map((a) => [a.id, a])), [attempts]);
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of questions) map.set(categoryOf(q), (map.get(categoryOf(q)) || 0) + 1);
    return [{ name: "All", count: questions.length }, ...Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))];
  }, [questions]);
  const typeOptions = useMemo(() => ["All", ...Array.from(new Set(questions.map((q) => q.question_type).filter(Boolean) as string[])).sort()], [questions]);
  const topicOptions = useMemo(() => ["All", ...Array.from(new Set(questions.filter((q) => category === "All" || categoryOf(q) === category).map((q) => q.topic_name).filter(Boolean) as string[])).sort()], [questions, category]);

  const baseFiltered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return questions.filter((q) => {
      const d = Number(q.difficulty || 1);
      const seconds = Number(q.expected_time_seconds || 60);
      const categoryOk = category === "All" || categoryOf(q) === category;
      const difficultyOk = difficulty === "All" || (difficulty === "1-3" && d <= 3) || (difficulty === "4-6" && d >= 4 && d <= 6) || (difficulty === "7-8" && d >= 7 && d <= 8) || (difficulty === "9-10" && d >= 9);
      const typeOk = questionType === "All" || q.question_type === questionType;
      const timeOk = time === "All" || (time === "≤3" && seconds <= 180) || (time === "4-5" && seconds > 180 && seconds <= 300) || (time === "6+" && seconds > 300);
      const topicOk = subtopic === "All" || q.topic_name === subtopic;
      const hay = `${q.question} ${q.source_record_key || ""} ${q.question_type || ""} ${q.seniority || ""} ${categoryOf(q)} ${q.topic_name || ""} ${(q.career_tracks || []).join(" ")}`.toLowerCase();
      return categoryOk && difficultyOk && typeOk && timeOk && topicOk && (!term || hay.includes(term));
    });
  }, [questions, search, category, difficulty, questionType, time, subtopic]);

  const filtered = useMemo(() => {
    if (mode === "recent") {
      const order = new Map([...attempts].sort((a, b) => b.at.localeCompare(a.at)).map((a, i) => [a.id, i]));
      return baseFiltered.filter((q) => order.has(q.id)).sort((a, b) => (order.get(a.id) || 0) - (order.get(b.id) || 0));
    }
    if (mode === "bookmarked") return baseFiltered.filter((q) => bookmarks.includes(q.id));
    if (mode === "weak") return baseFiltered.filter((q) => attemptMap.get(q.id)?.correct === false);
    if (mode === "custom") return baseFiltered.filter((q) => customIds.includes(q.id));
    return baseFiltered;
  }, [baseFiltered, mode, attempts, bookmarks, attemptMap, customIds]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const solved = new Set(attempts.map((a) => a.id)).size;
  const graded = attempts.filter((a) => typeof a.correct === "boolean");
  const correct = graded.filter((a) => a.correct === true).length;
  const incorrect = graded.filter((a) => a.correct === false).length;
  const accuracy = graded.length ? Math.round((correct / graded.length) * 100) : 0;
  const calcCount = questions.filter((q) => q.calculation_required).length;

  const weakAreas = useMemo(() => {
    const map = new Map<string, { total: number; correct: number }>();
    for (const a of attempts) {
      if (typeof a.correct !== "boolean") continue;
      const q = questions.find((x) => x.id === a.id);
      if (!q) continue;
      const name = categoryOf(q);
      const row = map.get(name) || { total: 0, correct: 0 };
      row.total += 1;
      if (a.correct) row.correct += 1;
      map.set(name, row);
    }
    const measured = Array.from(map.entries()).map(([name, x]) => ({ name, accuracy: Math.round((x.correct / Math.max(1, x.total)) * 100), total: x.total })).sort((a, b) => a.accuracy - b.accuracy).slice(0, 4);
    if (measured.length) return measured;
    return categories.slice(1, 5).map((x) => ({ name: x.name, accuracy: 0, total: 0 }));
  }, [attempts, questions, categories]);

  const practicedDays = useMemo(() => new Set(attempts.map((a) => new Date(a.at).toDateString())), [attempts]);
  const week = useMemo(() => {
    const today = new Date();
    const start = new Date(today); start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return { label: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i], done: practicedDays.has(d.toDateString()) }; });
  }, [practicedDays]);
  const streak = week.filter((d) => d.done).length;

  function persistAttempt(nextAttempt: Attempt) {
    const next = [...attempts.filter((a) => a.id !== nextAttempt.id), nextAttempt];
    setAttempts(next);
    try { localStorage.setItem(ATTEMPT_STORE, JSON.stringify(next)); } catch {}
  }

  function saveAttempt(id: string, isCorrect: boolean | null, saveResponse = false) {
    const current = attemptMap.get(id);
    const answer = selectedOption || response;
    const durationSeconds = openedAt ? Math.max(1, Math.round((Date.now() - openedAt) / 1000)) : Number(current?.durationSeconds || 0);
    persistAttempt({
      ...current,
      id,
      correct: isCorrect,
      at: new Date().toISOString(),
      response: answer || current?.response,
      savedResponse: Boolean(saveResponse || current?.savedResponse),
      durationSeconds,
      title: selected?.question || current?.title,
      category: selected ? categoryOf(selected) : current?.category
    });
  }

  function saveCurrentResponse() {
    if (!selected) return;
    const answer = (selectedOption || response).trim();
    if (!answer) return setToast("Write or choose a response first.");
    const existing = attemptMap.get(selected.id);
    saveAttempt(selected.id, existing?.correct ?? null, true);
    setToast("Response saved — your Dashboard now records this as solved.");
  }

  function toggleBookmark(id: string) {
    const next = bookmarks.includes(id) ? bookmarks.filter((x) => x !== id) : [...bookmarks, id];
    setBookmarks(next);
    try { localStorage.setItem("capital-forge-practice-bookmarks-v1", JSON.stringify(next)); } catch {}
  }

  async function openQuestion(q: PracticeQuestion) {
    setSelected(q); setSelectedOption(""); setResponse(""); setRevealed(false); setOpenedAt(Date.now()); setDetailLoading(true);
    try {
      const res = await fetch(`/api/content?type=practice&id=${encodeURIComponent(q.id)}`);
      const data = await res.json();
      if (res.ok && data.ok && data.question) setSelected({ ...q, ...data.question });
      else setToast(data.error || "Could not load full question details.");
    } catch { setToast("Could not load full question details."); }
    finally { setDetailLoading(false); }
  }

  function submit() {
    if (!selected || detailLoading) return;
    if (Array.isArray(selected.options) && selected.options.length) {
      if (!selectedOption) return setToast("Choose an option first.");
      const ok = selectedOption.trim() === String(selected.correct_answer || "").trim();
      saveAttempt(selected.id, ok, false);
      setRevealed(true);
      setToast(ok ? "Correct. Save this response if you want it stored in Dashboard history." : "Checked. Review the canonical answer, then save your response.");
      return;
    }
    if (!response.trim()) return setToast("Write your answer first.");
    setRevealed(true);
    setToast("Compare your reasoning with the canonical answer, then save your response and self-score.");
  }

  function resetFilters() { setCategory("All"); setDifficulty("All"); setQuestionType("All"); setTime("All"); setSubtopic("All"); setSearch(""); setMode("all"); }

  function startQuick(count: number, hard = false) {
    let pool = questions.filter((q) => !hard || Number(q.difficulty || 1) >= 7);
    pool = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
    setCustomIds(pool.map((q) => q.id)); setMode("custom"); setPage(1);
    if (pool[0]) void openQuestion(pool[0]);
  }

  const responseSaved = selected ? Boolean(attemptMap.get(selected.id)?.savedResponse) : false;

  return <div className={styles.shell}>
    <header className={styles.header}>
      <div className={styles.brand}><div className={styles.mark}>CF</div><div><b>Capital Forge</b><small>Master Finance. Build Your Edge.</small></div></div>
      <div className={styles.topSearch}>⌕<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions, topics, companies, or keywords..." /></div>
      <div className={styles.topActions}><LiveDateTime compact/><button className={styles.aiBtn} onClick={() => go("Advanced")}>✦ AI Assistant</button><div className={styles.avatar}><span>DC</span><div><b>Deepak</b><small>Capital Forge</small></div></div></div>
    </header>

    <aside className={styles.sidebar}>
      <nav className={styles.nav}>{tabs.map((tab) => <button key={tab} className={tab === "Practice" ? styles.active : ""} onClick={() => go(tab)}>{icons[tab]} &nbsp;&nbsp; {tab}</button>)}</nav>
      <div className={styles.sidebarFoot}><b>Canonical Content OS</b><p>Questions are quality-gated across modeling, valuation, M&A, LBO, PE, credit, accounting, Excel, markets and more.</p><button onClick={() => window.location.assign("/cases")}>Open Decision Cases →</button></div>
      <div className={styles.version}>Capital Forge · Fast Catalog<br/>{questions.length || "—"} live practice questions</div>
    </aside>

    <main className={styles.main}>
      <div className={styles.pageGrid}>
        <section className={styles.content}>
          <div className={styles.crumb}>Practice &nbsp;›&nbsp; Questions</div>
          <div className={styles.titleRow}>
            <div><h1>Practice</h1><p>Sharpen your skills with the complete Capital Forge canonical question bank.</p></div>
            <div className={styles.miniStats}><div className={styles.miniStat}><i>▣</i><div><b>{questions.length || "—"}+ Questions</b><small>LIVE CANONICAL</small></div></div><div className={styles.miniStat}><i>▦</i><div><b>{Math.max(0, categories.length - 1)} Categories</b><small>FULL COVERAGE</small></div></div><div className={styles.miniStat}><i>↗</i><div><b>{calcCount} Verified Calcs</b><small>DETERMINISTIC</small></div></div></div>
          </div>

          <section className={styles.hero}><div><h2>Consistent Practice Creates<br/><span>Extraordinary Results</span></h2><p>Practice. Learn. Improve. Repeat.</p></div><div className={styles.quote}>“The expert in anything<br/>was once a beginner.”<i/></div></section>

          <div className={styles.categoryRail}>{categories.map((c) => <button key={c.name} className={`${styles.category} ${category === c.name ? styles.active : ""}`} onClick={() => { setCategory(c.name); setSubtopic("All"); setMode("all"); }}><span className={styles.catIcon}>{iconFor(c.name)}</span><span><b>{c.name}</b><small>{c.count} questions</small></span></button>)}</div>

          <div className={styles.filters}>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="All">Difficulty</option><option value="1-3">Foundation / Easy</option><option value="4-6">Intermediate</option><option value="7-8">Hard / Associate</option><option value="9-10">Director / MD / IC</option></select>
            <select value={questionType} onChange={(e) => setQuestionType(e.target.value)}>{typeOptions.map((x) => <option key={x} value={x}>{x === "All" ? "Question Type" : pretty(x)}</option>)}</select>
            <select value={time} onChange={(e) => setTime(e.target.value)}><option value="All">Time</option><option value="≤3">≤ 3 min</option><option value="4-5">4–5 min</option><option value="6+">6+ min</option></select>
            <select value={subtopic} onChange={(e) => setSubtopic(e.target.value)}>{topicOptions.map((x) => <option key={x} value={x}>{x === "All" ? "Sub Topic" : x}</option>)}</select>
            <div className={styles.filterSearch}>⌕<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions..." /></div>
            <button className={styles.reset} onClick={resetFilters}>Reset Filters</button>
          </div>

          <div className={styles.listLayout}>
            <aside className={styles.subnav}>
              <button className={mode === "all" ? styles.active : ""} onClick={() => setMode("all")}><span>▦ All Questions</span><b>{baseFiltered.length}</b></button>
              <button className={mode === "recent" ? styles.active : ""} onClick={() => setMode("recent")}><span>◷ Recently Practiced</span><b>{solved}</b></button>
              <button className={mode === "bookmarked" ? styles.active : ""} onClick={() => setMode("bookmarked")}><span>♡ Bookmarked</span><b>{bookmarks.length}</b></button>
              <button className={mode === "weak" ? styles.active : ""} onClick={() => setMode("weak")}><span>◎ Weak Areas</span><b>{incorrect}</b></button>
              <button className={mode === "custom" ? styles.active : ""} onClick={() => startQuick(10)}><span>▤ Custom Practice</span><b>{customIds.length}</b></button>
            </aside>

            <section>
              {error && <div className={styles.empty}><b>Content API error</b><p>{error}</p><button className={styles.primary} onClick={loadQuestions}>Retry</button></div>}
              {!error && loading && <div className={styles.empty}>Loading the fast canonical catalog…</div>}
              {!error && !loading && visible.length === 0 && <div className={styles.empty}>No questions match the current filters.</div>}
              <div className={styles.questionList}>{visible.map((q) => <article key={q.id} className={styles.questionCard}><div><div className={styles.questionMeta}><span className={styles.tag}>{categoryOf(q)}</span><span className={`${styles.tag} ${Number(q.difficulty || 1) >= 7 ? styles.red : Number(q.difficulty || 1) >= 4 ? styles.amber : styles.green}`}>{difficultyLabel(q.difficulty)}</span>{q.calculation_required && <span className={`${styles.tag} ${styles.green}`}>Verified Calc</span>}<span>◷ {Math.max(1, Math.round(Number(q.expected_time_seconds || 60) / 60))} min</span></div><h3>{q.question}</h3><p>{q.topic_name || pretty(q.question_type)} · {q.source_record_key || "Canonical question"}</p></div><div className={styles.questionActions}><button className={styles.bookmark} onClick={() => toggleBookmark(q.id)} title="Bookmark">{bookmarks.includes(q.id) ? "♥" : "♡"}</button><button className={styles.start} onClick={() => void openQuestion(q)}>{attemptMap.has(q.id) ? "Solve Again" : "Start Practice"} &nbsp;→</button></div></article>)}</div>
              {!loading && filtered.length > 0 && <div className={styles.pagination}><button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Previous</button><small>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} · Page {page}/{totalPages}</small><button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next →</button></div>}
            </section>
          </div>
        </section>

        <aside className={styles.rail}>
          <section className={styles.railCard}><div className={styles.railHead}><h3>Your Practice Stats</h3><button onClick={() => go("Dashboard")}>View Dashboard →</button></div><div className={styles.statsBody}><div className={styles.donut} style={{ background: `conic-gradient(#1675f2 ${accuracy * 3.6}deg,#e9eef5 0deg)` }}><div><b>{accuracy}%</b><small>Accuracy</small></div></div><div className={styles.statLines}><div className={styles.statLine}><span><i className={`${styles.dot} ${styles.greenDot}`}/>Correct</span><b>{correct}</b></div><div className={styles.statLine}><span><i className={`${styles.dot} ${styles.redDot}`}/>Incorrect</span><b>{incorrect}</b></div><div className={styles.statLine}><span><i className={`${styles.dot} ${styles.grayDot}`}/>Solved</span><b>{solved}</b></div><div className={styles.statLine}><span>Total Live</span><b>{questions.length}</b></div></div></div></section>

          <section className={styles.railCard}><div className={styles.streakTitle}><div><b>🔥 Practice Streak</b><div style={{ color: "#7a8497", fontSize: 10, marginTop: 3 }}>Live from your actual attempt timestamps.</div></div><strong>{streak} days</strong></div><div className={styles.week}>{week.map((d) => <div key={d.label} className={`${styles.day} ${d.done ? styles.done : ""}`}><span>{d.done ? "✓" : ""}</span>{d.label}</div>)}</div></section>

          <section className={styles.railCard}><div className={styles.railHead}><h3>◎ Weak Areas</h3><button onClick={() => setMode("weak")}>View All →</button></div><div className={styles.weakList}>{weakAreas.map((w) => <div key={w.name} className={styles.weakRow}><span>{w.name}</span><div className={styles.bar}><i style={{ width: `${w.total ? Math.max(8, 100 - w.accuracy) : 12}%` }}/></div><b>{w.total ? `${w.accuracy}%` : "—"}</b></div>)}</div></section>

          <section className={styles.railCard}><div className={styles.railHead}><h3>⚡ Quick Practice</h3><button onClick={() => startQuick(10)}>Custom</button></div><div className={styles.quickGrid}><button onClick={() => startQuick(10)}>10 Questions</button><button onClick={() => startQuick(20)}>20 Questions</button><button onClick={() => startQuick(10, true)}>Hard Mix</button><button onClick={() => setMode("weak")}>Previous Mistakes</button></div></section>
        </aside>
      </div>
    </main>

    {selected && <div className={styles.modalBackdrop} onMouseDown={(e) => { if (e.currentTarget === e.target) setSelected(null); }}><section className={styles.modal}><div className={styles.modalTop}><div><div className={styles.questionMeta}><span className={styles.tag}>{categoryOf(selected)}</span><span className={`${styles.tag} ${styles.amber}`}>{difficultyLabel(selected.difficulty)}</span><span>{selected.source_record_key}</span></div><h2>{selected.question}</h2></div><button className={styles.close} onClick={() => setSelected(null)}>×</button></div>{detailLoading?<div className={styles.empty}>Loading answer controls…</div>:<>{Array.isArray(selected.options) && selected.options.length ? <div className={styles.options}>{selected.options.map((opt) => <button key={String(opt)} className={selectedOption === String(opt) ? styles.selected : ""} onClick={() => setSelectedOption(String(opt))}>{String(opt)}</button>)}</div> : <textarea className={styles.answerBox} value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Write your answer as if this were a live interview or timed practice round…"/>}<div className={styles.modalActions}><button className={styles.primary} onClick={submit}>Check Answer</button><button className={styles.secondary} onClick={() => setRevealed((x) => !x)}>{revealed ? "Hide Answer" : "Reveal Canonical Answer"}</button></div>{revealed && <div className={styles.result}><b>Canonical Answer</b><p>{selected.model_answer || selected.correct_answer || "Use the expected points below to self-assess your reasoning."}</p>{Array.isArray(selected.expected_points) && selected.expected_points.length > 0 && <ul>{selected.expected_points.map((x) => <li key={x}>{x}</li>)}</ul>}<div className={styles.modalActions}><button className={styles.primary} onClick={saveCurrentResponse}>{responseSaved ? "✓ Response Saved in Dashboard" : "Save This Response"}</button>{(!selected.options || selected.options.length === 0) && <><button className={styles.primary} onClick={() => { saveAttempt(selected.id, true, true); setToast("Saved as solved and understood."); }}>I Got It</button><button className={styles.secondary} onClick={() => { saveAttempt(selected.id, false, true); setToast("Saved as solved and added to weak areas."); }}>Needs Review</button></>}</div></div>}</>}</section></div>}
    {toast && <div className={styles.toast} onClick={() => setToast("")}>{toast}</div>}
  </div>;
}
