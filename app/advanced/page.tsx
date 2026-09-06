"use client";

import { useEffect, useMemo, useState } from "react";
import LiveDateTime from "../LiveDateTime";

const ROUTES: Record<string,string> = { Home:"/home", "Knowledge Vault":"/knowledge-vault", Practice:"/practice", Advanced:"/advanced", Dashboard:"/dashboard", Feedback:"/feedback", "Interview Room":"/interview", API:"/?open=API" };
const NAV = ["Home","Knowledge Vault","Practice","Advanced","Dashboard","Feedback","Interview Room","API"];
const ICONS: Record<string,string> = { Home:"⌂","Knowledge Vault":"◇",Practice:"▣",Advanced:"▥",Dashboard:"▦",Feedback:"▱","Interview Room":"▻",API:"⌘" };
const MODULE_ICONS = ["▣","▦","▥","◫","◕","ƒx","≋","✓","◆","⚠","↗","%","∿","△","↘","⇄","+","▲","≡","◎","S","⌂","▤","IC","★"];
const DIFF_LABEL: Record<string,string> = { A:"Advanced Analyst", B:"Senior Associate", C:"VP / Principal", D:"Director / MD", E:"GOD MODE / IC" };
const TYPES: Record<string,string> = {
  hard_technical_conceptual:"Hard Technical",
  quantitative_calculation:"Quant / Calculation",
  mini_case:"Mini Case",
  full_institutional_case:"Full Institutional Case",
  investment_transaction_judgment:"Investment Judgment",
  modeling_work_product:"Modeling / Work Product",
  vp_md_pressure_interview:"VP / MD Pressure",
  model_error_red_team_forensic:"Red Team / Forensic",
  public_deal_inspired_synthetic:"Real-Deal Inspired",
  memo_ic_executive_synthesis:"IC / Executive Synthesis"
};

type Module = { module_number:number; module:string; count:number; difficulty:Record<string,number>; content_types:Record<string,number>; progress:{opened:number;solved:number;mastered:number;attempts:number;average_score:number;completion_pct:number} };
type Obj = Record<string,any>;

function getClientKey() {
  const k = "capital-forge-advanced-client-v1";
  let v = localStorage.getItem(k);
  if (!v) { v = `adv_${crypto.randomUUID().replaceAll("-","")}`; localStorage.setItem(k,v); }
  return v;
}
function formatMoney(v:any, currency:string) { if (typeof v !== "number") return String(v ?? "—"); return new Intl.NumberFormat(undefined,{maximumFractionDigits:2}).format(v) + (currency ? ` ${currency}` : ""); }

export default function AdvancedPage() {
  const [clientKey,setClientKey] = useState("");
  const [modules,setModules] = useState<Module[]>([]);
  const [dataset,setDataset] = useState({total:0,modules:0,objects_per_module:0});
  const [moduleNo,setModuleNo] = useState(1);
  const [objects,setObjects] = useState<Obj[]>([]);
  const [page,setPage] = useState(1);
  const [pages,setPages] = useState(1);
  const [total,setTotal] = useState(0);
  const [difficulty,setDifficulty] = useState("");
  const [contentType,setContentType] = useState("");
  const [query,setQuery] = useState("");
  const [search,setSearch] = useState("");
  const [selected,setSelected] = useState<Obj|null>(null);
  const [response,setResponse] = useState("");
  const [score,setScore] = useState(80);
  const [confidence,setConfidence] = useState(3);
  const [showAnswer,setShowAnswer] = useState(false);
  const [loading,setLoading] = useState(true);
  const [objectLoading,setObjectLoading] = useState(false);
  const [notice,setNotice] = useState("");

  async function loadManifest(key=clientKey) {
    const r = await fetch(`/api/advanced?action=manifest&clientKey=${encodeURIComponent(key)}`,{cache:"no-store"});
    const j = await r.json(); if (j.ok) { setModules(j.modules||[]); setDataset(j.dataset||{}); }
  }
  async function loadList(key=clientKey) {
    if (!key) return;
    setLoading(true);
    const p = new URLSearchParams({action:"list",clientKey:key,module:String(moduleNo),page:String(page),limit:"24"});
    if (difficulty) p.set("difficulty",difficulty); if (contentType) p.set("contentType",contentType); if (query) p.set("q",query);
    const r = await fetch(`/api/advanced?${p.toString()}`,{cache:"no-store"}); const j=await r.json();
    if (j.ok) { setObjects(j.objects||[]); setPages(j.pagination?.pages||1); setTotal(j.pagination?.total||0); }
    setLoading(false);
  }
  useEffect(()=>{ const k=getClientKey(); setClientKey(k); loadManifest(k); },[]);
  useEffect(()=>{ if(clientKey) loadList(); },[clientKey,moduleNo,page,difficulty,contentType,query]);

  const activeModule = modules.find(m=>m.module_number===moduleNo);
  const overall = useMemo(()=>{
    const solved=modules.reduce((n,m)=>n+(m.progress?.solved||0),0), mastered=modules.reduce((n,m)=>n+(m.progress?.mastered||0),0), opened=modules.reduce((n,m)=>n+(m.progress?.opened||0),0);
    return {solved,mastered,opened,pct:dataset.total?Math.round(solved/dataset.total*100):0};
  },[modules,dataset.total]);

  async function openObject(id:string) {
    setObjectLoading(true); setShowAnswer(false); setNotice("");
    const r=await fetch(`/api/advanced?action=object&id=${encodeURIComponent(id)}&clientKey=${encodeURIComponent(clientKey)}`,{cache:"no-store"}); const j=await r.json();
    if(j.ok){ setSelected(j.object); setResponse(j.progress?.response_text||""); setScore(Number(j.progress?.score||80)); setConfidence(Number(j.progress?.confidence||3)); fetch("/api/advanced",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"open",clientKey,objectId:id})}).catch(()=>{}); }
    setObjectLoading(false);
  }
  async function saveResponse() {
    if(!selected) return; setNotice("Saving…");
    const r=await fetch("/api/advanced",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"save",clientKey,objectId:selected.object_id,response})}); const j=await r.json();
    setNotice(j.ok?"Response saved to your Advanced history.":j.error||"Could not save response."); if(j.ok){loadManifest();loadList();}
  }
  async function markSolved() {
    if(!selected) return; setNotice("Saving solved attempt…");
    const r=await fetch("/api/advanced",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"solve",clientKey,objectId:selected.object_id,response,score,confidence})}); const j=await r.json();
    setNotice(j.ok?`Solved attempt saved — ${score}/100.`:j.error||"Could not save attempt."); if(j.ok){loadManifest();loadList();}
  }
  function submitSearch(e:React.FormEvent){e.preventDefault();setPage(1);setQuery(search.trim());}

  return <div className="advx-app">
    <header className="advx-header">
      <button className="advx-brand" onClick={()=>location.assign("/home")}><span>CF</span><div><b>Capital Forge</b><small>Advanced Professional Workstation</small></div></button>
      <div className="advx-header-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submitSearch(e as any)}} placeholder="Search 6,250 advanced cases, models, judgments…"/><button onClick={()=>{setPage(1);setQuery(search.trim())}}>Search</button></div>
      <LiveDateTime />
    </header>
    <aside className="advx-sidebar">
      <nav>{NAV.map(n=><button key={n} className={n==="Advanced"?"active":""} onClick={()=>location.assign(ROUTES[n])}><span>{ICONS[n]}</span>{n}</button>)}</nav>
      <div className="advx-side-stat"><small>ADVANCED DATABASE</small><b>{dataset.total.toLocaleString()}</b><span>institutional objects</span><i><em style={{width:`${overall.pct}%`}}/></i><strong>{overall.pct}% solved</strong></div>
    </aside>
    <main className="advx-main">
      <section className="advx-hero">
        <div><p>CAPITAL FORGE ADVANCED</p><h1>Do the work. Make the call. Defend it.</h1><span>VP / Principal / Director / MD / Partner / IC-level finance cases built for execution and judgment — not memorization.</span></div>
        <div className="advx-hero-metrics"><div><b>{dataset.total.toLocaleString()}</b><small>Objects</small></div><div><b>{dataset.modules}</b><small>Modules</small></div><div><b>4,120</b><small>Validated Calculations</small></div><div><b>925</b><small>GOD MODE / IC</small></div></div>
      </section>

      <section className="advx-progress-strip"><div><span>Opened</span><b>{overall.opened}</b></div><div><span>Solved</span><b>{overall.solved}</b></div><div><span>Mastered</span><b>{overall.mastered}</b></div><div><span>Completion</span><b>{overall.pct}%</b></div><div className="advx-long-progress"><i><em style={{width:`${overall.pct}%`}}/></i><small>{overall.solved.toLocaleString()} / {dataset.total.toLocaleString()} solved</small></div></section>

      <section className="advx-grid">
        <div className="advx-modules-card">
          <div className="advx-section-head"><div><p>CURRICULUM</p><h2>25 Advanced Modules</h2></div><small>250 objects each</small></div>
          <div className="advx-module-list">{modules.map((m,i)=><button key={m.module_number} className={m.module_number===moduleNo?"active":""} onClick={()=>{setModuleNo(m.module_number);setPage(1);setSelected(null)}}><span className={`advx-module-icon t${(i%5)+1}`}>{MODULE_ICONS[i]}</span><div><b>{String(m.module_number).padStart(2,"0")}. {m.module}</b><small>{m.progress?.solved||0}/{m.count} solved · {m.progress?.completion_pct||0}%</small><i><em style={{width:`${m.progress?.completion_pct||0}%`}}/></i></div><strong>›</strong></button>)}</div>
        </div>

        <div className="advx-content-card">
          <div className="advx-section-head"><div><p>MODULE {String(moduleNo).padStart(2,"0")}</p><h2>{activeModule?.module||"Advanced"}</h2></div><div className="advx-module-score"><b>{activeModule?.progress?.completion_pct||0}%</b><small>complete</small></div></div>
          <div className="advx-filters"><select value={difficulty} onChange={e=>{setDifficulty(e.target.value);setPage(1)}}><option value="">All difficulty</option>{Object.keys(DIFF_LABEL).map(k=><option key={k} value={k}>{k} — {DIFF_LABEL[k]}</option>)}</select><select value={contentType} onChange={e=>{setContentType(e.target.value);setPage(1)}}><option value="">All work types</option>{Object.entries(TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>{query&&<button onClick={()=>{setQuery("");setSearch("");setPage(1)}}>Clear search ×</button>}<span>{total} results</span></div>
          {loading?<div className="advx-state">Loading institutional cases…</div>:<div className="advx-object-list">{objects.map(o=><button key={o.object_id} className="advx-object-row" onClick={()=>openObject(o.object_id)}><div className="advx-row-top"><span className={`advx-diff d${o.difficulty_band}`}>{o.difficulty_band}</span><span>{TYPES[o.content_type]||o.content_type}</span><small>{o.estimated_minutes||"—"} min</small>{o.source_kind==="public_deal_inspired"&&<em>REAL-DEAL INSPIRED</em>}{o.progress?.status&&<strong>{o.progress.status.toUpperCase()}</strong>}</div><h3>{o.subtopic||o.object_id}</h3><p>{o.prompt}</p><div className="advx-row-bottom"><span>{o.role||"Finance Professional"}</span><span>{o.geography||"Global"}</span><span>{o.professional_level}</span><b>{o.object_id} →</b></div></button>)}</div>}
          <div className="advx-pagination"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Previous</button><span>Page {page} / {pages}</span><button disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>Next →</button></div>
        </div>
      </section>
    </main>

    {(selected||objectLoading)&&<div className="advx-overlay" onMouseDown={()=>!objectLoading&&setSelected(null)}><section className="advx-workspace" onMouseDown={e=>e.stopPropagation()}>{objectLoading?<div className="advx-state">Opening case…</div>:selected&&<>
      <header className="advx-work-head"><div><p>{selected.object_id} · MODULE {String(selected.module_number).padStart(2,"0")}</p><h2>{selected.subtopic}</h2><div><span className={`advx-diff d${selected.difficulty_band}`}>{selected.difficulty_band} — {DIFF_LABEL[selected.difficulty_band]}</span><span>{TYPES[selected.content_type]||selected.content_type}</span><span>{selected.role}</span><span>{selected.estimated_minutes} min</span></div></div><button onClick={()=>setSelected(null)}>×</button></header>
      <div className="advx-work-body">
        <div className="advx-case-column">
          <section className="advx-case-block"><label>SITUATION</label><p>{selected.situation}</p></section>
          <section className="advx-case-block prompt"><label>YOUR MANDATE</label><p>{selected.prompt}</p></section>
          {selected.financial_data&&Object.keys(selected.financial_data).length>0&&<section className="advx-case-block"><label>FINANCIAL DATA</label><div className="advx-fin-grid">{Object.entries(selected.financial_data).map(([k,v])=><div key={k}><small>{k.replaceAll("_"," ")}</small><b>{typeof v==="number"?formatMoney(v,""):String(v)}</b></div>)}</div></section>}
          {Array.isArray(selected.assumptions)&&selected.assumptions.length>0&&<section className="advx-case-block"><label>ASSUMPTIONS</label><ul>{selected.assumptions.map((x:any,i:number)=><li key={i}>{String(x)}</li>)}</ul></section>}
          {Array.isArray(selected.questions)&&<section className="advx-case-block"><label>QUESTIONS / REQUIRED ANALYSIS</label><ol>{selected.questions.map((q:any,i:number)=><li key={i}>{String(q)}</li>)}</ol></section>}
          <section className="advx-response"><div><label>YOUR RESPONSE</label><small>{response.length.toLocaleString()} chars</small></div><textarea value={response} onChange={e=>setResponse(e.target.value)} placeholder="Write the recommendation first, then calculations, reasoning, risks, missing diligence and senior-level defense…"/><div className="advx-response-actions"><button onClick={saveResponse}>Save This Response</button><button className="primary" onClick={()=>setShowAnswer(true)}>Reveal Model Answer</button></div>{notice&&<p className="advx-notice">{notice}</p>}</section>
        </div>
        <aside className="advx-coach-column">
          <section><label>EXPECTED DELIVERABLE</label><p>{selected.expected_deliverable}</p></section>
          <details><summary>Hint 1 — Directional</summary><p>{selected.hint_1}</p></details><details><summary>Hint 2 — Framework</summary><p>{selected.hint_2}</p></details><details><summary>Hint 3 — Near Solution</summary><p>{selected.hint_3}</p></details>
          {Array.isArray(selected.vp_challenge)&&<section><label>VP CHALLENGE</label><ul>{selected.vp_challenge.map((x:any,i:number)=><li key={i}>{String(x)}</li>)}</ul></section>}
          {Array.isArray(selected.md_partner_followups)&&<section><label>MD / PARTNER PRESSURE</label><ol>{selected.md_partner_followups.map((x:any,i:number)=><li key={i}>{String(x)}</li>)}</ol></section>}
          {selected.source_kind==="public_deal_inspired"&&<section className="advx-source"><label>PUBLIC-DEAL INSPIRATION</label>{(selected.public_inspiration||[]).map((s:any,i:number)=><div key={i}><b>{s.public_reference}</b><small>Mechanics only — case facts are synthetic.</small>{s.source_url&&<a href={s.source_url} target="_blank" rel="noreferrer">Open public source ↗</a>}</div>)}</section>}
        </aside>
      </div>
      {showAnswer&&<div className="advx-answer-panel"><div className="advx-answer-head"><div><p>MODEL ANSWER / REVIEW MODE</p><h3>Compare your underwriting, not just the final number.</h3></div><button onClick={()=>setShowAnswer(false)}>×</button></div><div className="advx-answer-grid"><section><label>INSTITUTIONAL MODEL ANSWER</label><p>{selected.model_answer}</p>{Array.isArray(selected.calculation_steps)&&selected.calculation_steps.length>0&&<><label>CALCULATION STEPS</label><ol>{selected.calculation_steps.map((x:any,i:number)=><li key={i}>{String(x)}</li>)}</ol></>}</section><aside><label>SELF SCORE</label><input type="range" min="0" max="100" step="5" value={score} onChange={e=>setScore(Number(e.target.value))}/><b className="advx-score">{score}/100</b><label>CONFIDENCE</label><select value={confidence} onChange={e=>setConfidence(Number(e.target.value))}><option value={1}>1 — Guess</option><option value={2}>2 — Low</option><option value={3}>3 — Moderate</option><option value={4}>4 — High</option><option value={5}>5 — IC ready</option></select><button className="primary" onClick={markSolved}>Mark Solved & Save</button>{selected.rubric&&<div className="advx-rubric"><label>RUBRIC</label>{Object.entries(selected.rubric).map(([k,v])=><div key={k}><span>{k.replaceAll("_"," ")}</span><b>{String(v)}</b></div>)}</div>}</aside></div></div>}
    </>}</section></div>}
  </div>;
}
