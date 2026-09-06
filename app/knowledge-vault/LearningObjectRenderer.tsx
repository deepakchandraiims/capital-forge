"use client";

import { useMemo, useState } from "react";

type Source = { id?: string; publisher?: string | null; title?: string | null; url?: string | null; source_type?: string | null; document_date?: string | null; authority_tier?: number | null; notes?: string | null };
type LearningObject = Record<string, any>;

function text(value: any) { return typeof value === "string" && value.trim() ? value.trim() : ""; }
function list(value: any) { return Array.isArray(value) ? value.filter(Boolean) : []; }

export default function LearningObjectRenderer({ object, sources = [], compact = false }: { object: LearningObject; sources?: Source[]; compact?: boolean }) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const content = object.content && typeof object.content === "object" ? object.content : {};
  const isHistorical = Boolean(object.event_date) || ["historical_event", "crisis", "market_event"].includes(String(object.content_type || ""));
  const isTrade = ["legendary_trade", "trade", "deal", "m_and_a_deal"].includes(String(object.content_type || ""));
  const isFormula = ["formula", "technical_formula"].includes(String(object.content_type || "")) || Boolean(content.formula);
  const prompt = text(object.prompt) || text(content.prompt) || text(content.question) || text(object.title);
  const answer = text(object.answer) || text(content.answer) || text(content.model_answer);
  const sections = useMemo(() => {
    if (isFormula) return [
      ["Formula", text(content.formula) || answer], ["Variables", text(content.variables)], ["When to use", text(content.when_to_use)], ["Economic intuition", text(object.intuition) || text(content.intuition)], ["Common mistake", text(object.common_mistake) || text(content.common_mistake)], ["Mini example", text(content.mini_example)], ["Interview version", text(content.interview_version)]
    ];
    if (isHistorical) return [
      ["What Happened?", answer || text(content.what_happened)], ["Why?", text(content.why)], ["Market Impact", text(content.market_impact)], ["Winners / Losers", text(content.winners_losers)], ["Why It Matters Today", text(object.why_it_matters) || text(content.why_it_matters)], ["Lesson", text(content.lesson)], ["Pattern to Remember", text(object.pattern_to_remember) || text(content.pattern_to_remember)]
    ];
    if (isTrade) return [
      ["Thesis", text(content.thesis) || answer], ["Catalyst", text(content.catalyst)], ["Position Construction", text(content.position_construction)], ["Risk", text(content.risk)], ["Outcome", text(content.outcome)], ["Why it worked / failed", text(content.why_it_worked) || text(content.why_it_failed)], ["What could have changed the outcome", text(content.counterfactual)], ["Lesson", text(content.lesson)]
    ];
    return [
      ["Answer", answer], ["Explanation", text(object.explanation) || text(content.explanation)], ["Intuition", text(object.intuition) || text(content.intuition)], ["Common mistake", text(object.common_mistake) || text(content.common_mistake)], ["Why this matters", text(object.why_it_matters) || text(content.why_it_matters)], ["Pattern to remember", text(object.pattern_to_remember) || text(content.pattern_to_remember)]
    ];
  }, [answer, content, isFormula, isHistorical, isTrade, object]);

  const openAI = () => {
    const context = [object.title, object.category, object.topic, prompt].filter(Boolean).join(" | ");
    const aiPrompt = `Knowledge Vault context: ${context}. Explain this using the canonical object as the source of truth. Do not overwrite or invent the validated answer. Offer: explain simply, explain technically, interview follow-up, another example, challenge the answer, connect to a real deal, or quiz me.`;
    window.location.assign(`/?open=Advanced&kvObject=${encodeURIComponent(object.id || object.source_record_key || "")}&prompt=${encodeURIComponent(aiPrompt)}`);
  };

  return <article className={`kv-object-renderer ${compact ? "compact" : ""}`}>
    <div className="kv-object-meta"><span>{object.universe || "Knowledge Vault"}</span><span>{object.category || "Finance"}</span><span>Difficulty {object.difficulty || 5}/10</span>{object.source_kind === "source_grounded" ? <button onClick={() => setSourceOpen(true)}>✓ Verified Source</button> : <span className="authored">Capital Forge Authored</span>}</div>
    {isHistorical && <div className="kv-object-date"><b>{object.event_date || content.date || "Historical context"}</b><span>{text(content.geography)}</span><span>{text(content.event_type)}</span></div>}
    {isTrade && <div className="kv-object-date"><b>{text(content.trader_fund) || text(content.trader) || "Trade / Deal"}</b><span>{text(content.year)}</span><span>{text(content.instrument)}</span><span>{text(content.direction)}</span></div>}
    <h1>{object.title}</h1>
    <div className="kv-object-prompt"><small>{object.question_type || object.content_type || "Learning Object"}</small><p>{prompt}</p></div>
    <div className="kv-object-sections">{sections.filter(([, value]) => value).map(([label, value]) => <section key={label}><h3>{label}</h3><p>{value}</p></section>)}</div>
    {list(content.related_formulas).length > 0 && <section className="kv-related-inline"><h3>Related formulas</h3><div>{list(content.related_formulas).map((x: any) => <span key={String(x)}>{String(x)}</span>)}</div></section>}
    <div className="kv-object-actions"><button onClick={openAI}>✦ Ask AI</button><button onClick={() => window.location.assign(`/practice?topic=${encodeURIComponent(object.topic || object.category || "")}`)}>Practice This →</button><button onClick={() => window.location.assign(`/?open=Advanced&topic=${encodeURIComponent(object.topic || object.category || "")}`)}>Go Deeper →</button><button onClick={() => window.location.assign(`/interview?topic=${encodeURIComponent(object.topic || object.category || "")}`)}>Interview Me On This →</button></div>
    {sourceOpen && <div className="kv-source-overlay" onClick={() => setSourceOpen(false)}><aside onClick={(e) => e.stopPropagation()}><div className="kv-source-head"><div><small>Knowledge Vault</small><h2>Verified Source</h2></div><button onClick={() => setSourceOpen(false)}>×</button></div>{sources.length ? sources.map((s, i) => <section key={s.id || i}><b>{s.publisher || "Primary Source"}</b><h3>{s.title || "Source document"}</h3><dl><div><dt>Document Type</dt><dd>{s.source_type || "Primary source"}</dd></div><div><dt>Date</dt><dd>{s.document_date || "—"}</dd></div><div><dt>Authority Tier</dt><dd>{s.authority_tier ? `Tier ${s.authority_tier}` : "—"}</dd></div><div><dt>Relevant Fact / Section</dt><dd>{s.notes || "Canonical source linked to this object."}</dd></div></dl>{s.url && <a href={s.url} target="_blank" rel="noreferrer">View Source ↗</a>}</section>) : <p>No external source is attached to this authored object.</p>}</aside></div>}
  </article>;
}
