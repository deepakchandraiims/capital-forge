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
  common_wrong_answers?: string[] | null;
  follow_ups?: Array<{ question?: string; difficulty?: number }> | null;
  calculation_required?: boolean | null;
  quality_score?: number | null;
};

type Attempt = {
  id: string;
  correct: boolean;
  at: string;
};

const tabs = ["Home", "Practice", "Advanced", "Dashboard", "Feedback", "Interview Room", "API"];
const icons: Record<string, string> = { Home: "⌂", Practice: "▣", Advanced: "▥", Dashboard: "▦", Feedback: "▱", "Interview Room": "▻", API: "⌘" };

function nav(tab: string) {
  if (tab === "Home") window.location.assign("/home");
  else if (tab === "Practice") window.location.assign("/practice");
  else if (tab === "Dashboard") window.location.assign("/dashboard");
  else if (tab === "Feedback") window.location.assign("/feedback");
  else if (tab === "Interview Room") window.location.assign("/interview");
  else window.location.assign(`/?open=${encodeURIComponent(tab)}`);
}

function prettyType(value?: string | null) {
  if (!value) return "Question";
  return value.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function difficultyLabel(value?: number | null) {
  const n = Number(value || 1);
  if (n <= 2) return "Foundation";
  if (n <= 4) return "Intermediate";
  if (n <= 6) return "Advanced";
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

  async function loadQuestions() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/content?type=practice&limit=100", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not load practice content.");
      const rows = Array.isArray(data.practice) ? data.practice : [];
      setQuestions(rows);
      if (rows.length && !selectedId) setSelectedId(rows[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load practice content.");
    } finally {
      setLoading(false);
    }
  }

  const typeOptions = useMemo(() => {
    const values = new Set(questions.map((q) => q.question_type).filter(Boolean) as string[]);
    return ["All", ...Array.from(values).sort()];
  }, [questions]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return questions.filter((q) => {
      const typeOk = type === "All" || q.question_type === type;
      const level = Number(q.difficulty || 1);
      const difficultyOk = difficulty === "All" ||
        (difficulty === "1-3" && level <= 3) ||
        (difficulty === "4-6" && level >= 4 && level <= 6) ||
        (difficulty === "7-8" && level >= 7 && level <= 8) ||
        (difficulty === "9-10" && level >= 9);
      const haystack = `${q.question} ${q.question_type || ""} ${q.seniority || ""} ${(q.career_tracks || []).join(" ")}`.toLowerCase();
      return typeOk && difficultyOk && (!term || haystack.includes(term));
    });
  }, [questions, search, type, difficulty]);

  const selected = questions.find((q) => q.id === selectedId) || filtered[0] || questions[0] || null;
  const solved = new Set(attempts.map((a) => a.id)).size;
  const correct = attempts.filter((a) => a.correct).length;
  const accuracy = attempts.length ? Math.round((correct / attempts.length) * 100) : 0;

  function chooseQuestion(id: string) {
    setSelectedId(id);
    setSelectedOption("");
    setResponse("");
    setRevealed(false);
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
      if (!selectedOption) {
        setToast("Choose an option first.");
        return;
      }
      const isCorrect = selectedOption.trim() === String(selected.correct_answer || "").trim();
      saveAttempt(isCorrect);
      setRevealed(true);
      setToast(isCorrect ? "Correct — strong work." : "Answer checked — review the model answer below.");
      return;
    }
    if (!response.trim()) {
      setToast("Write your answer first.");
      return;
    }
    setRevealed(true);
    setToast("Compare your reasoning with the model answer, then self-score below.");
  }

  function randomQuestion() {
    const pool = filtered.length ? filtered : questions;
    if (!pool.length) return;
    chooseQuestion(pool[Math.floor(Math.random() * pool.length)].id);
  }

  return <div className="pm-shell">
    <aside className="pm-sidebar">
      <div className="pm-brand"><div className="pm-logo">CF</div><div><b>Capital Forge</b><span>Master Finance. Build Your Future.</span></div></div>
      <nav className="pm-nav">{tabs.map((tab) => <button key={tab} className={tab === "Practice" ? "active" : ""} onClick={() => nav(tab)}>{icons[tab]} &nbsp; {tab}</button>)}</nav>
      <div className="pm-upgrade"><b>Canonical Content Live</b><p>Practice is now reading reviewed, published DCF questions directly from Supabase.</p><button onClick={() => nav("Advanced")}>Open Advanced →</button></div>
      <div className="pm-version">Capital Forge · Content OS<br/>DCF Pilot · 50 Practice Questions</div>
    </aside>

    <main className="pm-main">
      <header className="pm-topbar">
        <div className="pm-search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search the 50 published DCF questions..." /></div>
        <button className="pm-ai" onClick={() => nav("Advanced")}>✦ AI Assistant</button>
        <button className="pm-round" onClick={randomQuestion}>⤨</button>
        <div className="pm-profile"><span>DC</span><div><b>Deepak</b><small>DCF Practice</small></div></div>
      </header>

      <section className="pm-hero">
        <div>
          <p className="pm-eyebrow">Canonical Practice · Supabase Live</p>
          <h1>DCF Practice <span>Workstation</span></h1>
          <p>50 reviewed questions from Foundation through MD / Partner / IC difficulty. Every calculation item has already passed deterministic finance validation.</p>
          <div className="pm-stats big">
            <div><small>Published</small><b>{questions.length || 50}</b></div>
            <div><small>Visible</small><b>{filtered.length}</b></div>
            <div><small>Solved</small><b>{solved}</b></div>
            <div><small>Accuracy</small><b>{accuracy}%</b></div>
          </div>
        </div>
        <div className="pm-cube"><span>DCF</span><b>Valuation Pilot</b><small>Quality-gated content</small></div>
      </section>

      <div className="pm-workspace" style={{ marginTop: 20 }}>
        <section className="pm-content">
          <section className="pm-panel">
            <div className="pm-panel-head">
              <div><h2>Question Bank</h2><p>Filter by question type and difficulty, then open any item.</p></div>
              <div className="pm-actions"><button className="pm-secondary" onClick={loadQuestions}>{loading ? "Loading..." : "↻ Refresh"}</button><button onClick={randomQuestion}>Random Question</button></div>
            </div>

            <div className="pm-actions" style={{ marginBottom: 16 }}>
              <select value={type} onChange={(e) => setType(e.target.value)} style={{ border: "1px solid #e6eaf2", borderRadius: 13, padding: "11px 13px", background: "white" }}>
                {typeOptions.map((v) => <option key={v} value={v}>{v === "All" ? "All Question Types" : prettyType(v)}</option>)}
              </select>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={{ border: "1px solid #e6eaf2", borderRadius: 13, padding: "11px 13px", background: "white" }}>
                <option value="All">All Difficulties</option><option value="1-3">Difficulty 1–3</option><option value="4-6">Difficulty 4–6</option><option value="7-8">Difficulty 7–8</option><option value="9-10">Difficulty 9–10</option>
              </select>
              <button className="pm-secondary" onClick={() => { setType("All"); setDifficulty("All"); setSearch(""); }}>Reset Filters</button>
            </div>

            {error && <div className="pm-result bad"><b>Content API error</b><p>{error}</p><button onClick={loadQuestions}>Try Again</button></div>}

            <div style={{ display: "grid", gap: 10, maxHeight: 520, overflow: "auto", paddingRight: 4 }}>
              {filtered.map((q) => <button key={q.id} className={`pm-module ${selected?.id === q.id ? "active" : ""}`} onClick={() => chooseQuestion(q.id)} style={{ textAlign: "left", width: "100%" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span className="pm-tag blue">{prettyType(q.question_type)}</span><span className="pm-tag black">D{q.difficulty || 1}</span><small>{q.seniority || difficultyLabel(q.difficulty)}</small></div>
                <h3>{q.question}</h3><p>{q.source_record_key || "Published question"} · {Math.max(1, Math.round((q.expected_time_seconds || 60) / 60))} min</p>
              </button>)}
              {!loading && !error && filtered.length === 0 && <div className="pm-note">No questions match the current filters.</div>}
            </div>
          </section>

          {selected && <section className="pm-panel">
            <div className="pm-panel-head"><div><span className="pm-tag green">{selected.source_record_key || "DCF"}</span><h2 style={{ marginTop: 10 }}>{prettyType(selected.question_type)}</h2></div><span className="pm-tag red">Difficulty {selected.difficulty || 1}</span></div>
            <p className="pm-prompt">{selected.question}</p>

            {Array.isArray(selected.options) && selected.options.length > 0 ? <div className="pm-options">{selected.options.map((option) => <button key={option} className={selectedOption === option ? "active" : ""} onClick={() => { setSelectedOption(option); setRevealed(false); }}>{option}</button>)}</div> : <textarea value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Write your answer as if you were in an interview or timed practice session..." />}

            <div className="pm-actions" style={{ marginTop: 14 }}><button onClick={submit}>Check Answer</button><button className="pm-secondary" onClick={() => setRevealed((v) => !v)}>{revealed ? "Hide Model Answer" : "Reveal Model Answer"}</button></div>

            {revealed && <div className="pm-result good"><b>Model Answer</b><p>{selected.model_answer || "Model answer is not available."}</p>{Array.isArray(selected.expected_points) && selected.expected_points.length > 0 && <><b>Key points</b><ul>{selected.expected_points.map((point) => <li key={point}>{point}</li>)}</ul></>}{(!selected.options || selected.options.length === 0) && <div className="pm-actions"><button onClick={() => { saveAttempt(true); setToast("Marked as understood."); }}>I Got It</button><button className="pm-secondary" onClick={() => { saveAttempt(false); setToast("Added to your review set."); }}>Needs Review</button></div>}</div>}
          </section>}
        </section>

        <aside className="pm-rail">
          <section className="pm-card pm-progress"><h3>Your Practice Stats</h3><div className="pm-donut" style={{ background: `conic-gradient(#2563eb ${accuracy * 3.6}deg,#e8edf4 0deg)` }}><span>{accuracy}%</span></div><p>{solved} unique questions attempted · {correct} correct</p></section>
          <section className="pm-card"><h3>Live Content</h3><p><b>{questions.length}</b> canonical DCF questions loaded from Supabase.</p><p>Source: <b>CF-DCF-PILOT-001</b></p><button onClick={loadQuestions}>Refresh Content</button></section>
          <section className="pm-card"><h3>Difficulty Ladder</h3><p>1–3 Foundation / Intermediate</p><p>4–6 Analyst / Advanced</p><p>7–8 Associate / VP</p><p>9–10 Director / MD / IC</p></section>
          <section className="pm-card"><h3>Quick Practice</h3><div className="pm-quick"><button onClick={randomQuestion}>Random</button><button onClick={() => setDifficulty("9-10")}>Hardest</button><button onClick={() => setType("calculation")}>Calculations</button><button onClick={() => setType("deal_judgment")}>Judgment</button></div></section>
        </aside>
      </div>

      {toast && <div className="toast-message"><button onClick={() => setToast("")}>×</button>{toast}</div>}
    </main>
  </div>;
}
