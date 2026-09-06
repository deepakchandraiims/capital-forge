"use client";

import { useEffect, useMemo, useState } from "react";
import LiveDateTime from "../LiveDateTime";

type RangeKey = "Last 7 Days" | "Last 30 Days" | "Last 90 Days" | "This Month" | "Previous Month" | "This Quarter" | "Year to Date" | "All Time";
type ProgressTab = "Questions" | "Hours" | "Accuracy" | "Modules";
type Attempt = { id?: string; correct?: boolean | null; score?: number; category?: string; at?: string; createdAt?: string; title?: string; response?: string; savedResponse?: boolean; durationSeconds?: number; questionType?: string };
type Goal = { target: number; current: number; type: string; studyDays: string[] };
type Activity = { icon: string; tone: string; title: string; meta: string; time: string; route: string };

const ranges: RangeKey[] = ["Last 7 Days","Last 30 Days","Last 90 Days","This Month","Previous Month","This Quarter","Year to Date","All Time"];
const tabs = ["Home","Practice","Advanced","Dashboard","Feedback","Interview Room","API"];
const icons: Record<string,string> = { Home:"⌂",Practice:"▣",Advanced:"▥",Dashboard:"▦",Feedback:"▱","Interview Room":"▻",API:"⌘" };
const DEFAULT_GOAL: Goal = {target:20,current:0,type:"Hours Learned",studyDays:["Mon","Tue","Wed","Thu","Fri"]};

function masteryTone(value:number){ if(value>=85)return"green"; if(value>=70)return"teal"; if(value>=55)return"blue"; if(value>=40)return"amber"; return"red"; }
function safeParse(key:string){ try{ const raw=localStorage.getItem(key); return raw?JSON.parse(raw):null; }catch{return null;} }
function attemptTime(a:Attempt){return a.at||a.createdAt||"";}
function ago(value?:string){if(!value)return "";const diff=Math.max(0,Date.now()-new Date(value).getTime());const m=Math.floor(diff/60000);if(m<1)return"just now";if(m<60)return`${m} min ago`;const h=Math.floor(m/60);if(h<24)return`${h} hr${h===1?"":"s"} ago`;const d=Math.floor(h/24);return`${d} day${d===1?"":"s"} ago`;}
function go(tab:string, focus?:string){
  if(focus) localStorage.setItem("capital-forge-focus-practice-v1",JSON.stringify({topic:focus,createdAt:new Date().toISOString()}));
  if(tab==="Home") window.location.assign("/home");
  else if(tab==="Practice") window.location.assign("/practice");
  else if(tab==="Dashboard") window.location.assign("/dashboard");
  else if(tab==="Feedback") window.location.assign("/feedback");
  else if(tab==="Interview Room") window.location.assign("/interview");
  else window.location.assign(`/?open=${encodeURIComponent(tab)}`);
}
function rangeBounds(range:RangeKey){
  const now=new Date();
  if(range==="All Time")return {start:0,end:Infinity};
  if(range.startsWith("Last ")){const days=Number(range.split(" ")[1]);return {start:now.getTime()-days*86400000,end:Infinity};}
  if(range==="This Month")return {start:new Date(now.getFullYear(),now.getMonth(),1).getTime(),end:Infinity};
  if(range==="Previous Month")return {start:new Date(now.getFullYear(),now.getMonth()-1,1).getTime(),end:new Date(now.getFullYear(),now.getMonth(),1).getTime()-1};
  if(range==="This Quarter"){const q=Math.floor(now.getMonth()/3)*3;return {start:new Date(now.getFullYear(),q,1).getTime(),end:Infinity};}
  return {start:new Date(now.getFullYear(),0,1).getTime(),end:Infinity};
}

export default function DashboardPage(){
  const [range,setRange]=useState<RangeKey>("Last 30 Days");
  const [chartTab,setChartTab]=useState<ProgressTab>("Questions");
  const [attempts,setAttempts]=useState<Attempt[]>([]);
  const [goal,setGoal]=useState<Goal>(DEFAULT_GOAL);
  const [editingGoal,setEditingGoal]=useState(false);
  const [resetting,setResetting]=useState(false);
  const [resetNotice,setResetNotice]=useState("");

  useEffect(()=>{
    const canonical=safeParse("capital-forge-canonical-practice-v1");
    if(Array.isArray(canonical)) setAttempts(canonical);
    else {
      const stores=["capital-forge-practice-workstation-fixed-v3","capital-forge-prepmate-live-v2","capital-forge-practice-workstation-v1"];
      for(const key of stores){const parsed=safeParse(key);if(parsed?.attempts?.length){setAttempts(parsed.attempts);break;}}
    }
    const savedGoal=safeParse("capital-forge-dashboard-goal-v1");
    if(savedGoal) setGoal({...DEFAULT_GOAL,...savedGoal,current:0});
  },[]);

  const bounds=useMemo(()=>rangeBounds(range),[range]);
  const periodAttempts=useMemo(()=>attempts.filter(a=>{const t=new Date(attemptTime(a)).getTime();return Number.isFinite(t)&&t>=bounds.start&&t<=bounds.end;}),[attempts,bounds]);
  const graded=periodAttempts.filter(a=>typeof a.correct==="boolean");
  const questions=periodAttempts.length;
  const actualCorrect=graded.filter(a=>a.correct===true).length;
  const accuracy=graded.length?Math.round(actualCorrect/graded.length*100):0;
  const hours=Number((periodAttempts.reduce((n,a)=>n+Number(a.durationSeconds||0),0)/3600).toFixed(1));
  const allDays=useMemo(()=>new Set(attempts.map(a=>attemptTime(a)).filter(Boolean).map(v=>new Date(v).toDateString())),[attempts]);
  const streak=useMemo(()=>{let s=0;const d=new Date();for(let i=0;i<365;i++){if(!allDays.has(d.toDateString()))break;s++;d.setDate(d.getDate()-1);}return s;},[allDays]);

  const series=useMemo(()=>Array.from({length:30},(_,i)=>{
    const day=new Date();day.setHours(0,0,0,0);day.setDate(day.getDate()-(29-i));const next=new Date(day);next.setDate(day.getDate()+1);
    const rows=attempts.filter(a=>{const t=new Date(attemptTime(a)).getTime();return t>=day.getTime()&&t<next.getTime();});
    const g=rows.filter(a=>typeof a.correct==="boolean");const correct=g.filter(a=>a.correct===true).length;const incorrect=g.filter(a=>a.correct===false).length;
    return {correct,incorrect,skipped:Math.max(0,rows.length-g.length),label:day.toLocaleDateString(undefined,{month:"short",day:"numeric"}),hours:Number((rows.reduce((n,a)=>n+Number(a.durationSeconds||0),0)/3600).toFixed(2)),accuracy:g.length?Math.round(correct/g.length*100):0,modules:0};
  }),[attempts]);

  const topicMastery=useMemo(()=>{
    const map=new Map<string,{total:number;correct:number}>();
    for(const a of attempts){if(typeof a.correct!=="boolean")continue;const name=a.category||"Uncategorized";const x=map.get(name)||{total:0,correct:0};x.total++;if(a.correct)x.correct++;map.set(name,x);}
    return Array.from(map.entries()).map(([name,x])=>[name,Math.round(x.correct/Math.max(1,x.total)*100)] as const).sort((a,b)=>b[1]-a[1]).slice(0,8);
  },[attempts]);

  const weakAreas=useMemo(()=>[...topicMastery].sort((a,b)=>a[1]-b[1]).slice(0,4),[topicMastery]);
  const activities=useMemo<Activity[]>(()=>[...attempts].filter(a=>attemptTime(a)).sort((a,b)=>attemptTime(b).localeCompare(attemptTime(a))).slice(0,5).map(a=>({icon:a.correct===true?"✓":a.correct===false?"↻":"▣",tone:a.correct===true?"green":a.correct===false?"red":"blue",title:a.title?`Solved: ${a.title}`:"Solved a practice question",meta:`${a.category||"Practice"}${a.savedResponse?" • Response saved":""}${a.response?` • “${a.response.slice(0,70)}${a.response.length>70?"…":""}”`:""}`,time:ago(attemptTime(a)),route:"Practice"})),[attempts]);

  const typeStats=useMemo(()=>{
    const map=new Map<string,{total:number;correct:number}>();for(const a of periodAttempts){if(!a.questionType||typeof a.correct!=="boolean")continue;const x=map.get(a.questionType)||{total:0,correct:0};x.total++;if(a.correct)x.correct++;map.set(a.questionType,x);}
    return Array.from(map.entries()).sort((a,b)=>b[1].total-a[1].total).slice(0,5).map(([name,x])=>({name,accuracy:Math.round(x.correct/Math.max(1,x.total)*100),share:graded.length?Math.round(x.total/graded.length*100):0}));
  },[periodAttempts,graded.length]);

  const actualGoalCurrent=goal.type==="Questions Practiced"?questions:goal.type==="Hours Learned"?hours:0;
  const goalPct=Math.max(0,Math.min(100,Math.round(actualGoalCurrent/Math.max(goal.target,1)*100)));
  function saveGoal(next:Goal){const clean={...next,current:0};setGoal(clean);localStorage.setItem("capital-forge-dashboard-goal-v1",JSON.stringify(clean));setEditingGoal(false);}

  async function resetAllHistory(){
    if(!window.confirm("Reset ALL Capital Forge learning history? This will clear Practice, Knowledge Vault progress, saved responses, goals and learning history so every dashboard metric starts from 0."))return;
    setResetting(true);setResetNotice("");
    try{
      const key=localStorage.getItem("capital-forge-kv-client-v1");
      if(key){const r=await fetch("/api/knowledge-vault",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"resetAll",clientKey:key})});const d=await r.json();if(!d.ok)throw new Error(d.error||"Knowledge Vault reset failed.");}
      ["capital-forge-canonical-practice-v1","capital-forge-practice-bookmarks-v1","capital-forge-practice-workstation-fixed-v3","capital-forge-prepmate-live-v2","capital-forge-practice-workstation-v1","capital-forge-advanced-progress-v1","capital-forge-dashboard-goal-v1","capital-forge-focus-practice-v1"].forEach(k=>localStorage.removeItem(k));
      setAttempts([]);setGoal(DEFAULT_GOAL);setResetNotice("Reset complete — all tracked learning metrics are now 0. You can start fresh.");
    }catch(e){setResetNotice(e instanceof Error?e.message:"Reset failed.");}
    finally{setResetting(false);}
  }

  return <div className="dash-app">
    <header className="dash-header">
      <div className="dash-brand"><div className="dash-brand-mark">CF</div><div><b>Capital Forge</b><small>Master Finance. Build Your Future.</small></div></div>
      <div className="dash-header-mid"><div className="dash-search"><span>⌕</span><input placeholder="Search for topics, questions, or anything..."/><kbd>⌘ K</kbd></div></div>
      <div className="dash-header-right"><LiveDateTime compact/><button className="dash-ai" onClick={()=>go("Advanced")}>✦ AI Assistant</button><div className="dash-profile"><div className="dash-avatar">DC</div><div><b>Deepak</b><small>Capital Forge</small></div><button className="dash-caret">⌄</button></div></div>
    </header>

    <aside className="dash-sidebar">
      <nav className="dash-nav">{tabs.map(tab=><button key={tab} className={tab==="Dashboard"?"active":""} onClick={()=>tab==="Dashboard"?undefined:go(tab)}><span>{icons[tab]}</span>{tab}</button>)}</nav>
      <div className="dash-upgrade"><h3>Live Progress</h3><p>This dashboard now uses your actual solved-question timestamps, saved responses and measured study time.</p><button onClick={()=>go("Practice")}>Continue Practice →</button></div>
      <div className="dash-version">Capital Forge · Real-Time Dashboard<br/>No seeded performance metrics.</div>
    </aside>

    <main className="dash-workspace">
      <div className="dash-grid">
        <section className="dash-left">
          <div className="dash-title-row"><div className="dash-title"><h1>Dashboard</h1><p>Live progress from your real Capital Forge activity. No sample performance is added.</p>{resetNotice&&<small style={{display:"block",marginTop:6,color:resetNotice.startsWith("Reset complete")?"#138a63":"#c23b49",fontWeight:700}}>{resetNotice}</small>}</div><div style={{display:"flex",gap:8,alignItems:"center"}}><button onClick={resetAllHistory} disabled={resetting} style={{height:38,padding:"0 13px",border:"1px solid #efc5ca",borderRadius:8,background:"#fff5f6",color:"#bf3344",fontWeight:800,cursor:"pointer"}}>{resetting?"Resetting…":"Reset All History"}</button><select className="dash-range" value={range} onChange={e=>setRange(e.target.value as RangeKey)}>{ranges.map(r=><option key={r}>{r}</option>)}</select></div></div>

          <div className="dash-kpis">
            <Kpi icon="▤" tone="blue" value={String(questions)} label="Questions Solved" trend="Recorded in selected period"/>
            <Kpi icon="◎" tone="red" value={`${accuracy}%`} label="Accuracy Rate" trend={`${graded.length} graded responses`}/>
            <Kpi icon="◷" tone="green" value={String(hours)} label="Hours Learned" trend="Measured from question sessions"/>
            <Kpi icon="▥" tone="purple" value={String(streak)} label="Day Streak" trend="Consecutive real activity days"/>
          </div>

          <div className="dash-main-row">
            <section className="dash-card dash-progress-card">
              <div className="dash-card-head"><h3>Progress Overview</h3><div className="dash-tabs">{(["Questions","Hours","Accuracy","Modules"] as ProgressTab[]).map(t=><button key={t} className={chartTab===t?"active":""} onClick={()=>setChartTab(t)}>{t}</button>)}</div></div>
              <ProgressChart tab={chartTab} series={series}/>
            </section>
            <section className="dash-card dash-mastery-card"><div className="dash-card-head"><h3>Topic Mastery</h3><button onClick={()=>go("Practice")}>Practice →</button></div>{topicMastery.length?<div className="dash-mastery-list">{topicMastery.map(([name,value])=><div className="dash-mastery-row" key={name}><span>{name}</span><i className="dash-meter"><b className={masteryTone(value)} style={{width:`${value}%`}}/></i><strong>{value}%</strong></div>)}</div>:<p style={{padding:18,color:"#7a8497"}}>No measured topics yet. Solve and grade questions to populate mastery.</p>}</section>
          </div>

          <div className="dash-second-row">
            <section className="dash-card dash-recent-card"><div className="dash-card-head"><h3>Recent Activity</h3><button onClick={()=>go("Practice")}>Practice →</button></div>{activities.length?<div className="dash-recent-list">{activities.map((a,i)=><button className="dash-activity" key={`${a.title}-${i}`} onClick={()=>go(a.route)}><span className={`dash-act-icon ${a.tone}`}>{a.icon}</span><span><b>{a.title}</b><small>{a.meta}</small></span><time>{a.time}</time></button>)}</div>:<p style={{padding:18,color:"#7a8497"}}>No solved questions yet. Your first saved response will appear here immediately.</p>}</section>
            <section className="dash-card dash-goal-card"><div className="dash-card-head"><h3>Goal</h3><button onClick={()=>setEditingGoal(true)}>Edit Goal</button></div><div className="dash-goal-body"><div className="dash-goal-ring" style={{background:`conic-gradient(#18C879 0 ${goalPct}%,rgba(255,255,255,.15) ${goalPct}% 100%)`}}><div><b>{goalPct}%</b><span>Complete</span></div></div><div className="dash-goal-numbers"><div><span>Target</span><b>{goal.target} {goal.type==="Hours Learned"?"hours":"questions"}</b></div><div><span>Current</span><b>{actualGoalCurrent} {goal.type==="Hours Learned"?"hours":"questions"}</b></div></div></div><div className="dash-week">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><span key={d} className={goal.studyDays.includes(d)?"done":""}><i>{goal.studyDays.includes(d)?"✓":""}</i>{d}</span>)}</div></section>
          </div>
        </section>

        <aside className="dash-right">
          <section className="dash-card dash-study-card"><div className="dash-card-head"><h3>Study Time Breakdown</h3></div><div className="dash-study-content"><div className="dash-study-donut"><div><b>{hours}</b><span>Hours<br/>Tracked</span></div></div><div className="dash-study-legend"><StudyLegend tone="blue" label="Practice" value={hours>0?"100%":"0%"}/><StudyLegend tone="purple" label="Advanced" value="0%"/><StudyLegend tone="red" label="Interview" value="0%"/><StudyLegend tone="green" label="Reading" value="0%"/><StudyLegend tone="gray" label="Other" value="0%"/></div></div></section>

          <section className="dash-card dash-type-card"><div className="dash-card-head"><h3>Performance by Question Type</h3></div>{typeStats.length?<div className="dash-type-body"><div className="dash-type-legend"><span><i className="a"/>Accuracy</span><span><i className="b"/>Attempt Share</span></div><div className="dash-type-chart">{typeStats.map((v,i)=><div className="dash-type-group" key={v.name} title={`${v.name}: accuracy ${v.accuracy}% · share ${v.share}%`}><i className="acc" style={{height:`${v.accuracy*1.45}px`}}/><i className="att" style={{height:`${v.share*1.45}px`}}/></div>)}</div><div className="dash-type-labels">{typeStats.map(x=><span key={x.name}>{x.name.replaceAll("_"," ")}</span>)}</div></div>:<p style={{padding:18,color:"#7a8497"}}>Question-type analytics will populate from newly solved questions.</p>}</section>

          <section className="dash-card dash-weak-card"><div className="dash-card-head"><h3>Weak Areas</h3><button onClick={()=>go("Practice")}>View Practice →</button></div>{weakAreas.length?<div className="dash-weak-list">{weakAreas.map(([name,value],i)=><div className="dash-weak-row" key={name}><span className={`dash-weak-icon ${i===0?"red":"amber"}`}>◎</span><span><b>{name}</b><small>Accuracy: {value}%</small></span><button onClick={()=>go("Practice",name)}>Practice →</button></div>)}</div>:<p style={{padding:18,color:"#7a8497"}}>No weak-area data yet.</p>}</section>
        </aside>

        <section className="dash-recommendations"><div className="dash-reco-intro"><span className="dash-reco-bulb">💡</span><div><h3>Next Actions</h3><p>These links use your actual activity; no fake performance values are generated.</p></div></div><div className="dash-reco-cards"><Recommendation icon="▣" tone="blue" title={weakAreas[0]?`Practice ${weakAreas[0][0]}`:"Start your first practice set"} text={weakAreas[0]?`Current measured accuracy: ${weakAreas[0][1]}%`:"Create real dashboard data"} onClick={()=>go("Practice",weakAreas[0]?.[0])}/><Recommendation icon="◇" tone="purple" title="Open Knowledge Vault" text="Build long-term recall and saved-response history" onClick={()=>window.location.assign("/knowledge-vault")}/><Recommendation icon="♟" tone="blue" title="Practice Interview Questions" text="Add interview activity to your learning workflow" onClick={()=>go("Interview Room")}/></div></section>
      </div>
    </main>

    {editingGoal&&<GoalModal goal={{...goal,current:actualGoalCurrent}} onClose={()=>setEditingGoal(false)} onSave={saveGoal}/>} 
  </div>;
}

function Kpi({icon,tone,value,label,trend}:{icon:string;tone:string;value:string;label:string;trend:string}){return <section className="dash-kpi"><div className="dash-kpi-top"><span className={`dash-kpi-icon ${tone}`}>{icon}</span><div><div className="dash-kpi-num">{value}</div><div className="dash-kpi-label">{label}</div></div></div><div className="dash-kpi-trend"><b>{trend}</b><span>live recorded data</span></div></section>}
function StudyLegend({tone,label,value}:{tone:string;label:string;value:string}){return <div><i className={tone}/><span>{label}</span><b>{value}</b></div>}
function Recommendation({icon,tone,title,text,onClick}:{icon:string;tone:string;title:string;text:string;onClick:()=>void}){return <button className="dash-reco" onClick={onClick}><span className={`dash-reco-icon ${tone}`}>{icon}</span><span><b>{title}</b><small>{text}</small></span><strong>›</strong></button>}

function ProgressChart({tab,series}:{tab:ProgressTab;series:Array<{correct:number;incorrect:number;skipped:number;label:string;hours:number;accuracy:number;modules:number}>}){
  if(tab==="Accuracy"){
    const pts=series.map((d,i)=>`${10+i*(500/29)},${160-d.accuracy*1.55}`).join(" ");
    return <div className="dash-chart-wrap"><svg className="dash-line-svg" viewBox="0 0 520 170" preserveAspectRatio="none"><line x1="10" y1="160" x2="510" y2="160" stroke="#DDE5EF"/><polyline fill="none" stroke="#0875FA" strokeWidth="3" points={pts}/>{series.filter((_,i)=>i%5===0).map((d,i)=><circle key={i} cx={10+(i*5)*(500/29)} cy={160-d.accuracy*1.55} r="3.5" fill="#0875FA"><title>{d.label}: {d.accuracy}%</title></circle>)}</svg><div className="dash-xlabels"><span>{series[0].label}</span><span>{series[5].label}</span><span>{series[10].label}</span><span>{series[15].label}</span><span>{series[20].label}</span><span>{series[25].label}</span><span>{series[29].label}</span></div></div>;
  }
  return <div className="dash-chart-wrap"><div className="dash-axis"><span>80</span><span>60</span><span>40</span><span>20</span><span>0</span></div><div className="dash-bars">{series.map((d,i)=><div className="dash-daybar" key={i} title={tab==="Questions"?`${d.label}: ${d.correct} correct, ${d.incorrect} incorrect, ${d.skipped} saved/ungraded`:tab==="Hours"?`${d.label}: ${d.hours} hours`:`${d.label}: ${d.modules} modules progressed`}>{tab==="Questions"?<><i className="dash-seg skipped" style={{height:`${d.skipped*1.9}px`}}/><i className="dash-seg incorrect" style={{height:`${d.incorrect*1.9}px`}}/><i className="dash-seg correct" style={{height:`${d.correct*1.9}px`}}/></>:tab==="Hours"?<i className="dash-seg hours" style={{height:`${Math.min(150,d.hours*78)}px`}}/>:<i className="dash-seg modules" style={{height:`${Math.max(3,d.modules*55)}px`}}/>}</div>)}</div><div className="dash-xlabels"><span>{series[0].label}</span><span>{series[5].label}</span><span>{series[10].label}</span><span>{series[15].label}</span><span>{series[20].label}</span><span>{series[25].label}</span><span>{series[29].label}</span></div>{tab==="Questions"&&<div className="dash-legend"><span className="correct">Correct</span><span className="incorrect">Incorrect</span><span className="skipped">Saved / Ungraded</span></div>}</div>;
}

function GoalModal({goal,onClose,onSave}:{goal:Goal;onClose:()=>void;onSave:(goal:Goal)=>void}){
  const [draft,setDraft]=useState(goal);
  return <div className="dash-modal-backdrop" onMouseDown={onClose}><section className="dash-modal" onMouseDown={e=>e.stopPropagation()}><div className="dash-modal-head"><div><h2>Edit Goal</h2><p>Current progress is calculated automatically from real activity and cannot be manually inflated.</p></div><button onClick={onClose}>×</button></div><div className="dash-goal-form"><label>Goal Type<select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})}><option>Hours Learned</option><option>Questions Practiced</option></select></label><label>Target Amount<input type="number" min="1" value={draft.target} onChange={e=>setDraft({...draft,target:Number(e.target.value)})}/></label><label>Current Progress<input type="number" value={draft.current} readOnly/></label><button onClick={()=>onSave(draft)}>Save Goal</button></div></section></div>
}
