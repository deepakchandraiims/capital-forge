"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import styles from "../session.module.css";

type Session = {
  id:string; title:string; interviewType:"Technical"|"Behavioral"|"Case"|"Industry-Specific"; careerTrack:string; duration:number; difficulty:string; questionMix:string;
  createdAt:string; completedAt?:string; status:string; overallScore?:number; technicalScore?:number; behavioralScore?:number; caseScore?:number; communicationScore?:number;
};
type Answer = {question:string; text:string; score:number; askedAt:string; completedAt:string};
type Question = {text:string; category:string; hint:string; sourceKey?:string};

const SESSION_KEY="capital-forge-interview-sessions-v1";
const answerKey=(id:string)=>`capital-forge-interview-answers-${id}`;

const fallbackBank:Record<string,Question[]>={
  Technical:[
    {text:"Walk me through a DCF valuation.",category:"Valuation",hint:"Explain forecast FCF, WACC, terminal value and enterprise-to-equity bridge."},
    {text:"Why do we use unlevered free cash flow in a standard enterprise-value DCF?",category:"Valuation",hint:"Connect the cash flow definition to the discount rate and capital structure."},
    {text:"Walk me through the three financial statements and how they link.",category:"Accounting",hint:"Start from the income statement, connect net income to cash flow, then balance sheet movements."},
    {text:"Walk me through an LBO and the key drivers of sponsor returns.",category:"LBO",hint:"Entry valuation, leverage, EBITDA growth, cash generation, debt paydown and exit multiple."},
    {text:"How would a 100 bps increase in interest rates affect a leveraged company?",category:"Credit",hint:"Discuss interest expense, FCF, coverage, valuation and refinancing risk."}
  ],
  Behavioral:[
    {text:"Tell me about a time you worked under a very tight deadline.",category:"Behavioral",hint:"Use STAR. Make the action and measurable result explicit."},
    {text:"Tell me about a disagreement with a teammate or senior stakeholder.",category:"Behavioral",hint:"Show ownership, judgment and how the conflict was resolved."},
    {text:"Why do you want this role and why now?",category:"Motivation",hint:"Connect your experience, skills, role fit and long-term trajectory."},
    {text:"Tell me about a mistake you made and what changed afterward.",category:"Behavioral",hint:"Own the mistake, explain corrective action and learning."},
    {text:"Walk me through an achievement you are most proud of.",category:"Behavioral",hint:"Quantify your contribution and impact."}
  ],
  Case:[
    {text:"A PE fund is evaluating a ₹500 Cr enterprise-value business with 20% EBITDA margins. What would you want to understand first?",category:"Case",hint:"Clarify market, earnings quality, cash conversion, leverage capacity and exit assumptions."},
    {text:"Management expects EBITDA to grow 15% annually. How would you pressure-test that assumption?",category:"Case",hint:"Break growth into volume, price, mix, margin and evidence."},
    {text:"The company can support 4.5x debt. What factors determine whether you would actually use that much leverage?",category:"Case",hint:"Think downside, coverage, covenants, cyclicality and refinancing."},
    {text:"Give me your final investment recommendation in 60 seconds.",category:"Case",hint:"Conclusion, 2–3 value drivers, key risk, expected return and decision."}
  ],
  "Industry-Specific":[
    {text:"What are the most important value drivers in your target sector?",category:"Industry",hint:"Discuss growth, margins, capital intensity, cash conversion and valuation."},
    {text:"Which operating KPI would you monitor most closely and why?",category:"Industry",hint:"Choose a KPI tied to unit economics or earnings quality."},
    {text:"What would make you change your view on this sector?",category:"Industry",hint:"State specific disconfirming evidence."}
  ]
};

function readSessions():Session[]{ try{const raw=localStorage.getItem(SESSION_KEY);return raw?JSON.parse(raw):[]}catch{return[]} }
function writeSessions(list:Session[]){ localStorage.setItem(SESSION_KEY,JSON.stringify(list)); }
function readAnswers(id:string):Answer[]{ try{const raw=localStorage.getItem(answerKey(id));return raw?JSON.parse(raw):[]}catch{return[]} }
function scoreAnswer(text:string, category:string){
  const words=text.trim().split(/\s+/).filter(Boolean).length;
  let score=words>=120?88:words>=80?82:words>=45?74:words>=20?64:48;
  if(/\d|%|x|bps|₹|\$/i.test(text)) score+=4;
  if(category==="Behavioral"&&/result|impact|learn|outcome|because|therefore/i.test(text)) score+=4;
  if(/case|decision|investment|credit|pe/i.test(category)&&/risk|downside|recommend|return|cash|margin|debt/i.test(text)) score+=4;
  return Math.max(0,Math.min(98,score));
}
function pickText(item:any, keys:string[]){ for(const key of keys){const v=item?.[key]; if(typeof v==="string"&&v.trim())return v.trim();} return ""; }
function casePrompt(item:any){return pickText(item,["prompt","case_prompt","question","scenario","context","description","title"])}
function caseHint(item:any){return pickText(item,["model_answer","recommended_answer","solution","answer","key_principle","decision"])||"Lead with your decision, key drivers, downside, and what would change your view."}
function stableRotate<T>(items:T[], seed:string){
  if(!items.length)return items;
  let n=0; for(const ch of seed)n=(n+ch.charCodeAt(0))%items.length;
  return [...items.slice(n),...items.slice(0,n)];
}

export default function LiveInterview(){
  const params=useParams<{id:string}>(); const id=String(params.id);
  const [session,setSession]=useState<Session|null>(null);
  const [answers,setAnswers]=useState<Answer[]>([]);
  const [canonical,setCanonical]=useState<Question[]>([]);
  const [canonicalLoading,setCanonicalLoading]=useState(false);
  const [index,setIndex]=useState(0); const [text,setText]=useState("");
  const [started,setStarted]=useState(false); const [micState,setMicState]=useState<"unchecked"|"ok"|"failed">("unchecked"); const [seconds,setSeconds]=useState(0); const [message,setMessage]=useState("");

  useEffect(()=>{
    const s=readSessions().find(x=>x.id===id)||null; setSession(s);
    const a=readAnswers(id); setAnswers(a); setIndex(a.length);
    if(s?.status==="IN_PROGRESS"||s?.status==="PAUSED")setStarted(true);
    if(s) void loadCanonical(s);
  },[id]);
  useEffect(()=>{if(!started)return;const t=window.setInterval(()=>setSeconds(s=>s+1),1000);return()=>window.clearInterval(t)},[started]);

  async function loadCanonical(s:Session){
    if(s.interviewType==="Behavioral"){setCanonical([]);return;}
    setCanonicalLoading(true);
    try{
      const endpoint=s.interviewType==="Case"?"/api/content?type=cases&limit=1000":"/api/content?type=interview&limit=1000";
      const res=await fetch(endpoint,{cache:"no-store"}); const data=await res.json();
      if(!res.ok||!data.ok)throw new Error(data.error||"Canonical content unavailable");
      let rows:Question[]=[];
      if(s.interviewType==="Case"){
        rows=(Array.isArray(data.cases)?data.cases:[]).map((item:any)=>({text:casePrompt(item),category:item.seniority||"Investment Decision",hint:caseHint(item),sourceKey:item.source_record_key})).filter((q:Question)=>q.text);
      }else{
        rows=(Array.isArray(data.interview)?data.interview:[]).map((item:any)=>({text:String(item.question||"").trim(),category:(item.career_tracks?.[0]||item.seniority||"Technical"),hint:String(item.model_answer||item.correct_answer||(Array.isArray(item.expected_points)?item.expected_points.join(" • "):"")||"Structure the answer, quantify where possible, and explain the finance intuition."),sourceKey:item.source_record_key})).filter((q:Question)=>q.text);
      }
      const count=Math.max(5,Math.min(15,Math.round(s.duration/5)));
      setCanonical(stableRotate(rows,s.id).slice(0,count));
    }catch{setCanonical([]);}finally{setCanonicalLoading(false);}
  }

  const questions=useMemo(()=>session?(canonical.length?canonical:(fallbackBank[session.interviewType]||fallbackBank.Technical)):fallbackBank.Technical,[session,canonical]);
  const current=questions[Math.min(index,Math.max(questions.length-1,0))];
  const progress=Math.round((Math.min(index,questions.length)/Math.max(questions.length,1))*100);

  async function testMic(){try{const stream=await navigator.mediaDevices?.getUserMedia({audio:true});stream?.getTracks().forEach(t=>t.stop());setMicState("ok")}catch{setMicState("failed")}}
  function updateStatus(status:string){if(!session)return;const next={...session,status};setSession(next);writeSessions(readSessions().map(s=>s.id===id?next:s));}
  function enter(){updateStatus("IN_PROGRESS");setStarted(true)}
  function submit(){if(!session||!current||!text.trim())return;const answer:Answer={question:current.text,text:text.trim(),score:scoreAnswer(text,current.category),askedAt:new Date().toISOString(),completedAt:new Date().toISOString()};const next=[...answers,answer];setAnswers(next);localStorage.setItem(answerKey(id),JSON.stringify(next));setText("");if(index+1>=questions.length){finish(next)}else{setIndex(i=>i+1)}}
  function finish(list=answers){if(!session)return;const avg=Math.round(list.reduce((s,a)=>s+a.score,0)/Math.max(1,list.length));const technical=session.interviewType==="Technical"?avg:Math.round(avg*.94);const behavioral=session.interviewType==="Behavioral"?avg:Math.round(avg*.96);const caseScore=session.interviewType==="Case"?avg:Math.round(avg*.92);const communication=Math.max(50,Math.min(95,Math.round(avg+(list.some(a=>a.text.length>500)?-3:2))));const done:Session={...session,status:"FEEDBACK_READY",completedAt:new Date().toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}),overallScore:avg,technicalScore:technical,behavioralScore:behavioral,caseScore,communicationScore:communication};writeSessions(readSessions().map(s=>s.id===id?done:s));setSession(done);pushFeedback(done,list);window.location.assign(`/interview/session/${id}/results`)}
  function pushFeedback(done:Session,list:Answer[]){try{const key="capital-forge-feedback-v1";const existing=localStorage.getItem(key);const currentItems=existing?JSON.parse(existing):[];const weakest=[...list].sort((a,b)=>a.score-b.score)[0];const strongest=[...list].sort((a,b)=>b.score-a.score)[0];const item={id:`interview-${id}`,title:done.title,type:"Interview",topic:done.interviewType==="Technical"?"Technical Interviews":done.interviewType==="Behavioral"?"Communication":"Structured Thinking",difficulty:done.difficulty,score:done.overallScore||0,dateLabel:`${done.completedAt} • Completed`,timestamp:Date.now(),icon:"▻",saved:false,strengths:[`Strongest answer scored ${strongest?.score||0}%.`,`Completed ${list.length} interview questions under timed conditions.`],weaknesses:[`Weakest answer scored ${weakest?.score||0}%.`,`Follow-up depth and concise quantification remain areas to retest.`],missing:["Sharper downside framing","More explicit quantification"],recommendation:"Practice the two weakest concepts, then repeat a focused mock at the same or slightly higher difficulty.",modelApproach:"Lead with the conclusion, support it with quantified drivers, explain the key risk and finish with what would change your view.",originalAnswer:weakest?.text||"",rubric:[{dimension:"Technical Accuracy",score:done.technicalScore||0,weight:30,evidence:"Derived from completed answers."},{dimension:"Reasoning / Structure",score:Math.round((done.overallScore||0)*.98),weight:20,evidence:"Based on answer completeness and directness."},{dimension:"Communication",score:done.communicationScore||0,weight:15,evidence:"Based on clarity, length and quantification."},{dimension:"Commercial Judgment",score:done.caseScore||0,weight:15,evidence:"Derived from case and decision framing."},{dimension:"Follow-up Handling",score:Math.round((done.overallScore||0)*.92),weight:10,evidence:"Session-level follow-up proxy."},{dimension:"Conciseness",score:done.communicationScore||0,weight:10,evidence:"Based on response length and directness."}]};localStorage.setItem(key,JSON.stringify([item,...currentItems.filter((x:any)=>x.id!==item.id)]))}catch{}}
  const mm=String(Math.floor(seconds/60)).padStart(2,"0"), ss=String(seconds%60).padStart(2,"0");

  if(!session)return <div className={styles.shell}><main className={styles.main}><section className={styles.device}><h1>Interview session not found</h1><p>This session may belong to another browser or may have been removed.</p><button className={styles.primary} onClick={()=>window.location.assign("/interview")}>Back to Interview Room</button></section></main></div>;

  if(!started)return <div className={styles.shell}><Top/><main className={styles.main}><section className={styles.device}><h1>Device Check</h1><p>{session.title} · {session.duration} min · {session.difficulty}</p><div className={styles.checks}><div className={styles.check}><span>✓</span><div><b>Question Bank</b><small>{canonicalLoading?"Loading canonical Capital Forge content…":canonical.length?`${canonical.length} canonical questions selected for this session`:"Fallback bank ready"}</small></div><em>{canonicalLoading?"Loading":"Ready"}</em></div><div className={styles.check}><span>{micState==="ok"?"✓":micState==="failed"?"!":"•"}</span><div><b>Microphone</b><small>{micState==="failed"?"Unavailable — text mode remains available":"Optional for voice/hybrid interviews"}</small></div><em>{micState==="ok"?"Ready":micState==="failed"?"Text mode":"Unchecked"}</em></div><div className={`${styles.check} ${styles.optional}`}><span>○</span><div><b>Camera</b><small>Optional — not used for appearance or personality grading</small></div><em>Optional</em></div><div className={styles.check}><span>✓</span><div><b>Session State</b><small>Answers are persisted locally during the mock</small></div><em>Ready</em></div></div><div className={styles.deviceActions}><button className={styles.secondary} onClick={testMic}>Test Microphone</button><button className={styles.primary} onClick={enter} disabled={canonicalLoading}>Enter Interview</button></div></section></main></div>;

  return <div className={styles.shell}><Top/><main className={styles.main}><div className={styles.liveGrid}><section className={styles.stage}><div className={styles.stageHead}><div><h1>{session.title}</h1><p>{session.difficulty} · {session.questionMix} · {canonical.length?"Canonical Content OS":"Fallback Bank"}</p></div><div className={styles.timer}>{mm}:{ss}</div></div><div className={styles.question}><div className={styles.questionMeta}><span>{current?.category||"Interview"}</span><em>Question {Math.min(index+1,questions.length)} of {questions.length}</em></div><h2>{current?.text}</h2><p>{message||"Take a moment, structure your answer, and respond as if this were a live finance interview."}</p>{current?.sourceKey&&<small>{current.sourceKey}</small>}</div><div className={styles.answerArea}><textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key==="Enter")submit()}} placeholder="Type your answer here…  Cmd/Ctrl + Enter to submit"/><div className={styles.answerActions}><div className={styles.leftActions}><button className={styles.secondary} onClick={()=>setMessage(current?.text||"")}>Repeat Question</button><button className={styles.secondary} onClick={()=>setMessage(current?.hint||"")}>Ask Clarification</button></div><div className={styles.rightActions}><button className={styles.secondary} onClick={()=>finish()}>End Interview</button><button className={styles.primary} onClick={submit}>Submit Answer →</button></div></div></div></section><aside className={styles.side}><section className={styles.sideCard}><h3>Session Progress</h3><div className={styles.progress}><div><span>Completed</span><b>{progress}%</b></div><div className={styles.bar}><b style={{width:`${progress}%`}}/></div><div><span>Topic</span><b>{current?.category||"Interview"}</b></div><div><span>Source</span><b>{canonical.length?"Canonical":"Fallback"}</b></div></div></section><section className={styles.sideCard}><h3>Transcript</h3><div className={styles.transcript}>{answers.map((a,i)=><div key={i}><div className={`${styles.bubble} ${styles.ai}`}><b>AI Interviewer</b>{a.question}</div><div className={`${styles.bubble} ${styles.you}`}><b>You</b>{a.text}</div></div>)}<div className={`${styles.bubble} ${styles.ai}`}><b>AI Interviewer</b>{current?.text}</div></div></section><section className={styles.sideCard}><h3>Interview Mode</h3><p className={styles.hint}>Technical and case sessions now draw from the published Capital Forge catalog. Detailed feedback is generated after completion.</p></section></aside></div></main></div>
}

function Top(){return <header className={styles.top}><div className={styles.brand}><div className={styles.mark}>CF</div><div><b>Capital Forge Interview Room</b><small>Canonical finance interview simulation</small></div></div><div className={styles.topActions}><button onClick={()=>window.location.assign("/interview")}>Exit to Interview Room</button></div></header>}
