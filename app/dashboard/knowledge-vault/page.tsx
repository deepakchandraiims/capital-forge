"use client";

import { useEffect, useMemo, useState } from "react";

const tabs=["Home","Knowledge Vault","Practice","Advanced","Dashboard","Feedback","Interview Room","API"];
const icons:Record<string,string>={Home:"⌂","Knowledge Vault":"◇",Practice:"▣",Advanced:"▥",Dashboard:"▦",Feedback:"▱","Interview Room":"▻",API:"⌘"};
function go(tab:string){const m:Record<string,string>={Home:"/home","Knowledge Vault":"/knowledge-vault",Practice:"/practice",Dashboard:"/dashboard",Feedback:"/feedback","Interview Room":"/interview"};window.location.assign(m[tab]||`/?open=${encodeURIComponent(tab)}`)}
function clientKey(){const k="capital-forge-kv-client-v1";let v=localStorage.getItem(k);if(!v){v=`cfkv-${crypto.randomUUID()}`;localStorage.setItem(k,v);}return v;}

type Analytics={reviewed:number;mastered:number;recallAccuracy:number;reviewDue:number;streak:number;byUniverse:any[];byCategory:any[];sessions:any[]};

export default function KnowledgeVaultDashboard(){
  const [a,setA]=useState<Analytics>({reviewed:0,mastered:0,recallAccuracy:0,reviewDue:0,streak:0,byUniverse:[],byCategory:[],sessions:[]});
  useEffect(()=>{(async()=>{const res=await fetch(`/api/knowledge-vault?action=analytics&clientKey=${encodeURIComponent(clientKey())}`,{cache:"no-store"});const data=await res.json();if(data.ok)setA(data.analytics);})();},[]);
  const strong=useMemo(()=>[...a.byCategory].sort((x,y)=>(y.accuracy||0)-(x.accuracy||0)).slice(0,5),[a.byCategory]);
  const weak=useMemo(()=>[...a.byCategory].filter(x=>x.attempts>0).sort((x,y)=>(x.accuracy||0)-(y.accuracy||0)).slice(0,5),[a.byCategory]);
  const minutes=Math.round((a.sessions||[]).reduce((n,s)=>n+Number(s.duration_seconds||0),0)/60);
  return <div className="dash-app">
    <header className="dash-header"><div className="dash-brand"><div className="dash-brand-mark">CF</div><div><b>Capital Forge</b><small>Master Finance. Build Your Future.</small></div></div><div className="dash-header-mid"><div className="dash-search"><span>⌕</span><input placeholder="Search Knowledge Vault, Practice, Advanced..."/><kbd>⌘ K</kbd></div></div><div className="dash-header-right"><button className="dash-ai" onClick={()=>go("Advanced")}>✦ AI Assistant</button><div className="dash-profile"><div className="dash-avatar">DC</div><div><b>Deepak</b><small>Capital Forge</small></div><button className="dash-caret">⌄</button></div></div></header>
    <aside className="dash-sidebar"><nav className="dash-nav">{tabs.map(tab=><button key={tab} className={tab==="Dashboard"?"active":""} onClick={()=>tab==="Dashboard"?undefined:go(tab)}><span>{icons[tab]}</span>{tab}</button>)}</nav><div className="dash-upgrade"><h3>Knowledge Vault</h3><p>Separate recall analytics for canonical CF3 learning objects.</p><button onClick={()=>go("Knowledge Vault")}>Open Vault →</button></div><div className="dash-version">Capital Forge · Knowledge Analytics</div></aside>
    <main className="dash-workspace"><div className="kv-dash-wrap">
      <div className="kv-dashboard-switch"><button onClick={()=>window.location.assign("/dashboard")}>Practice & Skills</button><button className="active">Knowledge Vault</button></div>
      <div className="kv-dash-title"><div><h1>Knowledge Vault Analytics</h1><p>Recall, mastery and review metrics remain separate from Practice & Skills performance.</p></div><button onClick={()=>window.location.assign("/knowledge-vault/quick-scan?review=1")}>Review Due ({a.reviewDue}) →</button></div>
      <div className="kv-dash-kpis"><Metric label="Reviewed" value={`${a.reviewed} / 3,000`} note="Objects seen or reviewed"/><Metric label="Mastered" value={String(a.mastered)} note="Explicit mastery state"/><Metric label="Recall Accuracy" value={`${a.recallAccuracy}%`} note="Vault ratings only"/><Metric label="Current Streak" value={`${a.streak} days`} note="Meaningful Vault activity"/><Metric label="Review Due" value={String(a.reviewDue)} note="Due now"/></div>
      <div className="kv-dash-grid"><section className="kv-dash-card wide"><div className="kv-dash-head"><h3>Progress by Universe</h3><span>Reviewed · Mastered · Accuracy</span></div><div className="kv-universe-progress">{["Technicals","Market History","Legendary Trades & Deals","Crises & Events","Finance Facts"].map(name=>{const x=a.byUniverse.find(y=>y.name===name)||{reviewed:0,mastered:0,accuracy:0};return <div key={name}><div><b>{name}</b><span>{x.reviewed} reviewed · {x.mastered} mastered · {x.accuracy}% accuracy</span></div><i><em style={{width:`${Math.min(100,(x.reviewed/600)*100)}%`}}/></i></div>})}</div></section><section className="kv-dash-card"><div className="kv-dash-head"><h3>Review Due</h3></div><div className="kv-due-grid"><b>{a.reviewDue}<small>Today</small></b><b>—<small>Tomorrow</small></b><b>—<small>Next 7 days</small></b></div><button onClick={()=>window.location.assign("/knowledge-vault/quick-scan?review=1")}>Start Review →</button></section>
      <section className="kv-dash-card"><div className="kv-dash-head"><h3>Strongest Categories</h3></div><Rank rows={strong}/></section><section className="kv-dash-card"><div className="kv-dash-head"><h3>Weakest Categories</h3></div><Rank rows={weak}/></section><section className="kv-dash-card"><div className="kv-dash-head"><h3>Learning Activity</h3></div><div className="kv-activity-kpis"><b>{a.reviewed}<small>Objects reviewed</small></b><b>{minutes}<small>Minutes studied</small></b><b>{a.mastered}<small>Mastered</small></b></div></section>
      <section className="kv-dash-card wide"><div className="kv-dash-head"><h3>Universe Mastery Heatmap</h3><span>25 categories grouped across five learning universes</span></div>{a.byCategory.length?<div className="kv-heatmap">{a.byCategory.map(x=><button key={x.name} title={`${x.reviewed} reviewed · ${x.accuracy}% accuracy`} onClick={()=>window.location.assign(`/knowledge-vault/learn?q=${encodeURIComponent(x.name)}`)}><span>{x.name}</span><b>{x.accuracy}%</b></button>)}</div>:<p className="kv-dash-empty">The heatmap will populate from actual Knowledge Vault activity after the CF3 import.</p>}</section>
      </div>
    </div></main>
  </div>;
}
function Metric({label,value,note}:{label:string;value:string;note:string}){return <section className="kv-dash-metric"><span>{label}</span><b>{value}</b><small>{note}</small></section>}
function Rank({rows}:{rows:any[]}){return <div className="kv-rank">{rows.length?rows.map((x,i)=><div key={x.name}><span>{i+1}</span><b>{x.name}</b><em>{x.accuracy}%</em></div>):<p>No measured categories yet.</p>}</div>}
