"use client";

import { useEffect, useMemo, useState } from "react";
import KnowledgeVaultShell from "./KnowledgeVaultShell";

type KnowledgeObject = { id:string; title:string; universe:string; category:string; category_slug:string; topic?:string|null; difficulty?:number|null; content_type?:string|null; estimated_time_seconds?:number|null; source_kind?:string|null; quality_score?:number|null };
type Landing = { dataset:{expected:number;categories:number;sourceGrounded:number;authored:number;unique:number;variants:number;databaseObjects:number;readyForImport:boolean}; universes:Array<{name:string;slug:string;categories:number}>; featured:KnowledgeObject[]; progress:{reviewed:number;mastered:number;learningReview:number;unseen:number;recallAccuracy:number;reviewDue:number}; recent:Array<KnowledgeObject & {progress?:any}>; activeSession?:any; goal?:any };

const universeCopy: Record<string,{tone:string;icon:string;copy:string}> = {
  "Technicals": { tone:"blue",icon:"∑",copy:"Formulas, accounting, valuation, M&A, LBO, markets and more." },
  "Market History": { tone:"green",icon:"↗",copy:"Major market events, central bank decisions and news that moved the world." },
  "Legendary Trades & Deals": { tone:"red",icon:"◆",copy:"Iconic investors, trades, M&A deals and capital market transactions." },
  "Crises & Events": { tone:"amber",icon:"!",copy:"Deep dives into financial crises, market crashes and systemic events." },
  "Finance Facts": { tone:"purple",icon:"i",copy:"Records, firsts, people, institutions, inventions and origins." }
};

function clientKey(){
  const key="capital-forge-kv-client-v1";
  let value=localStorage.getItem(key);
  if(!value){value=`cfkv-${crypto.randomUUID()}`;localStorage.setItem(key,value);}
  return value;
}
function minutes(seconds?:number|null){return Math.max(1,Math.round(Number(seconds||120)/60));}

export default function KnowledgeVaultPage(){
  const [data,setData]=useState<Landing|null>(null);
  const [search,setSearch]=useState("");
  const [rows,setRows]=useState<KnowledgeObject[]>([]);
  const [tab,setTab]=useState("Featured");
  const [loading,setLoading]=useState(true);
  const [goalChoice,setGoalChoice]=useState("50/week");

  async function load(){
    setLoading(true);
    try{const key=clientKey();const res=await fetch(`/api/knowledge-vault?action=landing&clientKey=${encodeURIComponent(key)}`,{cache:"no-store"});const json=await res.json();if(json.ok){setData(json);setRows(json.featured||[]);}}finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);
  useEffect(()=>{const timer=setTimeout(async()=>{if(!search.trim()){setRows(data?.featured||[]);return;}const res=await fetch(`/api/knowledge-vault?action=list&q=${encodeURIComponent(search)}&limit=20`,{cache:"no-store"});const json=await res.json();if(json.ok)setRows(json.objects||[]);},250);return()=>clearTimeout(timer);},[search,data]);

  const progressPct=useMemo(()=>data?Math.round((data.progress.reviewed/Math.max(1,data.dataset.expected))*100):0,[data]);
  const heroRoute=data?.activeSession?"/knowledge-vault/quick-scan?resume=1":data?.progress.reviewDue?"/knowledge-vault/quick-scan?review=1":data?.dataset.databaseObjects?"/knowledge-vault/quick-scan?count=5&today=1":"/knowledge-vault/quick-scan";
  const heroLabel=data?.activeSession?"Resume Learning →":data?.progress.reviewDue?"Review Due →":data?.dataset.databaseObjects?"Today's 5 →":"Start Quick Scan →";

  async function createGoal(){
    const [target,period]=goalChoice.split("/");
    await fetch("/api/knowledge-vault",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"goal",clientKey:clientKey(),goalType:"objects",target:Number(target),period})});
    void load();
  }

  return <KnowledgeVaultShell search={search} onSearch={setSearch}>
    <main className="kv-workspace">
      <div className="kv-layout">
        <section className="kv-main">
          <div className="kv-title-row"><div><div className="kv-crumb">Knowledge Vault <span>›</span> Explore</div><h1>Knowledge Vault</h1><p className="kv-subtitle">Technical • Markets • Trades • Crises • Facts</p><p className="kv-intro">Explore 3,000 carefully curated finance knowledge objects. Learn from real events, master key concepts, and build financial intuition.</p></div><div className="kv-dataset-strip"><div><b>3,000</b><small>Knowledge Objects</small></div><div><b>25</b><small>Categories</small></div><div><b>1,800</b><small>Source-Grounded</small></div><div><b>1,200</b><small>Authored Content</small></div></div></div>

          <section className="kv-hero"><div><h2>Real Finance Knowledge.<br/><span>Real-World Perspective.</span></h2><p>Study formulas, markets, famous trades, financial crises and more — all in one place.</p><button onClick={()=>window.location.assign(heroRoute)}>{heroLabel}</button></div><blockquote>“The more context you have,<br/>the better decisions you make.”<i/></blockquote></section>

          <div className="kv-section-head"><h2>Explore by Learning Universe</h2><button onClick={()=>window.location.assign("/knowledge-vault/learn")}>View All Categories →</button></div>
          <div className="kv-universes">{(data?.universes||[
            {name:"Technicals",slug:"technicals",categories:10},{name:"Market History",slug:"market-history",categories:4},{name:"Legendary Trades & Deals",slug:"legendary-trades-deals",categories:5},{name:"Crises & Events",slug:"crises-events",categories:4},{name:"Finance Facts",slug:"finance-facts",categories:2}
          ]).map((u)=>{const meta=universeCopy[u.name];return <button className={`kv-universe-card ${meta?.tone||"blue"}`} key={u.name} onClick={()=>window.location.assign(`/knowledge-vault/universe/${u.slug}`)}><span className="kv-universe-icon">{meta?.icon}</span><h3>{u.name}</h3><small>{u.categories} categories</small><p>{meta?.copy}</p><b>Explore →</b></button>})}</div>

          <div className="kv-discovery-head"><div>{["Featured","Recent","Popular","By Difficulty"].map(x=><button key={x} className={tab===x?"active":""} onClick={()=>setTab(x)}>{x}</button>)}</div><div className="kv-list-controls"><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search knowledge objects..."/><select><option>Sort: Recommended</option><option>Newest</option><option>Difficulty</option></select></div></div>
          <section className="kv-object-list">{loading?<div className="kv-empty">Loading Knowledge Vault…</div>:rows.length?rows.map((o)=><button className="kv-object-row" key={o.id} onClick={()=>window.location.assign(`/knowledge-vault/object/${o.id}`)}><span className="kv-row-icon">{universeCopy[o.universe]?.icon||"◇"}</span><span className="kv-row-copy"><b>{o.title}</b><small>{o.topic||o.category}</small></span><span className="kv-pill">{o.category}</span><span className="kv-difficulty">D{o.difficulty||5}</span><span className="kv-time">{minutes(o.estimated_time_seconds)} min</span><span className={o.source_kind==="source_grounded"?"kv-source source":"kv-source authored"}>{o.source_kind==="source_grounded"?"Verified":"Authored"}</span><strong>Start →</strong></button>):<div className="kv-empty"><b>Knowledge Vault infrastructure is ready.</b><p>The canonical CF3 file has not been imported yet, so no production learning objects are being fabricated. Import <code>capital_forge_3000_master.jsonl</code> when supplied.</p></div>}</section>
          <section className="kv-todays-five"><div><small>DAILY MEMORY BUILDER</small><h2>Today's 5</h2><p>One Technical, one Market History, one Trade/Deal, one Crisis/Event and one Finance Fact.</p></div><button disabled={!data?.dataset.databaseObjects} onClick={()=>window.location.assign("/knowledge-vault/quick-scan?count=5&today=1")}>Start Today's 5 →</button></section>
        </section>

        <aside className="kv-rail">
          <section className="kv-rail-card kv-progress-card"><div className="kv-card-head"><h3>Your Progress</h3><button onClick={()=>window.location.assign("/dashboard/knowledge-vault")}>View Details →</button></div><div className="kv-progress-body"><div className="kv-progress-ring" style={{background:`conic-gradient(#1477f8 0 ${progressPct}%,#e8edf4 ${progressPct}% 100%)`}}><div><b>{progressPct}%</b><small>Reviewed</small></div></div><div className="kv-progress-stats"><p><span>Reviewed</span><b>{data?.progress.reviewed||0}</b></p><p><span>Learning / Review</span><b>{data?.progress.learningReview||0}</b></p><p><span>Unseen</span><b>{data?.progress.unseen??3000}</b></p></div></div></section>
          <section className="kv-rail-card kv-streak"><div className="kv-card-head"><h3>Study Streak</h3></div><div className="kv-streak-top"><b>🔥 {data?.progress.reviewed?"Active":"0 days"}</b><span>{data?.progress.reviewed?"Keep it going!":"Start with a meaningful review."}</span></div><div className="kv-week">{["M","T","W","T","F","S","S"].map((d,i)=><span key={`${d}-${i}`}><i>{d}</i></span>)}</div></section>
          <section className="kv-rail-card"><div className="kv-card-head"><h3>Quick Learning</h3></div><div className="kv-quick-grid"><button onClick={()=>window.location.assign("/knowledge-vault/quick-scan")}>⚡<span>Quick Scan</span></button><button onClick={()=>window.location.assign("/knowledge-vault/learn")}>▤<span>Learn</span></button><button onClick={()=>window.location.assign("/knowledge-vault/saved?kind=review")}>↻<span>Review</span></button><button onClick={()=>window.location.assign("/knowledge-vault/quiz")}>✓<span>Quiz</span></button></div></section>
          <section className="kv-rail-card"><div className="kv-card-head"><h3>Recently Viewed</h3><button onClick={()=>window.location.assign("/knowledge-vault/saved?kind=recent")}>View All →</button></div><div className="kv-recent">{data?.recent?.length?data.recent.slice(0,4).map((o)=><button key={o.id} onClick={()=>window.location.assign(`/knowledge-vault/object/${o.id}`)}><span>◇</span><b>{o.title}<small>{o.category}</small></b><i>›</i></button>):<p>No objects viewed yet.</p>}</div></section>
          <section className="kv-rail-card kv-goal"><div className="kv-card-head"><h3>Knowledge Goals</h3></div>{data?.goal?<p><b>{data.goal.target}</b> {data.goal.goal_type} / {data.goal.period}</p>:<><p>Set a goal to build your financial knowledge.</p><div><select value={goalChoice} onChange={(e)=>setGoalChoice(e.target.value)}><option value="10/day">10 objects/day</option><option value="50/week">50 objects/week</option><option value="100/month">100 objects/month</option></select><button onClick={createGoal}>Create Goal →</button></div></>}</section>
          <section className="kv-rail-card kv-import-state"><div className="kv-card-head"><h3>CF3 Dataset</h3></div><p><b>{data?.dataset.databaseObjects||0}</b> / 3,000 objects imported</p><i><span style={{width:`${Math.min(100,((data?.dataset.databaseObjects||0)/3000)*100)}%`}}/></i><small>{data?.dataset.readyForImport?"READY FOR CANONICAL IMPORT":"Reconciliation complete"}</small></section>
        </aside>
      </div>
    </main>
  </KnowledgeVaultShell>;
}
