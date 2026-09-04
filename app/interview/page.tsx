"use client";

import { useEffect, useMemo, useState } from "react";

type InterviewType = "Technical" | "Behavioral" | "Case" | "Industry-Specific";
type AnswerMode = "Voice" | "Text" | "Hybrid";
type Difficulty = "Foundation" | "Easy" | "Intermediate" | "Hard" | "Advanced" | "Associate" | "VP" | "Director" | "MD / Partner / IC" | "Adaptive";
type QuestionMix = "Balanced" | "Technical Heavy" | "Behavioral Heavy" | "Case Heavy" | "Rapid Fire" | "Modeling / Valuation" | "Deal Experience" | "Commercial Judgment" | "Weak Areas";
type Session = {
  id: string;
  title: string;
  interviewType: InterviewType;
  careerTrack: string;
  duration: number;
  difficulty: Difficulty;
  questionMix: QuestionMix;
  completedAt?: string;
  createdAt: string;
  status: "CREATED" | "DEVICE_CHECK" | "READY" | "IN_PROGRESS" | "PAUSED" | "COMPLETED" | "ANALYZING" | "FEEDBACK_READY" | "ABANDONED" | "FAILED";
  overallScore?: number;
  technicalScore?: number;
  behavioralScore?: number;
  caseScore?: number;
  communicationScore?: number;
};

type InterviewSettings = {
  answerMode: AnswerMode;
  microphone: string;
  camera: "Off" | "On";
  interviewerVoice: string;
  pace: "Slow" | "Normal" | "Fast";
  followUpIntensity: "Standard" | "Challenging" | "Aggressive";
  feedbackTiming: "End only" | "After sections";
  thinkingTime: "Off" | "15s" | "30s";
  answerTimer: "Off" | "On";
  transcript: "Show" | "Hide";
  adaptiveDifficulty: "On" | "Off";
  hints: "Disabled" | "Optional";
  language: string;
};

const tabs = ["Home","Practice","Advanced","Dashboard","Feedback","Interview Room","API"];
const icons: Record<string,string> = {Home:"⌂",Practice:"▣",Advanced:"▥",Dashboard:"▦",Feedback:"▱","Interview Room":"▻",API:"⌘"};
const SESSION_KEY = "capital-forge-interview-sessions-v1";
const SETTINGS_KEY = "capital-forge-interview-settings-v1";

const defaultSettings: InterviewSettings = {
  answerMode:"Hybrid", microphone:"Default microphone", camera:"Off", interviewerVoice:"Professional", pace:"Normal", followUpIntensity:"Challenging", feedbackTiming:"End only", thinkingTime:"15s", answerTimer:"On", transcript:"Show", adaptiveDifficulty:"On", hints:"Optional", language:"English"
};

const referenceSessions: Session[] = [
  {id:"demo-ib-tech",title:"Investment Banking – Technical",interviewType:"Technical",careerTrack:"Investment Banking",duration:30,difficulty:"Intermediate",questionMix:"Technical Heavy",createdAt:"2026-09-04T10:00:00.000Z",completedAt:"Sep 4, 2026",status:"FEEDBACK_READY",overallScore:85,technicalScore:88,behavioralScore:78,caseScore:74,communicationScore:82},
  {id:"demo-pe-beh",title:"Private Equity – Behavioral",interviewType:"Behavioral",careerTrack:"Private Equity",duration:45,difficulty:"Associate",questionMix:"Behavioral Heavy",createdAt:"2026-09-02T10:00:00.000Z",completedAt:"Sep 2, 2026",status:"FEEDBACK_READY",overallScore:78,technicalScore:80,behavioralScore:82,caseScore:70,communicationScore:79},
  {id:"demo-ma-case",title:"M&A Case Interview",interviewType:"Case",careerTrack:"Investment Banking",duration:40,difficulty:"Hard",questionMix:"Case Heavy",createdAt:"2026-08-28T10:00:00.000Z",completedAt:"Aug 28, 2026",status:"FEEDBACK_READY",overallScore:72,technicalScore:76,behavioralScore:68,caseScore:72,communicationScore:74},
  {id:"demo-st-tech",title:"Sales & Trading – Technical",interviewType:"Technical",careerTrack:"Sales & Trading",duration:30,difficulty:"Advanced",questionMix:"Rapid Fire",createdAt:"2026-08-25T10:00:00.000Z",completedAt:"Aug 25, 2026",status:"FEEDBACK_READY",overallScore:88,technicalScore:91,behavioralScore:76,caseScore:78,communicationScore:87},
  {id:"demo-general-beh",title:"General Behavioral",interviewType:"Behavioral",careerTrack:"General Finance",duration:25,difficulty:"Intermediate",questionMix:"Behavioral Heavy",createdAt:"2026-08-20T10:00:00.000Z",completedAt:"Aug 20, 2026",status:"FEEDBACK_READY",overallScore:75,technicalScore:70,behavioralScore:79,caseScore:66,communicationScore:81}
];

const tracks = ["Investment Banking","Private Equity","Venture Capital","Private Credit","Equity Research","Hedge Funds","Sales & Trading","Capital Markets","Restructuring","Corporate Finance","FP&A","Strategy"];
const durations = [10,15,20,30,45,60,90];
const difficulties: Difficulty[] = ["Foundation","Easy","Intermediate","Hard","Advanced","Associate","VP","Director","MD / Partner / IC","Adaptive"];
const mixes: QuestionMix[] = ["Balanced","Technical Heavy","Behavioral Heavy","Case Heavy","Rapid Fire","Modeling / Valuation","Deal Experience","Commercial Judgment","Weak Areas"];

const interviewCards = [
  {type:"Technical" as InterviewType,icon:"▣",tone:"blue",title:"Technical Interview",desc:"Deep dive into finance concepts, modeling, valuation and more.",footer:"15+ scenario types"},
  {type:"Behavioral" as InterviewType,icon:"♟",tone:"green",title:"Behavioral Interview",desc:"Practice common and advanced behavioral questions.",footer:"10+ frameworks"},
  {type:"Case" as InterviewType,icon:"◕",tone:"red",title:"Case Interview",desc:"Tackle real-world business cases and make strategic decisions.",footer:"8+ case scenarios"},
  {type:"Industry-Specific" as InterviewType,icon:"▥",tone:"purple",title:"Industry-Specific",desc:"Tailored interviews for IB, PE, VC, S&T, HF and more.",footer:"12+ industry tracks"}
];

const tips = [
  "Structure your answers using the STAR method",
  "Be concise and quantitative",
  "Think out loud for case questions",
  "Ask clarifying questions",
  "Practice with a timer"
];

function nav(tab:string){
  if(tab==="Home") window.location.assign("/home");
  else if(tab==="Dashboard") window.location.assign("/dashboard");
  else if(tab==="Feedback") window.location.assign("/feedback");
  else if(tab==="Interview Room") window.location.assign("/interview");
  else window.location.assign(`/?open=${encodeURIComponent(tab)}`);
}

function scoreTone(score:number){ return score>=80?"green":score>=75?"blue":"amber"; }
function safeRead<T>(key:string, fallback:T):T{ try{ const raw=localStorage.getItem(key); return raw?JSON.parse(raw):fallback; }catch{return fallback;} }

export default function InterviewRoomPage(){
  const [sessions,setSessions]=useState<Session[]>([]);
  const [settings,setSettings]=useState<InterviewSettings>(defaultSettings);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [scheduleOpen,setScheduleOpen]=useState(false);
  const [resourceOpen,setResourceOpen]=useState<null|"scenarios"|"questions"|"resources"|"analytics">(null);
  const [proTip,setProTip]=useState(true);
  const [careerTrack,setCareerTrack]=useState("Investment Banking");
  const [duration,setDuration]=useState(30);
  const [difficulty,setDifficulty]=useState<Difficulty>("Intermediate");
  const [questionMix,setQuestionMix]=useState<QuestionMix>("Balanced");
  const [starting,setStarting]=useState(false);

  useEffect(()=>{
    const storedSessions=safeRead<Session[]>(SESSION_KEY,[]);
    const next=storedSessions.length?storedSessions:referenceSessions;
    setSessions(next);
    if(!storedSessions.length) localStorage.setItem(SESSION_KEY,JSON.stringify(referenceSessions));
    setSettings(safeRead<InterviewSettings>(SETTINGS_KEY,defaultSettings));
  },[]);

  useEffect(()=>{ if(typeof window!=="undefined") localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings)); },[settings]);

  const completed=useMemo(()=>sessions.filter(s=>s.status==="COMPLETED"||s.status==="FEEDBACK_READY"),[sessions]);
  const performance=useMemo(()=>{
    const base=completed.length?completed:referenceSessions;
    const avg=(key:keyof Session,fallback:number)=>Math.round(base.reduce((sum,s)=>sum+Number(s[key]||fallback),0)/Math.max(1,base.length));
    const technical=avg("technicalScore",82), behavioral=avg("behavioralScore",76), caseScore=avg("caseScore",71), communication=avg("communicationScore",80);
    const overall=Math.round(technical*.30+behavioral*.20+caseScore*.25+communication*.25);
    return {technical,behavioral,caseScore,communication,overall};
  },[completed]);

  function persistSessions(next:Session[]){ setSessions(next); localStorage.setItem(SESSION_KEY,JSON.stringify(next)); }

  function createSession(type?:InterviewType, overrides?:Partial<Session>){
    if(starting) return;
    setStarting(true);
    const chosen=type || (sessions[0]?.interviewType ?? "Technical");
    const id=crypto.randomUUID();
    const selectedMix:QuestionMix = chosen==="Technical"?"Technical Heavy":chosen==="Behavioral"?"Behavioral Heavy":chosen==="Case"?"Case Heavy":questionMix;
    const session:Session={
      id,
      title:`${careerTrack} – ${chosen}`,
      interviewType:chosen,
      careerTrack,
      duration,
      difficulty,
      questionMix:selectedMix,
      createdAt:new Date().toISOString(),
      status:"CREATED",
      ...overrides
    };
    persistSessions([session,...sessions]);
    localStorage.setItem("capital-forge-active-interview-v1",JSON.stringify({id,settings,createdAt:new Date().toISOString()}));
    window.location.assign(`/interview/session/${id}`);
  }

  const recent=(sessions.length?sessions:referenceSessions).slice(0,5);

  return <div className="ir-app">
    <header className="ir-header">
      <div className="ir-brand"><div className="ir-brand-mark">CF</div><div><b>Capital Forge</b><small>Master Finance. Build Your Future.</small></div></div>
      <div className="ir-search"><span>⌕</span><input placeholder="Search for questions, companies, or interview topics..."/><kbd>⌘ K</kbd></div>
      <button className="ir-ai" onClick={()=>nav("Advanced")}>✦ AI Assistant</button><button className="ir-bell">♧<i/></button><div className="ir-profile"><div className="ir-avatar">DC</div><div><b>Deepak</b><small>Pro Plan</small></div><span>⌄</span></div>
    </header>

    <aside className="ir-sidebar">
      <nav>{tabs.map(tab=><button key={tab} className={tab==="Interview Room"?"active":""} onClick={()=>tab!=="Interview Room"&&nav(tab)}><span>{icons[tab]}</span>{tab}</button>)}</nav>
      <div className="ir-upgrade"><h3>👑 Upgrade to Pro</h3><p>Get unlimited mock interviews, detailed AI feedback and more.</p><button>Upgrade Now →</button></div>
      <div className="ir-version">Capital Forge v1.5.0<br/>Built for your better tomorrow.</div>
    </aside>

    <main className="ir-workspace">
      <div className="ir-layout">
        <section className="ir-main">
          <div className="ir-title-row"><div><h1>Interview Room</h1><p>Practice with our AI interviewer and get real-time feedback. Build confidence for your target role.</p></div><button className="ir-settings-btn" onClick={()=>setSettingsOpen(true)}>⚙ Interview Settings</button></div>

          <section className="ir-hero-card">
            <div className="ir-hero-visual">
              <div className="ir-hero-copy"><h2>Real Conversations.<br/><span>Real Preparation.</span></h2><p>Experience realistic interview simulations powered by AI. Practice technical, behavioral and case questions tailored to your goals.</p><button onClick={()=>createSession()} disabled={starting}>{starting?"Preparing...":"Start a Mock Interview →"}</button></div>
              <div className="ir-person" aria-label="Professional interviewer visual"/>
              <div className="ir-conversation"><div className="ir-wave">▥▥▥</div><div className="ir-chat ai"><b>AI Interviewer</b><p>Can you walk me through a DCF valuation?</p></div><div className="ir-chat you"><b>You</b><p>•••</p></div></div>
            </div>
            <div className="ir-feature-strip"><Feature icon="◎" tone="red" title="Industry-specific questions" subtitle="IB, PE, VC, S&T and more"/><Feature icon="▥" tone="purple" title="Real-time AI feedback" subtitle="Get detailed performance analysis"/><Feature icon="♧" tone="blue" title="Adaptive difficulty" subtitle="Questions adjust to your level"/></div>
          </section>

          <div className="ir-section-head"><h2>Choose an Interview Type</h2><button onClick={()=>setResourceOpen("scenarios")}>View All Scenarios →</button></div>
          <div className="ir-type-grid">{interviewCards.map(card=><button key={card.type} className={`ir-type-card ${card.tone}`} onClick={()=>createSession(card.type)}><span className="ir-type-icon">{card.icon}</span><h3>{card.title}</h3><p>{card.desc}</p><div><b>{card.footer}</b><i>→</i></div></button>)}</div>

          <div className="ir-lower-grid">
            <section className="ir-custom-card"><div className="ir-card-title"><span>⌘</span><div><h3>Custom Interview</h3><p>Create a personalized interview session based on your needs.</p></div></div><div className="ir-custom-grid"><label>Target Role<select value={careerTrack} onChange={e=>setCareerTrack(e.target.value)}>{tracks.map(x=><option key={x}>{x}</option>)}</select></label><label>Duration<select value={duration} onChange={e=>setDuration(Number(e.target.value))}>{durations.map(x=><option key={x} value={x}>{x} minutes</option>)}</select></label><label>Difficulty<select value={difficulty} onChange={e=>setDifficulty(e.target.value as Difficulty)}>{difficulties.map(x=><option key={x}>{x}</option>)}</select></label><label>Question Mix<select value={questionMix} onChange={e=>setQuestionMix(e.target.value as QuestionMix)}>{mixes.map(x=><option key={x}>{x}</option>)}</select></label></div><button className="ir-custom-start" onClick={()=>createSession(undefined,{careerTrack,duration,difficulty,questionMix})} disabled={starting}>{starting?"Creating Session...":"Start Custom Interview →"}</button></section>

            <section className="ir-tips-card"><div className="ir-card-head"><h3>💡 Interview Tips</h3><button onClick={()=>setResourceOpen("resources")}>View All →</button></div><div className="ir-tip-list">{tips.map((tip,i)=><button key={tip}><span>{i+1}</span><b>{tip}</b><i>›</i></button>)}</div></section>
          </div>
        </section>

        <aside className="ir-rail">
          <section className="ir-rail-card ir-performance"><div className="ir-rail-head"><h3>Interview Performance</h3><button onClick={()=>setResourceOpen("analytics")}>View Details →</button></div><div className="ir-performance-body"><div className="ir-donut" style={{background:`conic-gradient(#0875fa 0 25%,#7839ee 25% 50%,#f0444d 50% 72%,#12b76a 72% 100%)`}}><div><b>{performance.overall}%</b><span>Overall Score</span></div></div><div className="ir-perf-list"><Perf tone="blue" label="Technical" value={performance.technical}/><Perf tone="purple" label="Behavioral" value={performance.behavioral}/><Perf tone="red" label="Case" value={performance.caseScore}/><Perf tone="green" label="Communication" value={performance.communication}/></div></div></section>

          <section className="ir-rail-card ir-recent"><div className="ir-rail-head"><h3>Recent Interview Sessions</h3><button onClick={()=>setResourceOpen("analytics")}>View All →</button></div><div className="ir-session-list">{recent.map((s,i)=><button key={s.id} onClick={()=>window.location.assign(`/interview/session/${s.id}/results`)}><span className={`ir-session-icon c${i%4}`}>{s.interviewType==="Technical"?"▣":s.interviewType==="Behavioral"?"♟":s.interviewType==="Case"?"◕":"▥"}</span><div><b>{s.title}</b><small>{s.completedAt||new Date(s.createdAt).toLocaleDateString()} • {s.duration} min</small></div><strong className={scoreTone(s.overallScore||0)}>{s.overallScore??"—"}%</strong><i>›</i></button>)}</div></section>

          <section className="ir-rail-card ir-quick"><h3>Quick Actions</h3><div><button onClick={()=>createSession()}><span>▣</span><small>Start<br/>Interview</small></button><button onClick={()=>setResourceOpen("questions")}><span>▤</span><small>View<br/>Question Bank</small></button><button onClick={()=>setResourceOpen("resources")}><span>▥</span><small>Prep<br/>Resources</small></button><button onClick={()=>setScheduleOpen(true)}><span>▦</span><small>Schedule<br/>Practice</small></button></div></section>

          {proTip&&<section className="ir-protip"><button onClick={()=>setProTip(false)}>×</button><b>✦ Pro Tip</b><p>Do multiple mock interviews and review your feedback to see consistent improvement over time.</p></section>}
        </aside>
      </div>
    </main>

    {settingsOpen&&<Modal onClose={()=>setSettingsOpen(false)} title="Interview Settings"><div className="ir-settings-grid"><Setting label="Answer Mode" value={settings.answerMode} options={["Voice","Text","Hybrid"]} onChange={v=>setSettings({...settings,answerMode:v as AnswerMode})}/><Setting label="Microphone" value={settings.microphone} options={["Default microphone","Built-in microphone"]} onChange={v=>setSettings({...settings,microphone:v})}/><Setting label="Camera" value={settings.camera} options={["Off","On"]} onChange={v=>setSettings({...settings,camera:v as "Off"|"On"})}/><Setting label="Interviewer Voice" value={settings.interviewerVoice} options={["Professional","Calm","Direct"]} onChange={v=>setSettings({...settings,interviewerVoice:v})}/><Setting label="Pace" value={settings.pace} options={["Slow","Normal","Fast"]} onChange={v=>setSettings({...settings,pace:v as InterviewSettings["pace"]})}/><Setting label="Follow-up Intensity" value={settings.followUpIntensity} options={["Standard","Challenging","Aggressive"]} onChange={v=>setSettings({...settings,followUpIntensity:v as InterviewSettings["followUpIntensity"]})}/><Setting label="Feedback Timing" value={settings.feedbackTiming} options={["End only","After sections"]} onChange={v=>setSettings({...settings,feedbackTiming:v as InterviewSettings["feedbackTiming"]})}/><Setting label="Thinking Time" value={settings.thinkingTime} options={["Off","15s","30s"]} onChange={v=>setSettings({...settings,thinkingTime:v as InterviewSettings["thinkingTime"]})}/><Setting label="Answer Timer" value={settings.answerTimer} options={["Off","On"]} onChange={v=>setSettings({...settings,answerTimer:v as "Off"|"On"})}/><Setting label="Transcript" value={settings.transcript} options={["Show","Hide"]} onChange={v=>setSettings({...settings,transcript:v as "Show"|"Hide"})}/><Setting label="Adaptive Difficulty" value={settings.adaptiveDifficulty} options={["On","Off"]} onChange={v=>setSettings({...settings,adaptiveDifficulty:v as "On"|"Off"})}/><Setting label="Hints" value={settings.hints} options={["Disabled","Optional"]} onChange={v=>setSettings({...settings,hints:v as "Disabled"|"Optional"})}/></div><button className="ir-modal-primary" onClick={()=>setSettingsOpen(false)}>Save Settings</button></Modal>}

    {scheduleOpen&&<Modal onClose={()=>setScheduleOpen(false)} title="Schedule Practice"><div className="ir-schedule"><label>Date<input type="date"/></label><label>Time<input type="time"/></label><label>Interview Type<select>{interviewCards.map(x=><option key={x.type}>{x.title}</option>)}</select></label><label>Duration<select>{durations.map(x=><option key={x}>{x} minutes</option>)}</select></label><label>Goal<input placeholder="e.g. Mock PE every Saturday"/></label></div><button className="ir-modal-primary" onClick={()=>setScheduleOpen(false)}>Save Schedule</button></Modal>}

    {resourceOpen&&<Modal onClose={()=>setResourceOpen(null)} title={resourceOpen==="scenarios"?"Interview Scenarios":resourceOpen==="questions"?"Interview Question Bank":resourceOpen==="resources"?"Prep Resources":"Interview Analytics"}><ResourcePanel type={resourceOpen}/></Modal>}
  </div>
}

function Feature({icon,tone,title,subtitle}:{icon:string;tone:string;title:string;subtitle:string}){return <div className="ir-feature"><span className={tone}>{icon}</span><div><b>{title}</b><small>{subtitle}</small></div></div>}
function Perf({tone,label,value}:{tone:string;label:string;value:number}){return <div><span className={tone}/><p>{label}</p><b>{value}%</b></div>}
function Setting({label,value,options,onChange}:{label:string;value:string;options:string[];onChange:(v:string)=>void}){return <label>{label}<select value={value} onChange={e=>onChange(e.target.value)}>{options.map(x=><option key={x}>{x}</option>)}</select></label>}
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){return <div className="ir-modal-backdrop" onMouseDown={onClose}><section className="ir-modal" onMouseDown={e=>e.stopPropagation()}><div className="ir-modal-head"><h2>{title}</h2><button onClick={onClose}>×</button></div>{children}</section></div>}
function ResourcePanel({type}:{type:"scenarios"|"questions"|"resources"|"analytics"}){
  if(type==="scenarios") return <div className="ir-resource-list"><p>Filterable scenario library prepared for the next build step.</p>{["PE Associate – Buyout Technical","IB Analyst – M&A Technical","Growth Equity – Investment Case","Private Credit – Underwriting Case","Restructuring – Distressed Capital Structure","S&T – Markets Rapid Fire"].map(x=><button key={x}>{x}<span>›</span></button>)}</div>;
  if(type==="questions") return <div className="ir-resource-list"><p>Curated questions are the base; AI only generates contextual follow-ups.</p>{["Walk me through a DCF.","Why use unlevered FCF?","Walk me through an LBO.","Tell me about a deal you worked on.","How would rising rates affect valuation?"].map(x=><button key={x}>{x}<span>Practice Solo →</span></button>)}</div>;
  if(type==="resources") return <div className="ir-resource-list"><p>Interview-focused resources link back into Practice and Advanced.</p>{["Technical cheat sheets","Behavioral framework guide","Case interview frameworks","Mental math drills","Deal walkthrough template","Last-minute revision pack"].map(x=><button key={x}>{x}<span>›</span></button>)}</div>;
  return <div className="ir-resource-list"><p>Detailed analytics will aggregate completed sessions by technical, behavioral, case, communication, timing and follow-up handling.</p>{["Overall trend","Technical trend","Behavioral trend","Case trend","Communication","Follow-up handling","Answer duration","Weak areas"].map(x=><button key={x}>{x}<span>›</span></button>)}</div>;
}
