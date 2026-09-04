"use client";

import { useEffect, useMemo, useState } from "react";

type RangeKey = "Last 7 Days" | "Last 30 Days" | "Last 90 Days" | "This Month" | "Previous Month" | "This Quarter" | "Year to Date" | "All Time";
type ProgressTab = "Questions" | "Hours" | "Accuracy" | "Modules";
type Attempt = { correct?: boolean; score?: number; category?: string; createdAt?: string; title?: string };
type Goal = { target: number; current: number; type: string; studyDays: string[] };

type Activity = { icon: string; tone: string; title: string; meta: string; time: string; route: string };

const ranges: RangeKey[] = ["Last 7 Days","Last 30 Days","Last 90 Days","This Month","Previous Month","This Quarter","Year to Date","All Time"];
const scaleByRange: Record<RangeKey, number> = { "Last 7 Days":.31,"Last 30 Days":1,"Last 90 Days":2.72,"This Month":.93,"Previous Month":.87,"This Quarter":2.85,"Year to Date":6.45,"All Time":11.8 };
const tabs = ["Home","Practice","Advanced","Dashboard","Feedback","Interview Room","API"];
const icons: Record<string,string> = { Home:"⌂",Practice:"▣",Advanced:"▥",Dashboard:"▦",Feedback:"▱","Interview Room":"▻",API:"⌘" };

const masterySeed = [
  ["Financial Modeling",78],["Valuation",62],["M&A",49],["Accounting",71],["Capital Markets",56],["Private Equity",42],["Equity Research",68],["Fixed Income",38]
] as const;

const activities: Activity[] = [
  { icon:"▣",tone:"green",title:"Completed DCF Advanced Assumptions",meta:"Advanced • 5 questions • 85%",time:"2 hours ago",route:"Advanced" },
  { icon:"▤",tone:"blue",title:"Practiced M&A Valuation Questions",meta:"Practice • 10 questions • 70%",time:"4 hours ago",route:"Practice" },
  { icon:"▥",tone:"purple",title:"Finished LBO Case Study",meta:"Advanced • Case Analysis",time:"1 day ago",route:"Advanced" },
  { icon:"▻",tone:"red",title:"Interview Session – Mock PE",meta:"Interview Room • 78%",time:"1 day ago",route:"Interview Room" }
];

const weakSeed = [
  ["LBO Modeling",38,"red","▥"],["Derivatives",42,"amber","⌁"],["Debt Structuring",45,"gray","◆"],["Behavioral Questions",50,"red","♟"]
] as const;

function masteryTone(value:number){ if(value>=85)return"green"; if(value>=70)return"teal"; if(value>=55)return"blue"; if(value>=40)return"amber"; return"red"; }
function safeParse(key:string){ try{ const raw=localStorage.getItem(key); return raw?JSON.parse(raw):null; }catch{return null;} }
function go(tab:string, focus?:string){
  if(focus) localStorage.setItem("capital-forge-focus-practice-v1",JSON.stringify({topic:focus,createdAt:new Date().toISOString()}));
  window.location.assign(`/?open=${encodeURIComponent(tab)}`);
}

export default function DashboardPage(){
  const [range,setRange]=useState<RangeKey>("Last 30 Days");
  const [chartTab,setChartTab]=useState<ProgressTab>("Questions");
  const [attempts,setAttempts]=useState<Attempt[]>([]);
  const [advancedProgress,setAdvancedProgress]=useState<Record<string,number>>({});
  const [goal,setGoal]=useState<Goal>({target:20,current:15.6,type:"Hours Learned",studyDays:["Mon","Tue","Wed","Thu","Fri"]});
  const [editingGoal,setEditingGoal]=useState(false);

  useEffect(()=>{
    const stores=["capital-forge-practice-workstation-fixed-v3","capital-forge-prepmate-live-v2","capital-forge-practice-workstation-v1"];
    for(const key of stores){ const parsed=safeParse(key); if(parsed?.attempts?.length){ setAttempts(parsed.attempts); break; } }
    const ap=safeParse("capital-forge-advanced-progress-v1");
    if(ap && typeof ap==="object") setAdvancedProgress(ap);
    const savedGoal=safeParse("capital-forge-dashboard-goal-v1");
    if(savedGoal) setGoal(savedGoal);
  },[]);

  const factor=scaleByRange[range];
  const actualCorrect=attempts.filter(a=>a.correct).length;
  const questions=attempts.length?Math.max(1,Math.round(attempts.length*factor)):Math.round(232*factor);
  const accuracy=attempts.length?Math.round(actualCorrect/attempts.length*100):Math.max(54,Math.min(76,68+(range==="Last 7 Days"?3:range==="All Time"?-2:0)));
  const hours=Number((12.4*factor).toFixed(1));
  const streak=15;
  const goalPct=Math.max(0,Math.min(100,Math.round(goal.current/Math.max(goal.target,1)*100)));

  const series=useMemo(()=>Array.from({length:30},(_,i)=>{
    const pulse=(i*7+13)%29;
    const correct=10+((i*11)%23)+(i%5===0?14:0);
    const incorrect=3+((i*5)%9);
    const skipped=2+((pulse)%7);
    const day=new Date(); day.setDate(day.getDate()-(29-i));
    return {correct,incorrect,skipped,label:day.toLocaleDateString(undefined,{month:"short",day:"numeric"}),hours:Number((.25+((i*7)%13)/10).toFixed(1)),accuracy:58+((i*9)%31),modules:(i%8===0?2:i%5===0?1:0)};
  }),[]);

  const topicMastery=useMemo(()=>{
    const avgAdvanced=Object.keys(advancedProgress).length?Object.values(advancedProgress).reduce((a,b)=>a+b,0)/Math.max(1,Object.values(advancedProgress).length):0;
    return masterySeed.map(([name,value],i)=>[name,Math.max(0,Math.min(100,Math.round(value+(avgAdvanced?avgAdvanced/18:0)-(i%3))))] as const);
  },[advancedProgress]);

  function saveGoal(next:Goal){ setGoal(next); localStorage.setItem("capital-forge-dashboard-goal-v1",JSON.stringify(next)); setEditingGoal(false); }

  return <div className="dash-app">
    <header className="dash-header">
      <div className="dash-brand"><div className="dash-brand-mark">CF</div><div><b>Capital Forge</b><small>Master Finance. Build Your Future.</small></div></div>
      <div className="dash-header-mid"><div className="dash-search"><span>⌕</span><input placeholder="Search for topics, questions, or anything..."/><kbd>⌘ K</kbd></div></div>
      <div className="dash-header-right"><button className="dash-ai" onClick={()=>go("Advanced")}>✦ AI Assistant</button><button className="dash-bell">♧</button><div className="dash-profile"><div className="dash-avatar">DC</div><div><b>Deepak</b><small>Pro Plan</small></div><button className="dash-caret">⌄</button></div></div>
    </header>

    <aside className="dash-sidebar">
      <nav className="dash-nav">{tabs.map(tab=><button key={tab} className={tab==="Dashboard"?"active":""} onClick={()=>tab==="Dashboard"?undefined:go(tab)}><span>{icons[tab]}</span>{tab}</button>)}</nav>
      <div className="dash-upgrade"><h3>👑 Upgrade to Pro</h3><p>Unlock advanced cases, AI feedback and more.</p><button>Upgrade Now →</button></div>
      <div className="dash-version">Capital Forge v1.3.0<br/>Built for your better tomorrow.</div>
    </aside>

    <main className="dash-workspace">
      <div className="dash-grid">
        <section className="dash-left">
          <div className="dash-title-row"><div className="dash-title"><h1>Dashboard</h1><p>Track your progress, spot your strengths and weaknesses, and stay on target.</p></div><select className="dash-range" value={range} onChange={e=>setRange(e.target.value as RangeKey)}>{ranges.map(r=><option key={r}>{r}</option>)}</select></div>

          <div className="dash-kpis">
            <Kpi icon="▤" tone="blue" value={String(questions)} label="Questions Practiced" trend={range==="Last 30 Days"?"↑ 12%":"Period synced"}/>
            <Kpi icon="◎" tone="red" value={`${accuracy}%`} label="Accuracy Rate" trend={range==="Last 30 Days"?"↑ 5 pts":"Period synced"}/>
            <Kpi icon="◷" tone="green" value={String(hours)} label="Hours Learned" trend={range==="Last 30 Days"?"↑ 28%":"Period synced"}/>
            <Kpi icon="▥" tone="purple" value={String(streak)} label="Day Streak" trend="↑ 3 days"/>
          </div>

          <div className="dash-main-row">
            <section className="dash-card dash-progress-card">
              <div className="dash-card-head"><h3>Progress Overview</h3><div className="dash-tabs">{(["Questions","Hours","Accuracy","Modules"] as ProgressTab[]).map(t=><button key={t} className={chartTab===t?"active":""} onClick={()=>setChartTab(t)}>{t}</button>)}</div></div>
              <ProgressChart tab={chartTab} series={series}/>
            </section>
            <section className="dash-card dash-mastery-card"><div className="dash-card-head"><h3>Topic Mastery</h3><button onClick={()=>go("Advanced")}>View All →</button></div><div className="dash-mastery-list">{topicMastery.map(([name,value])=><div className="dash-mastery-row" key={name}><span>{name}</span><i className="dash-meter"><b className={masteryTone(value)} style={{width:`${value}%`}}/></i><strong>{value}%</strong></div>)}</div></section>
          </div>

          <div className="dash-second-row">
            <section className="dash-card dash-recent-card"><div className="dash-card-head"><h3>Recent Activity</h3><button>View All →</button></div><div className="dash-recent-list">{activities.map(a=><button className="dash-activity" key={a.title} onClick={()=>go(a.route)}><span className={`dash-act-icon ${a.tone}`}>{a.icon}</span><span><b>{a.title}</b><small>{a.meta}</small></span><time>{a.time}</time></button>)}</div></section>
            <section className="dash-card dash-goal-card"><div className="dash-card-head"><h3>Weekly Goal⌄</h3><button onClick={()=>setEditingGoal(true)}>Edit Goal</button></div><div className="dash-goal-body"><div className="dash-goal-ring" style={{background:`conic-gradient(#18C879 0 ${goalPct}%,rgba(255,255,255,.15) ${goalPct}% 100%)`}}><div><b>{goalPct}%</b><span>Complete</span></div></div><div className="dash-goal-numbers"><div><span>Target</span><b>{goal.target} hours</b></div><div><span>Current</span><b>{goal.current} hours</b></div></div></div><div className="dash-week">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><span key={d} className={goal.studyDays.includes(d)?"done":""}><i>{goal.studyDays.includes(d)?"✓":""}</i>{d}</span>)}</div></section>
          </div>
        </section>

        <aside className="dash-right">
          <section className="dash-card dash-study-card"><div className="dash-card-head"><h3>Study Time Breakdown</h3></div><div className="dash-study-content"><div className="dash-study-donut"><div><b>{hours}</b><span>Hours<br/>Total</span></div></div><div className="dash-study-legend"><StudyLegend tone="blue" label="Practice" value="42%"/><StudyLegend tone="purple" label="Advanced" value="28%"/><StudyLegend tone="red" label="Interview" value="15%"/><StudyLegend tone="green" label="Reading" value="10%"/><StudyLegend tone="gray" label="Other" value="5%"/></div></div></section>

          <section className="dash-card dash-type-card"><div className="dash-card-head"><h3>Performance by Question Type</h3><button>View All →</button></div><div className="dash-type-body"><div className="dash-type-legend"><span><i className="a"/>Accuracy</span><span><i className="b"/>Attempt Share</span></div><div className="dash-type-chart">{[[64,44],[38,50],[51,29],[43,75],[65,39]].map((v,i)=><div className="dash-type-group" key={i} title={`Accuracy ${v[0]}% · Attempt share ${v[1]}%`}><i className="acc" style={{height:`${v[0]*1.45}px`}}/><i className="att" style={{height:`${v[1]*1.45}px`}}/></div>)}</div><div className="dash-type-labels">{["MCQ","Short Answer","Calculation","Case Study","Interview"].map(x=><span key={x}>{x}</span>)}</div></div></section>

          <section className="dash-card dash-weak-card"><div className="dash-card-head"><h3>Weak Areas</h3><button>View All →</button></div><div className="dash-weak-list">{weakSeed.map(([name,value,tone,icon])=><div className="dash-weak-row" key={name}><span className={`dash-weak-icon ${tone}`}>{icon}</span><span><b>{name}</b><small>Accuracy: {value}%</small></span><button onClick={()=>go("Practice",name)}>Practice →</button></div>)}</div></section>
        </aside>

        <section className="dash-recommendations"><div className="dash-reco-intro"><span className="dash-reco-bulb">💡</span><div><h3>Personalized Recommendations</h3><p>Based on your recent performance, here are some topics to focus on:</p></div></div><div className="dash-reco-cards"><Recommendation icon="▥" tone="purple" title="Strengthen LBO Modeling" text="Based on recent mistakes" onClick={()=>go("Practice","LBO Modeling")}/><Recommendation icon="▣" tone="blue" title="Try More Case Studies" text="Improve real-world application" onClick={()=>go("Advanced")}/><Recommendation icon="♟" tone="blue" title="Practice Behavioral Questions" text="Prepare for interviews" onClick={()=>go("Interview Room")}/></div></section>
      </div>
    </main>

    {editingGoal&&<GoalModal goal={goal} onClose={()=>setEditingGoal(false)} onSave={saveGoal}/>} 
  </div>;
}

function Kpi({icon,tone,value,label,trend}:{icon:string;tone:string;value:string;label:string;trend:string}){return <section className="dash-kpi"><div className="dash-kpi-top"><span className={`dash-kpi-icon ${tone}`}>{icon}</span><div><div className="dash-kpi-num">{value}</div><div className="dash-kpi-label">{label}</div></div></div><div className="dash-kpi-trend"><b>{trend}</b><span>vs. previous period</span></div></section>}
function StudyLegend({tone,label,value}:{tone:string;label:string;value:string}){return <div><i className={tone}/><span>{label}</span><b>{value}</b></div>}
function Recommendation({icon,tone,title,text,onClick}:{icon:string;tone:string;title:string;text:string;onClick:()=>void}){return <button className="dash-reco" onClick={onClick}><span className={`dash-reco-icon ${tone}`}>{icon}</span><span><b>{title}</b><small>{text}</small></span><strong>›</strong></button>}

function ProgressChart({tab,series}:{tab:ProgressTab;series:Array<{correct:number;incorrect:number;skipped:number;label:string;hours:number;accuracy:number;modules:number}>}){
  if(tab==="Accuracy"){
    const pts=series.map((d,i)=>`${10+i*(500/29)},${160-d.accuracy*1.55}`).join(" ");
    return <div className="dash-chart-wrap"><svg className="dash-line-svg" viewBox="0 0 520 170" preserveAspectRatio="none"><line x1="10" y1="160" x2="510" y2="160" stroke="#DDE5EF"/><polyline fill="none" stroke="#0875FA" strokeWidth="3" points={pts}/>{series.filter((_,i)=>i%5===0).map((d,i)=><circle key={i} cx={10+(i*5)*(500/29)} cy={160-d.accuracy*1.55} r="3.5" fill="#0875FA"><title>{d.label}: {d.accuracy}%</title></circle>)}</svg><div className="dash-xlabels"><span>{series[0].label}</span><span>{series[5].label}</span><span>{series[10].label}</span><span>{series[15].label}</span><span>{series[20].label}</span><span>{series[25].label}</span><span>{series[29].label}</span></div></div>;
  }
  return <div className="dash-chart-wrap"><div className="dash-axis"><span>80</span><span>60</span><span>40</span><span>20</span><span>0</span></div><div className="dash-bars">{series.map((d,i)=><div className="dash-daybar" key={i} title={tab==="Questions"?`${d.label}: ${d.correct} correct, ${d.incorrect} incorrect, ${d.skipped} skipped`:tab==="Hours"?`${d.label}: ${d.hours} hours`:`${d.label}: ${d.modules} modules progressed`}>{tab==="Questions"?<><i className="dash-seg skipped" style={{height:`${d.skipped*1.9}px`}}/><i className="dash-seg incorrect" style={{height:`${d.incorrect*1.9}px`}}/><i className="dash-seg correct" style={{height:`${d.correct*1.9}px`}}/></>:tab==="Hours"?<i className="dash-seg hours" style={{height:`${d.hours*78}px`}}/>:<i className="dash-seg modules" style={{height:`${Math.max(3,d.modules*55)}px`}}/>}</div>)}</div><div className="dash-xlabels"><span>{series[0].label}</span><span>{series[5].label}</span><span>{series[10].label}</span><span>{series[15].label}</span><span>{series[20].label}</span><span>{series[25].label}</span><span>{series[29].label}</span></div>{tab==="Questions"&&<div className="dash-legend"><span className="correct">Correct</span><span className="incorrect">Incorrect</span><span className="skipped">Skipped</span></div>}</div>;
}

function GoalModal({goal,onClose,onSave}:{goal:Goal;onClose:()=>void;onSave:(goal:Goal)=>void}){
  const [draft,setDraft]=useState(goal);
  return <div className="dash-modal-backdrop" onMouseDown={onClose}><section className="dash-modal" onMouseDown={e=>e.stopPropagation()}><div className="dash-modal-head"><div><h2>Edit Weekly Goal</h2><p>Update future targets while keeping completed history intact.</p></div><button onClick={onClose}>×</button></div><div className="dash-goal-form"><label>Goal Type<select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})}><option>Hours Learned</option><option>Questions Practiced</option><option>Modules Completed</option><option>Cases Completed</option><option>Interview Sessions</option></select></label><label>Target Amount<input type="number" value={draft.target} onChange={e=>setDraft({...draft,target:Number(e.target.value)})}/></label><label>Current Progress<input type="number" step="0.1" value={draft.current} onChange={e=>setDraft({...draft,current:Number(e.target.value)})}/></label><button onClick={()=>onSave(draft)}>Save Goal</button></div></section></div>
}
