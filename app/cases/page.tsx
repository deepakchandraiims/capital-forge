"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type CanonicalCase = Record<string, any> & {
  id: string;
  source_record_key?: string;
  title?: string;
  prompt?: string;
  case_prompt?: string;
  question?: string;
  scenario?: string;
  context?: string;
  model_answer?: string;
  solution?: string;
  difficulty?: number;
  seniority?: string;
  career_tracks?: string[];
  options?: any[];
  expected_points?: string[];
  domain_name?: string;
  topic_name?: string;
};

const tabs = ["Home", "Practice", "Cases", "Advanced", "Dashboard", "Feedback", "Interview Room"];

function go(tab: string) {
  if (tab === "Home") window.location.assign("/home");
  else if (tab === "Practice") window.location.assign("/practice");
  else if (tab === "Cases") window.location.assign("/cases");
  else if (tab === "Dashboard") window.location.assign("/dashboard");
  else if (tab === "Feedback") window.location.assign("/feedback");
  else if (tab === "Interview Room") window.location.assign("/interview");
  else window.location.assign(`/?open=${encodeURIComponent(tab)}`);
}

function pickText(item: CanonicalCase, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}
function promptOf(item: CanonicalCase) { return pickText(item, ["prompt", "case_prompt", "question", "scenario", "context", "description", "title"]); }
function answerOf(item: CanonicalCase) { return pickText(item, ["model_answer", "recommended_answer", "solution", "answer", "key_principle", "decision"]); }
function label(value: unknown) { return String(value || "Case").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase()); }

export default function CasesPage() {
  const params = useSearchParams();
  const requestedCase = params.get("case");
  const [cases, setCases] = useState<CanonicalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [decision, setDecision] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/content?type=cases&limit=1000", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not load cases.");
      const rows = Array.isArray(data.cases) ? data.cases : [];
      setCases(rows);
      if (rows.length) {
        const requested = requestedCase ? rows.find((x: CanonicalCase) => x.id === requestedCase || x.source_record_key === requestedCase) : null;
        setSelectedId((id) => requested?.id || id || rows[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load cases.");
    } finally { setLoading(false); }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return cases.filter((item) => {
      const d = Number(item.difficulty || 1);
      const dOk = difficulty === "All" || (difficulty === "1-3" && d <= 3) || (difficulty === "4-6" && d >= 4 && d <= 6) || (difficulty === "7-8" && d >= 7 && d <= 8) || (difficulty === "9-10" && d >= 9);
      const text = `${item.source_record_key || ""} ${item.title || ""} ${promptOf(item)} ${item.seniority || ""} ${item.domain_name || ""} ${item.topic_name || ""} ${(item.career_tracks || []).join(" ")}`.toLowerCase();
      return dOk && (!term || text.includes(term));
    });
  }, [cases, search, difficulty]);

  const selected = cases.find((x) => x.id === selectedId) || filtered[0] || cases[0] || null;
  const decisionCount = cases.filter((x) => String(x.source_record_key || "").startsWith("DEC-")).length;

  function select(id: string) {
    setSelectedId(id); setRevealed(false); setDecision("");
    window.history.replaceState({}, "", `/cases?case=${encodeURIComponent(cases.find((x) => x.id === id)?.source_record_key || id)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return <div className="pm-shell">
    <aside className="pm-sidebar">
      <div className="pm-brand"><div className="pm-logo">CF</div><div><b>Capital Forge</b><span>Master Finance. Build Your Future.</span></div></div>
      <nav className="pm-nav">{tabs.map((tab) => <button key={tab} className={tab === "Cases" ? "active" : ""} onClick={() => go(tab)}>▥ &nbsp; {tab}</button>)}</nav>
      <div className="pm-upgrade"><b>Decision Lab</b><p>Work through PE, M&A, private credit, distressed, VC, public markets and corporate-finance judgment cases.</p><button onClick={() => go("Interview Room")}>Practice in Interview Room →</button></div>
      <div className="pm-version">Capital Forge · Canonical Cases<br/>{cases.length || 110} published cases</div>
    </aside>

    <main className="pm-main">
      <header className="pm-topbar">
        <div className="pm-search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search decision cases, sectors, roles or case IDs..." /></div>
        <button className="pm-ai" onClick={() => go("Advanced")}>✦ AI Assistant</button>
        <div className="pm-profile"><span>DC</span><div><b>Deepak</b><small>Decision Lab</small></div></div>
      </header>

      <section className="pm-hero">
        <div><p className="pm-eyebrow">Canonical Cases · Supabase Live</p><h1>Investment Decision <span>Lab</span></h1><p>Train judgment, trade-offs, downside framing, calibration and decision quality using the cases you published.</p><div className="pm-stats big"><div><small>Published Cases</small><b>{cases.length || "—"}</b></div><div><small>Decision Cases</small><b>{decisionCount || "—"}</b></div><div><small>Visible</small><b>{filtered.length}</b></div><div><small>Difficulty</small><b>1–10</b></div></div></div>
        <div className="pm-cube"><span>IC</span><b>Decision Cases</b><small>Evidence → judgment → recommendation</small></div>
      </section>

      <div className="pm-workspace" style={{ marginTop: 20 }}>
        <section className="pm-content">
          {selected && <section className="pm-panel">
            <div className="pm-panel-head"><div><span className="pm-tag blue">{selected.source_record_key || "CASE"}</span><h2 style={{ marginTop: 10 }}>{selected.title || label(selected.source_record_key)}</h2><p>{selected.domain_name || selected.topic_name || selected.seniority || "Investment judgment"} · Difficulty {selected.difficulty || "—"}</p></div><button className="pm-secondary" onClick={() => select(filtered[Math.floor(Math.random() * Math.max(filtered.length, 1))]?.id || selected.id)}>Random Case</button></div>
            <p className="pm-prompt" style={{ whiteSpace: "pre-wrap" }}>{promptOf(selected) || "Open the case details below."}</p>
            {Array.isArray(selected.facts) && selected.facts.length > 0 && <div className="pm-note"><b>Facts</b><ul>{selected.facts.map((x: any, i: number) => <li key={i}>{typeof x === "string" ? x : JSON.stringify(x)}</li>)}</ul></div>}
            {Array.isArray(selected.options) && selected.options.length > 0 && <div className="pm-options">{selected.options.map((option: any, i: number) => <button key={i} onClick={() => setDecision(typeof option === "string" ? option : JSON.stringify(option))}>{typeof option === "string" ? option : (option.label || option.option || option.text || JSON.stringify(option))}</button>)}</div>}
            <textarea value={decision} onChange={(e) => setDecision(e.target.value)} placeholder="Write your decision first: recommendation, key reasons, downside, what changes your mind..." />
            <div className="pm-actions" style={{ marginTop: 14 }}><button onClick={() => setRevealed(true)}>Lock Decision & Reveal Framework</button><button className="pm-secondary" onClick={() => { setDecision(""); setRevealed(false); }}>Reset</button></div>
            {revealed && <div className="pm-result good"><b>Canonical Framework / Model Answer</b><p style={{ whiteSpace: "pre-wrap" }}>{answerOf(selected) || "This case is designed for judgment grading. Use the structured fields below to compare your reasoning."}</p>{Array.isArray(selected.expected_points) && selected.expected_points.length > 0 && <><b>Expected points</b><ul>{selected.expected_points.map((p: string) => <li key={p}>{p}</li>)}</ul></>}{selected.key_principle && <p><b>Key principle:</b> {String(selected.key_principle)}</p>}{selected.what_should_change_your_mind && <p><b>What should change your mind:</b> {String(selected.what_should_change_your_mind)}</p>}{selected.trap && <p><b>Trap:</b> {String(selected.trap)}</p>}</div>}
          </section>}

          <section className="pm-panel">
            <div className="pm-panel-head"><div><h2>Case Bank</h2><p>{filtered.length} cases match your filters.</p></div><button className="pm-secondary" onClick={load}>{loading ? "Loading..." : "↻ Refresh"}</button></div>
            <div className="pm-actions" style={{ marginBottom: 16 }}><select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={{ border: "1px solid #e6eaf2", borderRadius: 13, padding: "11px 13px", background: "white" }}><option value="All">All Difficulties</option><option value="1-3">Difficulty 1–3</option><option value="4-6">Difficulty 4–6</option><option value="7-8">Difficulty 7–8</option><option value="9-10">Difficulty 9–10</option></select><button className="pm-secondary" onClick={() => { setSearch(""); setDifficulty("All"); }}>Reset Filters</button></div>
            {error && <div className="pm-result bad"><b>Content API error</b><p>{error}</p></div>}
            <div style={{ display: "grid", gap: 10, maxHeight: 650, overflow: "auto" }}>{filtered.map((item) => <button key={item.id} className={`pm-module ${selected?.id === item.id ? "active" : ""}`} onClick={() => select(item.id)} style={{ textAlign: "left", width: "100%" }}><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span className="pm-tag black">{item.source_record_key || "CASE"}</span><span className="pm-tag red">D{item.difficulty || 1}</span><small>{item.domain_name || item.topic_name || item.seniority || "Case"}</small></div><h3>{item.title || promptOf(item).slice(0, 110) || "Canonical case"}</h3><p>{(item.career_tracks || []).join(" · ") || "Finance decision making"}</p></button>)}</div>
          </section>
        </section>

        <aside className="pm-rail">
          <section className="pm-card"><h3>How to Answer</h3><p>1. State the decision.</p><p>2. Give 2–3 decisive reasons.</p><p>3. Quantify downside where possible.</p><p>4. Name the strongest counterargument.</p><p>5. Say what evidence changes your mind.</p></section>
          <section className="pm-card"><h3>Canonical Coverage</h3><p>PE & M&A</p><p>Private Credit & Distressed</p><p>VC & Public Markets</p><p>Corporate Finance & Macro</p></section>
          <section className="pm-card"><h3>Practice Next</h3><button onClick={() => go("Practice")}>Question Bank →</button><button style={{ marginTop: 8 }} onClick={() => go("Interview Room")}>Interview Room →</button></section>
        </aside>
      </div>
    </main>
  </div>;
}
