"use client";

import { useMemo, useState } from "react";

type Source = {
  id?: string;
  publisher?: string | null;
  title?: string | null;
  url?: string | null;
  source_type?: string | null;
  document_date?: string | null;
  authority_tier?: number | null;
  notes?: string | null;
};
type LearningObject = Record<string, any>;

function text(value: any) { return typeof value === "string" && value.trim() ? value.trim() : ""; }
function list(value: any) { return Array.isArray(value) ? value.filter(Boolean) : []; }
function joined(value: any) { return list(value).map((x) => typeof x === "string" ? x : JSON.stringify(x)).join(" • "); }
function historicalLabel(content: Record<string, any>) {
  const context = text(content.context);
  const match = context.match(/\(([^)]+)\)/);
  return text(content.date) || text(content.year) || (match ? match[1] : "") || "Historical context";
}

export default function LearningObjectRenderer({ object, sources = [], compact = false }: { object: LearningObject; sources?: Source[]; compact?: boolean }) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const content = object.content && typeof object.content === "object" ? object.content : {};
  const universe = String(object.universe || "");
  const isTrade = universe === "Legendary Trades & Deals" || ["legendary_trade", "trade", "deal", "m_and_a_deal"].includes(String(object.content_type || ""));
  const isHistorical = !isTrade && (universe === "Market History" || universe === "Crises & Events" || Boolean(object.event_date) || ["historical_event", "crisis", "market_event"].includes(String(object.content_type || "")));
  const isFormula = object.category === "Core Finance Formulas" || ["formula", "technical_formula"].includes(String(object.content_type || "")) || Boolean(content.formula);
  const prompt = text(object.prompt) || text(content.prompt) || text(content.question) || text(object.title);
  const answer = text(object.answer) || text(content.answer) || text(content.model_answer) || text(content.solution);
  const canonicalSources = useMemo<Source[]>(() => {
    if (sources.length) return sources;
    const raw = list(object.source_metadata?.sources).length ? list(object.source_metadata?.sources) : list(content.sources);
    return raw.map((s: any) => ({
      id: s.id,
      publisher: s.publisher || s.company || null,
      title: s.document_title || s.title || null,
      url: s.url || null,
      source_type: s.document_type || s.source_type || null,
      document_date: s.document_date || null,
      authority_tier: Number.isFinite(Number(s.authority_tier)) ? Number(s.authority_tier) : null,
      notes: s.notes || object.source_metadata?.source_fact_or_section_used || content.source_fact_or_section_used || null
    }));
  }, [content, object.source_metadata, sources]);

  const sections = useMemo(() => {
    if (isFormula) return [
      ["Formula / Core Relationship", text(content.formula) || answer],
      ["Variables / Inputs", text(content.variables)],
      ["How to use it", text(content.when_to_use) || text(content.skill_tested)],
      ["Economic intuition", text(object.intuition) || text(content.intuition)],
      ["Worked example", text(content.mini_example) || text(content.solution)],
      ["Common mistake", text(object.common_mistake) || text(content.common_mistake) || text(content.trap)],
      ["Interview version", text(content.interview_version) || (content.question_type === "technical_interview" ? text(content.model_answer) : "")],
      ["Pattern to remember", text(object.pattern_to_remember) || text(content.key_principle)]
    ];
    if (isHistorical) return [
      ["What Happened?", answer || text(content.what_happened)],
      ["Historical Context", text(content.context)],
      ["Causal Mechanics", text(content.why) || text(object.intuition) || text(content.intuition)],
      ["Key Facts", joined(content.facts)],
      ["Market / Financial Impact", text(content.market_impact)],
      ["Why It Matters Today", text(object.why_it_matters) || text(content.why_it_matters)],
      ["Common Trap", text(object.common_mistake) || text(content.common_mistake) || text(content.trap)],
      ["Pattern to Remember", text(object.pattern_to_remember) || text(content.key_principle) || text(content.pattern_to_remember)]
    ];
    if (isTrade) return [
      ["Canonical Take", answer || text(object.explanation) || text(content.model_answer)],
      ["Deal / Position Context", text(content.context)],
      ["Key Facts", joined(content.facts)],
      ["Core Mechanism", text(object.intuition) || text(content.intuition)],
      ["Catalyst", text(content.catalyst)],
      ["Position / Deal Construction", text(content.position_construction) || text(content.structure)],
      ["Outcome", text(content.outcome)],
      ["Risk / Common Trap", text(object.common_mistake) || text(content.common_mistake) || text(content.trap)],
      ["What Could Change the View", text(content.counterfactual) || text(content.what_should_change_your_mind)],
      ["Why It Matters", text(object.why_it_matters) || text(content.why_it_matters)],
      ["Pattern to Remember", text(object.pattern_to_remember) || text(content.key_principle)]
    ];
    return [
      ["Answer", answer],
      ["Explanation", text(object.explanation) || text(content.explanation) || text(content.solution)],
      ["Intuition", text(object.intuition) || text(content.intuition)],
      ["Key Facts", joined(content.facts)],
      ["Common mistake", text(object.common_mistake) || text(content.common_mistake) || text(content.trap)],
      ["Why this matters", text(object.why_it_matters) || text(content.why_it_matters)],
      ["Pattern to remember", text(object.pattern_to_remember) || text(content.key_principle) || text(content.pattern_to_remember)]
    ];
  }, [answer, content, isFormula, isHistorical, isTrade, object]);

  const openAI = () => {
    const context = [object.title, object.category, object.topic, prompt].filter(Boolean).join(" | ");
    const aiPrompt = `Knowledge Vault context: ${context}. Explain this using the canonical object as the source of truth. Do not overwrite or invent the validated answer. Offer: explain simply, explain technically, interview follow-up, another example, challenge the answer, connect to a real deal, or quiz me.`;
    window.location.assign(`/advanced?kvObject=${encodeURIComponent(object.id || object.source_record_key || "")}&prompt=${encodeURIComponent(aiPrompt)}`);
  };

  return <article className={`kv-object-renderer ${compact ? "compact" : ""}`}>
    <div className="kv-object-meta"><span>{object.universe || "Knowledge Vault"}</span><span>{object.category || "Finance"}</span><span>Difficulty {object.difficulty || 5}/10</span>{object.source_kind === "source_grounded" ? <button onClick={() => setSourceOpen(true)}>✓ Verified Source</button> : <span className="authored">Capital Forge Authored</span>}</div>
    {isHistorical && <div className="kv-object-date"><b>{object.event_date || historicalLabel(content)}</b><span>{text(content.geography)}</span><span>{text(content.subtopic)}</span></div>}
    {isTrade && <div className="kv-object-date"><b>{text(content.topic) || "Trade / Deal"}</b><span>{historicalLabel(content)}</span><span>{text(content.geography)}</span><span>{text(content.subtopic)}</span></div>}
    <h1>{object.title}</h1>
    <div className="kv-object-prompt"><small>{object.question_type || object.content_type || "Learning Object"}</small><p>{prompt}</p></div>
    <div className="kv-object-sections">{sections.filter(([, value]) => value).map(([label, value]) => <section key={label}><h3>{label}</h3><p>{value}</p></section>)}</div>
    {list(content.expected_points).length > 0 && <section className="kv-related-inline"><h3>What a strong answer should cover</h3><div>{list(content.expected_points).map((x: any) => <span key={String(x)}>{String(x)}</span>)}</div></section>}
    {list(content.related_formulas).length > 0 && <section className="kv-related-inline"><h3>Related formulas</h3><div>{list(content.related_formulas).map((x: any) => <span key={String(x)}>{String(x)}</span>)}</div></section>}
    <div className="kv-object-actions"><button onClick={openAI}>✦ Ask AI</button><button onClick={() => window.location.assign(`/practice?topic=${encodeURIComponent(object.topic || object.category || "")}`)}>Practice This →</button><button onClick={() => window.location.assign(`/advanced?topic=${encodeURIComponent(object.topic || object.category || "")}`)}>Go Deeper →</button><button onClick={() => window.location.assign(`/interview?topic=${encodeURIComponent(object.topic || object.category || "")}`)}>Interview Me On This →</button></div>
    {sourceOpen && <div className="kv-source-overlay" onClick={() => setSourceOpen(false)}><aside onClick={(e) => e.stopPropagation()}><div className="kv-source-head"><div><small>Knowledge Vault</small><h2>Verified Source</h2></div><button onClick={() => setSourceOpen(false)}>×</button></div>{canonicalSources.length ? canonicalSources.map((s, i) => <section key={s.id || `${s.url || "source"}-${i}`}><b>{s.publisher || "Primary Source"}</b><h3>{s.title || "Source document"}</h3><dl><div><dt>Document Type</dt><dd>{s.source_type || "Primary source"}</dd></div><div><dt>Date</dt><dd>{s.document_date || "—"}</dd></div><div><dt>Authority Tier</dt><dd>{s.authority_tier ? `Tier ${s.authority_tier}` : "—"}</dd></div><div><dt>Relevant Fact / Section</dt><dd>{s.notes || object.source_metadata?.source_fact_or_section_used || "Canonical source linked to this object."}</dd></div></dl>{s.url && <a href={s.url} target="_blank" rel="noreferrer">View Source ↗</a>}</section>) : <p>Source-grounded object, but no external source metadata is available for this record.</p>}</aside></div>}
  </article>;
}
