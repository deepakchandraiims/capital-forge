"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PRIMARY_NAV, NAV_ICONS, routeForNav } from "../navigation";
import { profileDisplayName, profileInitials, useAuthProfile } from "../AuthProvider";

type FeedbackType = "Practice" | "Advanced" | "Interview" | "Assignment";
type RangeKey = "Last 7 Days" | "Last 30 Days" | "Last 90 Days" | "This Month" | "Previous Month" | "This Quarter" | "Year to Date" | "All Time";
type FeedbackItem = {
  id: string;
  title: string;
  type: FeedbackType;
  topic: string;
  difficulty: string;
  score: number;
  dateLabel: string;
  timestamp: number;
  icon: string;
  saved?: boolean;
  strengths: string[];
  weaknesses: string[];
  missing: string[];
  recommendation: string;
  modelApproach: string;
  originalAnswer: string;
  rubric: Array<{dimension:string;score:number;weight:number;evidence:string}>;
};

type TabKey = "All Feedback" | "Practice" | "Advanced" | "Mock Interviews" | "Assignments" | "Saved";
type ImprovementArea = { name: string; priority: number; tone: "red" | "amber" | "gray" };

const tabs=PRIMARY_NAV;
const icons=NAV_ICONS;
const ranges: RangeKey[] = ["Last 7 Days","Last 30 Days","Last 90 Days","This Month","Previous Month","This Quarter","Year to Date","All Time"];
const FEEDBACK_STORE = "capital-forge-feedback-v1";

function scoreTone(score:number){ return score>=75?"green":score>=60?"amber":"red"; }

function buildImprovementAreas(items: FeedbackItem[]): ImprovementArea[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const weight = Math.max(1, item.weaknesses.length + item.missing.length);
    counts.set(item.topic || "General", (counts.get(item.topic || "General") || 0) + weight);
  }
  const rows = Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const max = Math.max(1, rows[0]?.[1] || 1);
  return rows.map(([name,count],i)=>({
    name,
    priority: Math.max(15, Math.round((count / max) * 100)),
    tone: i < 2 ? "red" : i < 4 ? "amber" : "gray"
  }));
}

export default function FeedbackPage(){
  const router=useRouter();
  const profile=useAuthProfile();
  const displayName=profileDisplayName(profile);
  const initials=profileInitials(profile);
  function routeTo(tab:string){const route=routeForNav(tab);if(route)router.push(route);}
  const [range,setRange]=useState<RangeKey>("Last 30 Days");
  const [activeTab,setActiveTab]=useState<TabKey>("All Feedback");
  const [contentType,setContentType]=useState("All");
  const [topic,setTopic]=useState("All");
  const [difficulty,setDifficulty]=useState("All");
  const [scoreRange,setScoreRange]=useState("All");
  const [localRange,setLocalRange]=useState("Last 30 Days");
  const [sort,setSort]=useState("Most Recent");
  const [items,setItems]=useState<FeedbackItem[]>([]);
  const [hydrated,setHydrated]=useState(false);
  const [visibleCount,setVisibleCount]=useState(5);
  const [detail,setDetail]=useState<FeedbackItem|null>(null);
  const [aiOpen,setAiOpen]=useState(false);
  const [aiText,setAiText]=useState("");
  const [aiBusy,setAiBusy]=useState(false);

  useEffect(()=>{
    setHydrated(false);
    setItems([]);
    try{
      const raw=localStorage.getItem(FEEDBACK_STORE);
      if(raw){
        const parsed=JSON.parse(raw);
        if(Array.isArray(parsed)) setItems(parsed);
      }
    }catch{}
    setHydrated(true);
  },[profile?.id]);

  useEffect(()=>{
    if(!hydrated || !profile?.id) return;
    try{ localStorage.setItem(FEEDBACK_STORE,JSON.stringify(items)); }catch{}
  },[items,hydrated,profile?.id]);

  const improvementAreas=useMemo(()=>buildImprovementAreas(items),[items]);

  const filtered=useMemo(()=>{
    let list=[...items];
    if(activeTab==="Practice") list=list.filter(x=>x.type==="Practice");
    if(activeTab==="Advanced") list=list.filter(x=>x.type==="Advanced");
    if(activeTab==="Mock Interviews") list=list.filter(x=>x.type==="Interview");
    if(activeTab==="Assignments") list=list.filter(x=>x.type==="Assignment");
    if(activeTab==="Saved") list=list.filter(x=>x.saved);
    if(contentType!=="All") list=list.filter(x=>x.type===contentType);
    if(topic!=="All") list=list.filter(x=>x.topic===topic);
    if(difficulty!=="All") list=list.filter(x=>x.difficulty===difficulty);
    if(scoreRange!=="All"){
      list=list.filter(x=>{
        if(scoreRange==="90–100%") return x.score>=90;
        if(scoreRange==="80–89%") return x.score>=80&&x.score<90;
        if(scoreRange==="70–79%") return x.score>=70&&x.score<80;
        if(scoreRange==="60–69%") return x.score>=60&&x.score<70;
        if(scoreRange==="Below 60%") return x.score<60;
        return true;
      });
    }
    if(sort==="Highest Score") list.sort((a,b)=>b.score-a.score);
    else if(sort==="Lowest Score") list.sort((a,b)=>a.score-b.score);
    else if(sort==="Oldest") list.sort((a,b)=>a.timestamp-b.timestamp);
    else if(sort==="Saved First") list.sort((a,b)=>Number(!!b.saved)-Number(!!a.saved)||b.timestamp-a.timestamp);
    else list.sort((a,b)=>b.timestamp-a.timestamp);
    return list;
  },[items,activeTab,contentType,topic,difficulty,scoreRange,sort,localRange,range]);

  const shown=filtered.slice(0,visibleCount);
  const sessionCount=items.length;
  const avg=items.length?Math.round(items.reduce((s,x)=>s+x.score,0)/items.length):0;
  const breakdown={excellent:items.filter(x=>x.score>=85).length,good:items.filter(x=>x.score>=70&&x.score<85).length,needs:items.filter(x=>x.score>=50&&x.score<70).length,poor:items.filter(x=>x.score<50).length};
  const totalBreak=breakdown.excellent+breakdown.good+breakdown.needs+breakdown.poor;
  const denom=Math.max(1,totalBreak);

  function clearFilters(){setContentType("All");setTopic("All");setDifficulty("All");setScoreRange("All");setLocalRange("Last 30 Days");}
  function toggleSaved(id:string){setItems(current=>current.map(x=>x.id===id?{...x,saved:!x.saved}:x));}
  function practiceWeak(){
    const area=improvementAreas[0];
    if(area){
      localStorage.setItem("capital-forge-focus-practice-v1",JSON.stringify({topic:area.name,source:"feedback-weak-area",adaptive:true,count:10,createdAt:new Date().toISOString()}));
    }
    routeTo("Practice");
  }
  async function askAI(){
    setAiOpen(true);setAiText("");
    if(!items.length){
      setAiBusy(false);
      setAiText("Complete a Practice, Advanced, Interview, or Assignment session first. Your feedback coach only uses evidence from this account.");
      return;
    }
    setAiBusy(true);
    const context={recent:items.slice(0,3).map(x=>({title:x.title,score:x.score,weaknesses:x.weaknesses})),improvementAreas:improvementAreas.slice(0,3)};
    try{
      const r=await fetch("/api/lab",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({module:"Feedback Coach",input:`Use this feedback evidence and give me the 3 highest-priority actions for the next 7 days. Be specific, evidence-based and concise. ${JSON.stringify(context)}`})});
      const data=await r.json();setAiText(data.output||data.feedback||"AI guidance returned without text output.");
    }catch{setAiText("AI guidance is unavailable right now. Check the configured AI provider in the API tab.");}
    finally{setAiBusy(false);}
  }
  function downloadReport(){
    const rows=["title,type,topic,score,date",...items.map(x=>`"${x.title.replaceAll('"','""')}",${x.type},"${x.topic}",${x.score},"${x.dateLabel}"`)];
    const blob=new Blob([rows.join("\n")],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="capital-forge-feedback-report.csv";a.click();URL.revokeObjectURL(url);
  }

  return <div className="feedback-app">
    <header className="feedback-header">
      <div className="feedback-brand"><div className="feedback-brand-mark">CF</div><div><b>Capital Forge</b><small>Master Finance. Build Your Future.</small></div></div>
      <div className="feedback-search"><span>⌕</span><input placeholder="Search for feedback, topics, questions..."/><kbd>⌘ K</kbd></div>
      <button className="feedback-ai" onClick={askAI}>✦ AI Assistant</button><button className="feedback-bell">♧</button><div className="feedback-profile"><div className="feedback-avatar">{initials}</div><div><b>{displayName}</b><small>{profile?.role==="admin"?"Administrator":"Member"}</small></div><span>⌄</span></div>
    </header>

    <aside className="feedback-sidebar"><nav>{tabs.map(tab=><button key={tab} className={tab==="Feedback"?"active":""} onClick={()=>tab!=="Feedback"&&routeTo(tab)}><span>{icons[tab]}</span>{tab}</button>)}</nav><div className="feedback-upgrade"><h3>👑 Upgrade to Pro</h3><p>Get detailed AI feedback, mock interviews and more.</p><button>Upgrade Now →</button></div><div className="feedback-version">Capital Forge v1.4.0<br/>Built for your better tomorrow.</div></aside>

    <main className="feedback-workspace"><div className="feedback-page-grid">
      <section className="feedback-main">
        <div className="feedback-title-row"><div><div className="feedback-breadcrumb"><span>Feedback</span><b>›</b><em>Overview</em></div><h1>Your Feedback</h1><p>Only feedback created by this Capital Forge account appears here.</p></div><select value={range} onChange={e=>setRange(e.target.value as RangeKey)}>{ranges.map(r=><option key={r}>{r}</option>)}</select></div>
        <div className="feedback-kpis"><FeedbackKpi icon="◌" tone="blue" value={String(sessionCount)} label="Feedback Sessions" trend={items.length?"Live":"—"}/><FeedbackKpi icon="◎" tone="red" value={String(improvementAreas.length)} label="Key Improvement Areas" trend={items.length?"Live":"—"}/><FeedbackKpi icon="★" tone="green" value={items.length?`${avg}%`:"—"} label="Average Score" trend={items.length?"Live":"—"}/><FeedbackKpi icon="▥" tone="purple" value="—" label="AI Feedback Rating" trend="—"/></div>
        <div className="feedback-tabs">{(["All Feedback","Practice","Advanced","Mock Interviews","Assignments","Saved"] as TabKey[]).map(t=><button key={t} className={activeTab===t?"active":""} onClick={()=>{setActiveTab(t);setVisibleCount(5)}}>{t}</button>)}</div>
        <div className="feedback-content-grid">
          <aside className="feedback-filter-card"><h3>Filter Feedback</h3><FilterSelect label="Content Type" value={contentType} onChange={setContentType} options={["All","Practice","Advanced","Interview","Assignment"]}/><FilterSelect label="Topic" value={topic} onChange={setTopic} options={["All",...Array.from(new Set(items.map(x=>x.topic).filter(Boolean)))]}/><FilterSelect label="Difficulty" value={difficulty} onChange={setDifficulty} options={["All",...Array.from(new Set(items.map(x=>x.difficulty).filter(Boolean)))]}/><FilterSelect label="Score Range" value={scoreRange} onChange={setScoreRange} options={["All","90–100%","80–89%","70–79%","60–69%","Below 60%"]}/><FilterSelect label="Date Range" value={localRange} onChange={setLocalRange} options={["Last 7 Days","Last 30 Days","Last 90 Days","All Time"]}/><button className="feedback-clear" onClick={clearFilters}>↻ Clear Filters</button></aside>
          <section className="feedback-recent-card"><div className="feedback-recent-head"><div><h3>Recent Feedback</h3><p>Review feedback generated from this account's sessions.</p></div><select value={sort} onChange={e=>setSort(e.target.value)}><option>Most Recent</option><option>Oldest</option><option>Highest Score</option><option>Lowest Score</option><option>Saved First</option></select></div><div className="feedback-list">{shown.length?shown.map(item=><article key={item.id} className="feedback-row"><div className={`feedback-item-icon ${item.type.toLowerCase()}`}>{item.icon}</div><div className="feedback-item-main"><h4>{item.title}</h4><div><span className={`feedback-pill ${item.type.toLowerCase()}`}>{item.type}</span><small>{item.dateLabel}</small></div></div><div className="feedback-score"><span>Score</span><b className={scoreTone(item.score)}>{item.score}%</b></div><div className="feedback-row-actions"><button onClick={()=>setDetail(item)}>View Feedback →</button><button className={item.saved?"saved":""} onClick={()=>toggleSaved(item.id)}>{item.saved?"★":"☆"}</button></div></article>):<div className="feedback-empty"><b>{items.length?"No feedback matches these filters.":"No feedback yet for this account."}</b><p>{items.length?"Change or clear the filters to see more.":"Complete a Practice, Advanced, Interview, or Assignment session to build your personal feedback history."}</p>{items.length?<button onClick={clearFilters}>Clear Filters</button>:<button onClick={()=>routeTo("Practice")}>Start Practice</button>}</div>}</div>{filtered.length>shown.length&&<button className="feedback-load" onClick={()=>setVisibleCount(v=>v+5)}>↓ Load More Feedback</button>}</section>
        </div>
      </section>

      <aside className="feedback-rail">
        <section className="feedback-rail-card trend-card"><div className="feedback-card-head"><h3>Performance Trend</h3></div><PerformanceTrend items={items}/></section>
        <section className="feedback-rail-card breakdown-card"><div className="feedback-card-head"><h3>Feedback Breakdown</h3></div><div className="feedback-breakdown"><div className="feedback-breakdown-donut"><div><b>{sessionCount}</b><span>Sessions</span></div></div><div className="feedback-breakdown-list"><BreakdownRow tone="green" label={`Excellent (${breakdown.excellent})`} value={`${Math.round((breakdown.excellent/denom)*100)}%`}/><BreakdownRow tone="blue" label={`Good (${breakdown.good})`} value={`${Math.round((breakdown.good/denom)*100)}%`}/><BreakdownRow tone="amber" label={`Needs Improvement (${breakdown.needs})`} value={`${Math.round((breakdown.needs/denom)*100)}%`}/><BreakdownRow tone="red" label={`Poor (${breakdown.poor})`} value={`${Math.round((breakdown.poor/denom)*100)}%`}/></div></div></section>
        <section className="feedback-rail-card improvement-card"><div className="feedback-card-head"><h3>Top Improvement Areas</h3></div><div className="feedback-improvement-list">{improvementAreas.length?improvementAreas.map((x,i)=><button key={x.name} onClick={()=>{localStorage.setItem("capital-forge-focus-practice-v1",JSON.stringify({topic:x.name,source:"feedback",adaptive:true,count:10}));routeTo("Practice")}}><span className="rank">{i+1}</span><b>{x.name}</b><i><em className={x.tone} style={{width:`${x.priority}%`}}/></i><strong>{x.priority}%</strong></button>):<div className="feedback-empty"><b>No improvement areas yet.</b></div>}</div></section>
        <section className="feedback-rail-card quick-card"><h3>Quick Actions</h3><div className="feedback-quick-grid"><button disabled={!items.length} onClick={()=>setDetail(items[0]||null)}><span className="blue">●●●</span><small>Review Latest<br/>Feedback</small></button><button onClick={practiceWeak}><span className="red">◎</span><small>Practice<br/>Weak Areas</small></button><button onClick={askAI}><span className="green">▥</span><small>Ask AI for<br/>Guidance</small></button><button onClick={downloadReport}><span className="purple">⇩</span><small>Download<br/>Reports</small></button></div></section>
      </aside>
    </div></main>

    {detail&&<FeedbackDetail item={detail} onClose={()=>setDetail(null)} onPractice={()=>{localStorage.setItem("capital-forge-focus-practice-v1",JSON.stringify({topic:detail.topic,source:"feedback-detail",adaptive:true,count:10}));routeTo("Practice")}} onSave={()=>toggleSaved(detail.id)}/>} 
    {aiOpen&&<div className="feedback-modal-backdrop" onMouseDown={()=>setAiOpen(false)}><section className="feedback-ai-modal" onMouseDown={e=>e.stopPropagation()}><div className="feedback-modal-head"><div><span>AI Feedback Coach</span><h2>Guidance from your account evidence</h2></div><button onClick={()=>setAiOpen(false)}>×</button></div><div className="feedback-ai-output">{aiBusy?"Analyzing your recent feedback…":aiText}</div><div className="feedback-modal-actions"><button onClick={practiceWeak}>Practice Highest-Priority Weakness</button><button className="secondary" onClick={()=>setAiOpen(false)}>Close</button></div></section></div>}
  </div>;
}

function FeedbackKpi({icon,tone,value,label,trend}:{icon:string;tone:string;value:string;label:string;trend:string}){return <section className="feedback-kpi"><div className={`feedback-kpi-icon ${tone}`}>{icon}</div><div className="feedback-kpi-copy"><b>{value}</b><span>{label}</span></div><div className="feedback-kpi-trend"><strong>{trend}</strong><small>Account data</small></div></section>}
function FilterSelect({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:string[]}){return <label className="feedback-filter"><span>{label}<b>⌄</b></span><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o}>{o}</option>)}</select></label>}
function BreakdownRow({tone,label,value}:{tone:string;label:string;value:string}){return <div><i className={tone}/><span>{label}</span><b>{value}</b></div>}
function PerformanceTrend({items}:{items:FeedbackItem[]}){
  const ordered=[...items].sort((a,b)=>a.timestamp-b.timestamp).slice(-11);
  if(!ordered.length) return <div className="feedback-empty"><b>No performance history yet.</b><p>Your chart will start with your first feedback session.</p></div>;
  const values=ordered.map(x=>Math.max(0,Math.min(100,x.score)));
  const step=values.length>1?300/(values.length-1):0;
  const pts=values.map((v,i)=>`${8+i*step},${124-v}`).join(" ");
  return <div className="feedback-trend-wrap"><svg viewBox="0 0 320 132" role="img" aria-label="Performance trend"><defs><linearGradient id="feedbackArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0875FA" stopOpacity=".24"/><stop offset="100%" stopColor="#0875FA" stopOpacity=".02"/></linearGradient></defs>{[20,45,70,95].map(y=><line key={y} x1="8" x2="308" y1={y} y2={y} stroke="#E9EEF5" strokeWidth="1"/>)}{values.length>1&&<polygon points={`8,124 ${pts} 308,124`} fill="url(#feedbackArea)"/>}<polyline points={pts} fill="none" stroke="#0875FA" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>{values.map((v,i)=><circle key={`${ordered[i].id}-${i}`} cx={8+i*step} cy={124-v} r="3.5" fill="#0875FA" stroke="#fff" strokeWidth="1.5"><title>{v}%</title></circle>)}</svg><div className="feedback-trend-labels"><span>{ordered[0]?.dateLabel||""}</span><span>{ordered[ordered.length-1]?.dateLabel||""}</span></div></div>}

function FeedbackDetail({item,onClose,onPractice,onSave}:{item:FeedbackItem;onClose:()=>void;onPractice:()=>void;onSave:()=>void}){return <div className="feedback-modal-backdrop" onMouseDown={onClose}><section className="feedback-detail-modal" onMouseDown={e=>e.stopPropagation()}><div className="feedback-modal-head"><div><span>{item.type} Feedback</span><h2>{item.title}</h2><p>{item.dateLabel}</p></div><button onClick={onClose}>×</button></div><div className="feedback-detail-score"><div><span>Overall Score</span><b className={scoreTone(item.score)}>{item.score}%</b></div><button onClick={onSave}>{item.saved?"★ Saved":"☆ Save"}</button></div><div className="feedback-rubric"><h3>Rubric Breakdown</h3>{item.rubric.length?item.rubric.map(r=><div key={r.dimension}><span>{r.dimension}<small>{r.weight}% weight</small></span><i><b style={{width:`${r.score}%`}}/></i><strong>{r.score}</strong><p>{r.evidence}</p></div>):<p>No rubric detail was stored for this feedback item.</p>}</div><div className="feedback-detail-grid"><section><h3>What you did well</h3>{item.strengths.length?item.strengths.map(x=><p key={x}>✓ {x}</p>):<p>No strengths were stored.</p>}</section><section><h3>What needs improvement</h3>{item.weaknesses.length?item.weaknesses.map(x=><p key={x}>• {x}</p>):<p>No weaknesses were stored.</p>}</section><section><h3>Missing points</h3>{item.missing.length?item.missing.map(x=><p key={x}>• {x}</p>):<p>No missing points were stored.</p>}</section><section><h3>Recommended next step</h3><p>{item.recommendation||"No recommendation was stored."}</p></section></div><section className="feedback-answer-block"><h3>Your original answer</h3><p>{item.originalAnswer||"No answer was stored."}</p><h3>Improved reasoning / model approach</h3><p>{item.modelApproach||"No model approach was stored."}</p></section><div className="feedback-modal-actions"><button onClick={onPractice}>Practice This Weakness</button><button className="secondary" onClick={onClose}>Close</button></div></section></div>}
