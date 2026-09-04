"use client";

import { useEffect, useMemo, useState } from "react";

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

const navTabs = ["Home","Practice","Advanced","Dashboard","Feedback","Interview Room","API"];
const navIcons: Record<string,string> = {Home:"⌂",Practice:"▣",Advanced:"▥",Dashboard:"▦",Feedback:"▱","Interview Room":"▻",API:"⌘"};
const ranges: RangeKey[] = ["Last 7 Days","Last 30 Days","Last 90 Days","This Month","Previous Month","This Quarter","Year to Date","All Time"];

const seedFeedback: FeedbackItem[] = [
  {
    id:"fb-lbo-1",title:"LBO Modeling – Full Case",type:"Advanced",topic:"Financial Modeling",difficulty:"Advanced",score:85,dateLabel:"Sep 4, 2026 • 2:30 PM",timestamp:1788532200000,icon:"▤",saved:true,
    strengths:["Entry-to-exit structure was logically sequenced.","You linked leverage and exit assumptions to sponsor returns."],
    weaknesses:["Debt paydown logic was not fully reconciled to cash generation.","IRR sensitivity discussion was too narrow."],
    missing:["Minimum cash mechanics","Mandatory amortization bridge","Exit multiple downside cross-check"],
    recommendation:"Rebuild the debt schedule with explicit cash sweep mechanics, then rerun the case at -1.0x exit multiple and +100 bps interest cost.",
    modelApproach:"Start from sources & uses, bridge EBITDA to FCF, build debt tranches with mandatory and optional paydown, then calculate exit equity value and sponsor IRR/MOIC under base/downside/upside cases.",
    originalAnswer:"I assumed 5.0x leverage, 10.0x entry and exit multiple, and focused mainly on EBITDA growth and deleveraging as return drivers.",
    rubric:[{dimension:"Technical Accuracy",score:88,weight:35,evidence:"Core LBO mechanics were correct."},{dimension:"Completeness",score:78,weight:20,evidence:"Debt schedule detail was incomplete."},{dimension:"Logic / Reasoning",score:87,weight:15,evidence:"Return drivers were connected well."},{dimension:"Structure",score:90,weight:10,evidence:"Answer followed a clear sequence."},{dimension:"Financial Terminology",score:86,weight:10,evidence:"Terminology was precise."},{dimension:"Interview Effectiveness",score:82,weight:10,evidence:"Good conclusion, but downside framing could be sharper."}]
  },
  {
    id:"fb-dcf-1",title:"Explain DCF Assumptions",type:"Practice",topic:"Valuation & Assumptions",difficulty:"Intermediate",score:78,dateLabel:"Sep 4, 2026 • 11:20 AM",timestamp:1788492000000,icon:"▥",
    strengths:["You covered WACC, terminal value and forecast assumptions."],weaknesses:["Working-capital logic was generic.","You did not explain how assumptions should be triangulated."],missing:["Terminal-value cross-check","Sensitivity framework"],recommendation:"Practice one DCF assumption question with explicit evidence for every major driver.",modelApproach:"Separate operating assumptions, discount-rate assumptions and terminal-value assumptions; explain source, reasonableness, sensitivity and cross-check for each.",originalAnswer:"The main assumptions are revenue growth, margins, WACC and terminal value.",rubric:[{dimension:"Technical Accuracy",score:82,weight:35,evidence:"Core assumptions were identified."},{dimension:"Completeness",score:70,weight:20,evidence:"Several cross-checks were omitted."},{dimension:"Logic / Reasoning",score:76,weight:15,evidence:"Reasoning was directionally sound."},{dimension:"Structure",score:82,weight:10,evidence:"Answer was organized."},{dimension:"Financial Terminology",score:84,weight:10,evidence:"Terms were used correctly."},{dimension:"Interview Effectiveness",score:74,weight:10,evidence:"Needed more evidence and specificity."}]
  },
  {
    id:"fb-pe-mock",title:"Mock Interview – Private Equity",type:"Interview",topic:"Structured Thinking",difficulty:"VP",score:88,dateLabel:"Sep 3, 2026 • 6:10 PM",timestamp:1788439200000,icon:"▻",
    strengths:["Conclusion-first answers were strong.","Commercial judgment improved under follow-up pressure."],weaknesses:["Two answers became too long after interruption."],missing:["Sharper downside case","One quantified risk"],recommendation:"Run a 10-minute pressure drill with 45-second answer caps.",modelApproach:"Lead with conclusion, support with 2–3 quantified drivers, then state the biggest risk and what would change your view.",originalAnswer:"I would invest because the company has strong margins and the market is growing.",rubric:[{dimension:"Technical Accuracy",score:90,weight:25,evidence:"Technical content was strong."},{dimension:"Answer Structure",score:91,weight:20,evidence:"Most answers were conclusion-first."},{dimension:"Conciseness",score:78,weight:15,evidence:"Some follow-ups became long."},{dimension:"Commercial Judgment",score:92,weight:20,evidence:"Good prioritization of value drivers."},{dimension:"Pressure Response",score:86,weight:10,evidence:"Handled interruptions well."},{dimension:"Seniority Fit",score:88,weight:10,evidence:"Answer quality was associate-ready."}]
  },
  {
    id:"fb-ma-pharma",title:"M&A Case – Pharma Sector",type:"Advanced",topic:"M&A",difficulty:"Advanced",score:72,dateLabel:"Sep 2, 2026 • 4:45 PM",timestamp:1788347700000,icon:"▤",
    strengths:["Strategic rationale was clear."],weaknesses:["Synergy build lacked timing and probability weighting.","Financing impact was underdeveloped."],missing:["Accretion/dilution bridge","Integration risk"],recommendation:"Redo the case with explicit synergy ramp, financing mix and EPS bridge.",modelApproach:"Start with strategic fit, quantify standalone valuation, build synergies by year, layer financing and purchase accounting, then test accretion/dilution and downside integration risk.",originalAnswer:"The deal makes sense because the target adds a new therapy area and there are cost synergies.",rubric:[{dimension:"Strategic Logic",score:84,weight:20,evidence:"Strategic fit was well explained."},{dimension:"Valuation",score:71,weight:20,evidence:"Valuation logic was adequate."},{dimension:"Deal Structure",score:66,weight:15,evidence:"Financing mix was weak."},{dimension:"Synergies",score:68,weight:15,evidence:"Synergy ramp lacked detail."},{dimension:"Risks",score:70,weight:15,evidence:"Integration risk needed more depth."},{dimension:"Communication",score:75,weight:15,evidence:"Answer remained understandable."}]
  },
  {
    id:"fb-behavioral",title:"Behavioral Question Practice",type:"Interview",topic:"Communication",difficulty:"Associate",score:80,dateLabel:"Sep 2, 2026 • 11:05 AM",timestamp:1788327300000,icon:"◌",
    strengths:["Story had a clear problem-action-result arc."],weaknesses:["The result was not quantified.","Opening context took too long."],missing:["Quantified outcome"],recommendation:"Rewrite the story into a 75-second STAR answer with one measurable result.",modelApproach:"Give 10–15 seconds of context, 40 seconds on actions, 15 seconds on quantified result and learning.",originalAnswer:"During a project, our team had a deadline issue and I coordinated with everyone to finish it.",rubric:[{dimension:"Structure",score:86,weight:25,evidence:"STAR shape was visible."},{dimension:"Conciseness",score:72,weight:20,evidence:"Opening context was too long."},{dimension:"Specificity",score:76,weight:20,evidence:"Actions were clear but result was vague."},{dimension:"Communication",score:84,weight:20,evidence:"Delivery was easy to follow."},{dimension:"Seniority Fit",score:81,weight:15,evidence:"Good base story with room to sharpen impact."}]
  }
];

const improvementAreas = [
  {name:"Financial Modeling",priority:62,tone:"red"},
  {name:"Valuation & Assumptions",priority:54,tone:"red"},
  {name:"Structured Thinking",priority:48,tone:"amber"},
  {name:"Communication",priority:42,tone:"amber"},
  {name:"Market Knowledge",priority:38,tone:"gray"}
];

function routeTo(tab:string){
  if(tab==="Dashboard") window.location.assign("/dashboard");
  else if(tab==="Feedback") window.location.assign("/feedback");
  else window.location.assign(`/?open=${encodeURIComponent(tab)}`);
}

function scoreTone(score:number){ return score>=75?"green":score>=60?"amber":"red"; }

export default function FeedbackPage(){
  const [range,setRange]=useState<RangeKey>("Last 30 Days");
  const [activeTab,setActiveTab]=useState<TabKey>("All Feedback");
  const [contentType,setContentType]=useState("All");
  const [topic,setTopic]=useState("All");
  const [difficulty,setDifficulty]=useState("All");
  const [scoreRange,setScoreRange]=useState("All");
  const [localRange,setLocalRange]=useState("Last 30 Days");
  const [sort,setSort]=useState("Most Recent");
  const [items,setItems]=useState<FeedbackItem[]>(seedFeedback);
  const [visibleCount,setVisibleCount]=useState(5);
  const [detail,setDetail]=useState<FeedbackItem|null>(null);
  const [aiOpen,setAiOpen]=useState(false);
  const [aiText,setAiText]=useState("");
  const [aiBusy,setAiBusy]=useState(false);

  useEffect(()=>{
    try{
      const raw=localStorage.getItem("capital-forge-feedback-v1");
      if(raw){ const parsed=JSON.parse(raw); if(Array.isArray(parsed)&&parsed.length) setItems(parsed); }
    }catch{}
  },[]);

  useEffect(()=>{ try{ localStorage.setItem("capital-forge-feedback-v1",JSON.stringify(items)); }catch{} },[items]);

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
  const sessionCount=items.length?24:0;
  const avg=Math.round(items.reduce((s,x)=>s+x.score,0)/Math.max(items.length,1));
  const breakdown={excellent:items.filter(x=>x.score>=85).length,good:items.filter(x=>x.score>=70&&x.score<85).length,needs:items.filter(x=>x.score>=50&&x.score<70).length,poor:items.filter(x=>x.score<50).length};
  const totalBreak=Math.max(1,breakdown.excellent+breakdown.good+breakdown.needs+breakdown.poor);

  function clearFilters(){setContentType("All");setTopic("All");setDifficulty("All");setScoreRange("All");setLocalRange("Last 30 Days");}
  function toggleSaved(id:string){setItems(current=>current.map(x=>x.id===id?{...x,saved:!x.saved}:x));}
  function practiceWeak(){localStorage.setItem("capital-forge-focus-practice-v1",JSON.stringify({topic:improvementAreas[0].name,source:"feedback-weak-area",adaptive:true,count:10,createdAt:new Date().toISOString()}));routeTo("Practice");}
  async function askAI(){
    setAiOpen(true);setAiBusy(true);setAiText("");
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
      <button className="feedback-ai" onClick={askAI}>✦ AI Assistant</button><button className="feedback-bell">♧</button><div className="feedback-profile"><div className="feedback-avatar">DC</div><div><b>Deepak</b><small>Pro Plan</small></div><span>⌄</span></div>
    </header>

    <aside className="feedback-sidebar"><nav>{navTabs.map(tab=><button key={tab} className={tab==="Feedback"?"active":""} onClick={()=>tab!=="Feedback"&&routeTo(tab)}><span>{navIcons[tab]}</span>{tab}</button>)}</nav><div className="feedback-upgrade"><h3>👑 Upgrade to Pro</h3><p>Get detailed AI feedback, mock interviews and more.</p><button>Upgrade Now →</button></div><div className="feedback-version">Capital Forge v1.4.0<br/>Built for your better tomorrow.</div></aside>

    <main className="feedback-workspace"><div className="feedback-page-grid">
      <section className="feedback-main">
        <div className="feedback-title-row"><div><div className="feedback-breadcrumb"><span>Feedback</span><b>›</b><em>Overview</em></div><h1>Your Feedback</h1><p>Detailed AI feedback to help you improve faster. Learn from your strengths, fix your gaps, and track your progress.</p></div><select value={range} onChange={e=>setRange(e.target.value as RangeKey)}>{ranges.map(r=><option key={r}>{r}</option>)}</select></div>
        <div className="feedback-kpis"><FeedbackKpi icon="◌" tone="blue" value={String(sessionCount)} label="Sessions Completed" trend="↑ 33%"/><FeedbackKpi icon="◎" tone="red" value="7" label="Key Improvement Areas" trend="↓ 2"/><FeedbackKpi icon="★" tone="green" value={`${avg||82}%`} label="Average Score" trend="↑ 12 pts"/><FeedbackKpi icon="▥" tone="purple" value="4.6/5" label="AI Feedback Rating" trend="↑ 0.4"/></div>
        <div className="feedback-tabs">{(["All Feedback","Practice","Advanced","Mock Interviews","Assignments","Saved"] as TabKey[]).map(t=><button key={t} className={activeTab===t?"active":""} onClick={()=>{setActiveTab(t);setVisibleCount(5)}}>{t}</button>)}</div>
        <div className="feedback-content-grid">
          <aside className="feedback-filter-card"><h3>Filter Feedback</h3><FilterSelect label="Content Type" value={contentType} onChange={setContentType} options={["All","Practice","Advanced","Interview","Assignment"]}/><FilterSelect label="Topic" value={topic} onChange={setTopic} options={["All","Financial Modeling","Valuation & Assumptions","M&A","Structured Thinking","Communication","Market Knowledge"]}/><FilterSelect label="Difficulty" value={difficulty} onChange={setDifficulty} options={["All","Intermediate","Advanced","Associate","VP"]}/><FilterSelect label="Score Range" value={scoreRange} onChange={setScoreRange} options={["All","90–100%","80–89%","70–79%","60–69%","Below 60%"]}/><FilterSelect label="Date Range" value={localRange} onChange={setLocalRange} options={["Last 7 Days","Last 30 Days","Last 90 Days","All Time"]}/><button className="feedback-clear" onClick={clearFilters}>↻ Clear Filters</button></aside>
          <section className="feedback-recent-card"><div className="feedback-recent-head"><div><h3>Recent Feedback</h3><p>Review your latest feedback and take action.</p></div><select value={sort} onChange={e=>setSort(e.target.value)}><option>Most Recent</option><option>Oldest</option><option>Highest Score</option><option>Lowest Score</option><option>Saved First</option></select></div><div className="feedback-list">{shown.length?shown.map(item=><article key={item.id} className="feedback-row"><div className={`feedback-item-icon ${item.type.toLowerCase()}`}>{item.icon}</div><div className="feedback-item-main"><h4>{item.title}</h4><div><span className={`feedback-pill ${item.type.toLowerCase()}`}>{item.type}</span><small>{item.dateLabel}</small></div></div><div className="feedback-score"><span>Score</span><b className={scoreTone(item.score)}>{item.score}%</b></div><div className="feedback-row-actions"><button onClick={()=>setDetail(item)}>View Feedback →</button><button className={item.saved?"saved":""} onClick={()=>toggleSaved(item.id)}>{item.saved?"★":"☆"}</button></div></article>):<div className="feedback-empty"><b>No feedback matches these filters.</b><button onClick={clearFilters}>Clear Filters</button></div>}</div>{filtered.length>shown.length&&<button className="feedback-load" onClick={()=>setVisibleCount(v=>v+5)}>↓ Load More Feedback</button>}</section>
        </div>
      </section>

      <aside className="feedback-rail">
        <section className="feedback-rail-card trend-card"><div className="feedback-card-head"><h3>Performance Trend</h3><button>View Details →</button></div><PerformanceTrend/></section>
        <section className="feedback-rail-card breakdown-card"><div className="feedback-card-head"><h3>Feedback Breakdown</h3></div><div className="feedback-breakdown"><div className="feedback-breakdown-donut"><div><b>{sessionCount}</b><span>Sessions</span></div></div><div className="feedback-breakdown-list"><BreakdownRow tone="green" label={`Excellent (${breakdown.excellent||8})`} value={`${Math.round(((breakdown.excellent||8)/24)*100)}%`}/><BreakdownRow tone="blue" label={`Good (${breakdown.good||10})`} value={`${Math.round(((breakdown.good||10)/24)*100)}%`}/><BreakdownRow tone="amber" label={`Needs Improvement (${breakdown.needs||4})`} value={`${Math.round(((breakdown.needs||4)/24)*100)}%`}/><BreakdownRow tone="red" label={`Poor (${breakdown.poor||2})`} value={`${Math.round(((breakdown.poor||2)/24)*100)}%`}/></div></div></section>
        <section className="feedback-rail-card improvement-card"><div className="feedback-card-head"><h3>Top Improvement Areas</h3><button>View All →</button></div><div className="feedback-improvement-list">{improvementAreas.map((x,i)=><button key={x.name} onClick={()=>{localStorage.setItem("capital-forge-focus-practice-v1",JSON.stringify({topic:x.name,source:"feedback",adaptive:true,count:10}));routeTo("Practice")}}><span className="rank">{i+1}</span><b>{x.name}</b><i><em className={x.tone} style={{width:`${x.priority}%`}}/></i><strong>{x.priority}%</strong></button>)}</div></section>
        <section className="feedback-rail-card quick-card"><h3>Quick Actions</h3><div className="feedback-quick-grid"><button onClick={()=>setDetail(items[0]||null)}><span className="blue">●●●</span><small>Review Latest<br/>Feedback</small></button><button onClick={practiceWeak}><span className="red">◎</span><small>Practice<br/>Weak Areas</small></button><button onClick={askAI}><span className="green">▥</span><small>Ask AI for<br/>Guidance</small></button><button onClick={downloadReport}><span className="purple">⇩</span><small>Download<br/>Reports</small></button></div></section>
      </aside>
    </div></main>

    {detail&&<FeedbackDetail item={detail} onClose={()=>setDetail(null)} onPractice={()=>{localStorage.setItem("capital-forge-focus-practice-v1",JSON.stringify({topic:detail.topic,source:"feedback-detail",adaptive:true,count:10}));routeTo("Practice")}} onSave={()=>toggleSaved(detail.id)}/>} 
    {aiOpen&&<div className="feedback-modal-backdrop" onMouseDown={()=>setAiOpen(false)}><section className="feedback-ai-modal" onMouseDown={e=>e.stopPropagation()}><div className="feedback-modal-head"><div><span>AI Feedback Coach</span><h2>Guidance from your recent evidence</h2></div><button onClick={()=>setAiOpen(false)}>×</button></div><div className="feedback-ai-output">{aiBusy?"Analyzing your recent feedback…":aiText}</div><div className="feedback-modal-actions"><button onClick={practiceWeak}>Practice Highest-Priority Weakness</button><button className="secondary" onClick={()=>setAiOpen(false)}>Close</button></div></section></div>}
  </div>;
}

function FeedbackKpi({icon,tone,value,label,trend}:{icon:string;tone:string;value:string;label:string;trend:string}){return <section className="feedback-kpi"><div className={`feedback-kpi-icon ${tone}`}>{icon}</div><div className="feedback-kpi-copy"><b>{value}</b><span>{label}</span></div><div className="feedback-kpi-trend"><strong>{trend}</strong><small>vs. previous period</small></div></section>}
function FilterSelect({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:string[]}){return <label className="feedback-filter"><span>{label}<b>⌄</b></span><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o}>{o}</option>)}</select></label>}
function BreakdownRow({tone,label,value}:{tone:string;label:string;value:string}){return <div><i className={tone}/><span>{label}</span><b>{value}</b></div>}
function PerformanceTrend(){const values=[27,44,46,54,52,64,53,58,63,70,76];const pts=values.map((v,i)=>`${8+i*30},${124-v}`).join(" ");return <div className="feedback-trend-wrap"><svg viewBox="0 0 320 132" role="img" aria-label="Performance trend"><defs><linearGradient id="feedbackArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0875FA" stopOpacity=".24"/><stop offset="100%" stopColor="#0875FA" stopOpacity=".02"/></linearGradient></defs>{[20,45,70,95].map(y=><line key={y} x1="8" x2="308" y1={y} y2={y} stroke="#E9EEF5" strokeWidth="1"/>)}<polygon points={`8,124 ${pts} 308,124`} fill="url(#feedbackArea)"/><polyline points={pts} fill="none" stroke="#0875FA" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>{values.map((v,i)=><circle key={i} cx={8+i*30} cy={124-v} r="3.5" fill="#0875FA" stroke="#fff" strokeWidth="1.5"><title>{v}%</title></circle>)}</svg><div className="feedback-trend-labels"><span>Aug 5</span><span>Aug 12</span><span>Aug 19</span><span>Aug 26</span><span>Sep 2</span></div></div>}

function FeedbackDetail({item,onClose,onPractice,onSave}:{item:FeedbackItem;onClose:()=>void;onPractice:()=>void;onSave:()=>void}){return <div className="feedback-modal-backdrop" onMouseDown={onClose}><section className="feedback-detail-modal" onMouseDown={e=>e.stopPropagation()}><div className="feedback-modal-head"><div><span>{item.type} Feedback</span><h2>{item.title}</h2><p>{item.dateLabel}</p></div><button onClick={onClose}>×</button></div><div className="feedback-detail-score"><div><span>Overall Score</span><b className={scoreTone(item.score)}>{item.score}%</b></div><button onClick={onSave}>{item.saved?"★ Saved":"☆ Save"}</button></div><div className="feedback-rubric"><h3>Rubric Breakdown</h3>{item.rubric.map(r=><div key={r.dimension}><span>{r.dimension}<small>{r.weight}% weight</small></span><i><b style={{width:`${r.score}%`}}/></i><strong>{r.score}</strong><p>{r.evidence}</p></div>)}</div><div className="feedback-detail-grid"><section><h3>What you did well</h3>{item.strengths.map(x=><p key={x}>✓ {x}</p>)}</section><section><h3>What needs improvement</h3>{item.weaknesses.map(x=><p key={x}>• {x}</p>)}</section><section><h3>Missing points</h3>{item.missing.map(x=><p key={x}>• {x}</p>)}</section><section><h3>Recommended next step</h3><p>{item.recommendation}</p></section></div><section className="feedback-answer-block"><h3>Your original answer</h3><p>{item.originalAnswer}</p><h3>Improved reasoning / model approach</h3><p>{item.modelApproach}</p></section><div className="feedback-modal-actions"><button onClick={onPractice}>Practice This Weakness</button><button className="secondary" onClick={onClose}>Close</button></div></section></div>}
