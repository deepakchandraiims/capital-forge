"use client";

import { useEffect, useMemo, useState } from "react";

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
};

type Attempt = { id: string; correct: boolean; at: string };

const tabs = ["Home", "Practice", "Advanced", "Dashboard", "Feedback", "Interview Room", "API"];
const icons: Record<string, string> = { Home: "⌂", Practice: "▣", Advanced: "▥", Dashboard: "▦", Feedback: "▱", "Interview Room": "▻", API: "⌘" };
const PAGE_SIZE = 30;

function nav(tab: string) {
  if (tab === "Home") window.location.assign("/home");
  else if (tab === "Practice") window.location.assign("/practice");
  else if (tab === "Dashboard") window.location.assign("/dashboard");
  else if (tab === "Feedback") window.location.assign("/feedback");
  else if (tab === "Interview Room") window.location.assign("/interview");
  else window.location.assign(`/?open=${encodeURIComponent(tab)}`);
}

function pretty(value?: string | null) {
  if (!value) return "Question";
  return value.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function difficultyLabel(value?: number | null) {
  const n = Number(value || 1);
  if (n <= 2) return "Foundation";
  if (n <= 4) return "Analyst";
  if (n <= 6) return "Senior Analyst";
  if (n <= 8) return "Associate / VP";
  return "Director / IC";
}

export default function PracticePage() {
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [track, setTrack] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState("");
  const [response, setResponse] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("capital-forge-canonical-practice-v1");
      if (raw) setAttempts(JSON.parse(raw));
    } catch {}
    void loadQuestions();
  }, []);

  useEffect(() => { setPage(1); }, [search, type, difficulty, track]);

  async function loadQuestions() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/content?type=practice&limit=1000", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not load canonical practice content.");
      const rows = Array.isArray(data.practice) ? data.practice : [];
      setQuestions(rows);
      if (rows.length) setSelectedId((current) => current || rows[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load canonical practice content.");
    } finally { setLoading(false); }
  }

  const typeOptions = useMemo(() => ["All", ...Array.from(new Set(questions.map((q) => q.question_type).filter(Boolean) as string[])).sort()], [questions]);
  const trackOptions = useMemo(() => ["All", ...Array.from(new Set(questions.flatMap((q) => q.career_tracks || []))).sort()], [questions]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return questions.filter((q) => {
      const level = Number(q.difficulty || 1);
      const typeOk = type === "All" || q.question_type === type;
      const difficultyOk = difficulty === "All" ||
        (difficulty === "1-3" && level <= 3) ||
        (difficulty === "4-6" && level >= 4 && level <= 6) ||
        (difficulty === "7-8" && level >= 7 && level <= 8) ||
        (difficulty === "9-10" && level >= 9);
      const trackOk = track === "All" || (q.career_tracks || []).includes(track);
      const haystack = `${q.question} ${q.source_record_key || ""} ${q.question_type || ""} ${q.seniority || ""} ${(q.career_tracks || []).join(" ")}`.toLowerCase();
      return typeOk && difficultyOk && trackOk && (!term || haystack.includes(term));
    });
  }, [questions, search, type, difficulty, track]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = questions.find((q) => q.id === selectedId) || filtered[0] || questions[0] || null;
  const solved = new Set(attempts.map((a) => a.id)).size;
  const correct = attempts.filter((a) => a.correct).length;
  const accuracy = attempts.length ? Math.round((correct / attempts.length) * 100) : 0;
  const calcCount = questions.filter((q) => q.calculation_required).length;

  function chooseQuestion(id: string) {
    setSelectedId(id); setSelectedOption(""); setResponse(""); setRevealed(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveAttempt(isCorrect: boolean) {
    if (!selected) return;
    const next = [...attempts.filter((a) => a.id !== selected.id), { id: selected.id, correct: isCorrect, at: new Date().toISOString() }];
    setAttempts(next);
    try { localStorage.setItem("capital-forge-canonical-practice-v1", JSON.stringify(next)); } catch {}
  }

  function submit() {
    if (!selected) return;
    if (Array.isArray(selected.options) && selected.options.length > 0) {
      if (!selectedOption) return setToast("Choose an option first.");
      const isCorrect = selectedOption.trim() === String(selected.correct_answer || "").trim();
      saveAttempt(isCorrect); setRevealed(true);
      return setToast(isCorrect ? "Correct — strong work." : "Answer checked — review the model answer below.");
    }
    if (!response.trim()) return setToast("Write your answer first.");
    setRevealed(true); setToast("Compare your reasoning with the model answer, then self-score below.");
  }

  function randomQuestion() {
    const pool = filtered.length ? filtered : questions;
    if (pool.length) chooseQuestion(pool[Math.floor(Math.random() * pool.length)].id);
  }

  return <div className="pm-shell">
    <aside className="pm-sidebar">
      <div className="pm-brand"><div className="pm-logo">CF</div><div><b>Capital Forge</b><span>Master Finance. Build Your Future.</span></div></div>
      <nav className="pm-nav">{tabs.map((tab) => <button key={tab} className={tab === "Practice" ? "active" : ""} onClick={() => nav(tab)}>{icons[tab]} &nbsp; {tab}</button>)}</nav>
      <div className="pm-upgrade"><b>Canonical Content OS</b><p>Reviewed finance questions across modeling, valuation, M&A, LBO, PE, credit, accounting, Excel and more.</p><button onClick={() => window.location.assign("/cases")}>Open Decision Cases →</button></div>
      <div className="pm-version">Capital Forge · Full Catalog<br/>700 canonical learning objects</div>
    </aside>

    <main className="pm-main">
      <header className="pm-topbar">
        <div className="pm-search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search the full canonical practice bank..." /></div>
        <button className="pm-ai" onClick={() => nav("Advanced")}>✦ AI Assistant</button>
        <button className="pm-round" onClick={randomQuestion}>⤨</button>
        <div className="pm-profile"><span>DC</span><div><b>Deepak</b><small>Capital Forge</small></div></div>
      </header>

      <section className="pm-hero">
        <div>
          <p className="pm-eyebrow">Canonical Practice · Supabase Live</p>
          <h1>Finance Practice <span>Workstation</span></h1>
          <p>One quality-gated question bank from foundation through MD / Partner / IC difficulty, spanning technical calculations, modeling, interviews and investment judgment.</p>
          <div className="pm-stats big">
            <div><small>Published Practice</small><b>{questions.length || "—"}</b></div>
            <div><small>Calculation Items</small><b>{calcCount || "—"}</b></div>
            <div><small>Solved</small><b>{solved}</b></div>
            <div><small>Accuracy</small><b>{accuracy}%</b></div>
          </div>
        </div>
        <div className="pm-cube"><span>CF</span><b>Content OS</b><small>700 canonical objects</small></div>
      </section>

      <div className="pm-workspace" style={{ marginTop: 20 }}>
        <section className="pm-content">
          <section className="pm-panel">
            <div className="pm-panel-head"><div><h2>Question Bank</h2><p>{filtered.length} questions match your current filters.</p></div><div className="pm-actions"><button className="pm-secondary" onClick={loadQuestions}>{loading ? "Loading..." : "↻ Refresh"}</button><button onClick={randomQuestion}>Random Question</button></div></div>

            <div className="pm-actions" style={{ marginBottom: 16, flexWrap: "wrap" }}>
              <select value={type} onChange={(e) => setType(e.target.value)} style={{ border: "1px solid #e6eaf2", borderRadius: 13, padding: "11px 13px", background: "white" }}>{typeOptions.map((v) => <option key={v} value={v}>{v === "All" ? "All Question Types" : pretty(v)}</option>)}</select>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={{ border: "1px solid #e6eaf2", borderRadius: 13, padding: "11px 13px", background: "white" }}><option value="All">All Difficulties</option><option value="1-3">Difficulty 1–3</option><option value="4-6">Difficulty 4–6</option><option value="7-8">Difficulty 7–8</option><option value="9-10">Difficulty 9–10</option></select>
              <select value={track} onChange={(e) => setTrack(e.target.value)} style={{ border: "1px solid #e6eaf2", borderRadius: 13, padding: "11px 13px", background: "white" }}>{trackOptions.map((v) => <option key={v} value={v}>{v === "All" ? "All Career Tracks" : v}</option>)}</select>
              <button className="pm-secondary" onClick={() => { setType("All"); setDifficulty("All"); setTrack("All"); setSearch(""); }}>Reset</button>
            </div>

            {error && <div className="pm-result bad"><b>Content API error</b><p>{error}</p><button onClick={loadQuestions}>Try Again</button></div>}

            <div style={{ display: "grid", gap: 10, maxHeight: 560, overflow: "auto", paddingRight: 4 }}>
              {visible.map((q) => <button key={q.id} className={`pm-module ${selected?.id === q.id ? "active" : ""}`} onClick={() => chooseQuestion(q.id)} style={{ textAlign: "left", width: "100%" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span className="pm-tag blue">{pretty(q.question_type)}</span><span className="pm-tag black">D{q.difficulty || 1}</span>{q.calculation_required && <span className="pm-tag green">Verified Calc</span>}<small>{q.seniority || difficultyLabel(q.difficulty)}</small></div>
                <h3>{q.question}</h3><p>{q.source_record_key || "Published question"} · {Math.max(1, Math.round((q.expected_time_seconds || 60) / 60))} min</p>
              </button>)}
              {!loading && !error && visible.length === 0 && <div className="pm-note">No questions match the current filters.</div>}
            </div>

            <div className="pm-actions" style={{ marginTop: 16, justifyContent: "space-between" }}><button className="pm-secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Previous</button><small>Page {Math.min(page, totalPages)} of {totalPages}</small><button className="pm-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next →</button></div>
          </section>

          {selected && <section className="pm-panel">
            <div className="pm-panel-head"><div><span className="pm-tag green">{selected.source_record_key || "CF"}</span><h2 style={{ marginTop: 10 }}>{pretty(selected.question_type)}</h2></div><span className="pm-tag red">Difficulty {selected.difficulty || 1}</span></div>
            <p className="pm-prompt">{selected.question}</p>
            {Array.isArray(selected.options) && selected.options.length > 0 ? <div className="pm-options">{selected.options.map((option) => <button key={String(option)} className={selectedOption === option ? "active" : ""} onClick={() => { setSelectedOption(option); setRevealed(false); }}>{option}</button>)}</div> : <textarea value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Write your answer as if you were in an interview or timed practice session..." />}
            <div className="pm-actions" style={{ marginTop: 14 }}><button onClick={submit}>Check Answer</button><button className="pm-secondary" onClick={() => setRevealed((v) => !v)}>{revealed ? "Hide Model Answer" : "Reveal Model Answer"}</button></div>
            {revealed && <div className="pm-result good"><b>Model Answer</b><p>{selected.model_answer || String(selected.correct_answer || "Model answer is not available.")}</p>{Array.isArray(selected.expected_points) && selected.expected_points.length > 0 && <><b>Key points</b><ul>{selected.expected_points.map((point) => <li key={point}>{point}</li>)}</ul></>}{(!selected.options || selected.options.length === 0) && <div className="pm-actions"><button onClick={() => { saveAttempt(true); setToast("Marked as understood."); }}>I Got It</button><button className="pm-secondary" onClick={() => { saveAttempt(false); setToast("Added to your review set."); }}>Needs Review</button></div>}</div>}
          </section>}
        </section>

        <aside className="pm-rail">
          <section className="pm-card pm-progress"><h3>Your Practice Stats</h3><div className="pm-donut" style={{ background: `conic-gradient(#2563eb ${accuracy * 3.6}deg,#e8edf4 0deg)` }}><span>{accuracy}%</span></div><p>{solved} unique questions attempted · {correct} correct</p></section>
          <section className="pm-card"><h3>Live Catalog</h3><p><b>{questions.length}</b> published practice questions loaded from Supabase.</p><p><b>{calcCount}</b> calculation-oriented questions.</p><button onClick={loadQuestions}>Refresh Content</button></section>
          <section className="pm-card"><h3>Quick Practice</h3><div className="pm-quick"><button onClick={randomQuestion}>Random</button><button onClick={() => setDifficulty("9-10")}>Hardest</button><button onClick={() => setType("calculation")}>Calculations</button><button onClick={() => setType("deal_judgment")}>Judgment</button></div></section>
          <section className="pm-card"><h3>Decision Cases</h3><p>105 new IC-style decision cases are now canonical.</p><button onClick={() => window.location.assign("/cases")}>Open Cases →</button></section>
        </aside>
      </div>

      {toast && <div className="toast-message"><button onClick={() => setToast("")}>×</button>{toast}</div>}
    </main>
  </div>;
}
