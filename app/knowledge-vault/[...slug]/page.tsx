"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import KnowledgeVaultShell from "../KnowledgeVaultShell";
import LearningObjectRenderer from "../LearningObjectRenderer";
import FocusQuest from "../FocusQuest";
import { useAuthProfile } from "../../AuthProvider";
import { cachedKVObject, loadKVObject, prefetchKVObject, updateCachedKVProgress } from "../KVClientCache";

type Obj = Record<string, any>;
const modeTabs=["Quick Scan","Learn","Quiz","Timeline","Saved"];
function routeFor(label:string){return `/knowledge-vault/${label.toLowerCase().replace(" ","-")}`;}
function clientKey(){const k="capital-forge-kv-client-v1";let v=localStorage.getItem(k);if(!v){v=`cfkv-${crypto.randomUUID()}`;localStorage.setItem(k,v);}return v;}
function titleCase(v:string){return decodeURIComponent(v||"").replaceAll("-"," ").replace(/\b\w/g,m=>m.toUpperCase());}

export default function KnowledgeVaultRoutePage(){
  const router=useRouter();
  const params=useParams<{slug:string[]}>();
  const slug=Array.isArray(params?.slug)?params.slug:[];
  const section=slug[0]||"learn";
  const detail=slug[1]||"";
  const [search,setSearch]=useState("");
  return <KnowledgeVaultShell search={search} onSearch={setSearch}><main className="kv-mode-workspace"><div className="kv-mode-head"><div><div className="kv-crumb">Knowledge Vault <span>›</span> {titleCase(section)}</div><h1>{section==="object"?"Learning Object":section==="quick-scan"?"Quick Scan":section==="universe"?titleCase(detail):section==="category"?titleCase(detail):titleCase(section)}</h1><p>{section==="quick-scan"?"Fast recall with saved responses, spaced repetition and confidence rating.":section==="timeline"?"Financial history from dated, source-grounded objects.":section==="saved"?"Bookmarks, saved responses, review-later items, mastered objects and recent history.":"Browse, understand and connect finance knowledge."}</p></div><div className="kv-mode-tabs">{modeTabs.map(x=><button key={x} className={section===x.toLowerCase().replace(" ","-")?"active":""} onClick={()=>router.push(routeFor(x))}>{x}</button>)}</div></div><div className="kv-mode-panel">{section==="object"?<ObjectView key={detail} id={detail}/>:section==="quick-scan"?<QuickScan/>:section==="quiz"?<Quiz/>:section==="timeline"?<Timeline search={search}/>:section==="saved"?<Saved/>:section==="universe"?<Universe slug={detail}/>:section==="progress"?<ProgressRedirect/>:<Learn category={section==="category"?detail:""} search={search}/>}</div></main></KnowledgeVaultShell>;
}

function Empty({text="No matching Knowledge Vault objects are available."}:{text?:string}){return <div className="kv-mode-card kv-empty"><b>{text}</b><p>Try another category, filter or learning mode.</p></div>}

function ObjectView({id}:{id:string}){
  const router=useRouter();
  const profile=useAuthProfile();
  const userId=profile?.id || "";
  const cached = cachedKVObject(id,userId);
  const [object,setObject]=useState<Obj|null>(cached?.object || null);
  const [sources,setSources]=useState<any[]>(cached?.sources || []);
  const [busy,setBusy]=useState(!cached);
  const [error,setError]=useState("");
  const [bookmarked,setBookmarked]=useState(Boolean(cached?.progress?.bookmark));
  const [reviewLater,setReviewLater]=useState(Boolean(cached?.progress?.review_later));
  const [fullNotes,setFullNotes]=useState(false);
  const [nextObject,setNextObject]=useState<Obj|null>(null);

  useEffect(()=>{
    if(!id || !userId)return;
    let active=true;
    const hit=cachedKVObject(id,userId);
    setObject(hit?.object || null);
    setSources(hit?.sources || []);
    setBookmarked(Boolean(hit?.progress?.bookmark));
    setReviewLater(Boolean(hit?.progress?.review_later));
    setBusy(!hit);
    setError("");
    setFullNotes(false);
    setNextObject(null);
    (async()=>{
      try{
        const data=await loadKVObject(id,userId);
        if(!active)return;
        setObject(data.object);
        setSources(data.sources || []);
        setBookmarked(Boolean(data.progress?.bookmark));
        setReviewLater(Boolean(data.progress?.review_later));
        setBusy(false);
        // Do not wait for progress write before painting the lesson.
        void fetch("/api/knowledge-vault",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"seen",clientKey:clientKey(),objectId:data.object.id})}).catch(()=>{});
      }catch(err){
        if(!active)return;
        setError(err instanceof Error ? err.message : "Lesson could not load.");
        setBusy(false);
      }
    })();
    return()=>{active=false;};
  },[id,userId]);

  function openFullNotes(){
    setFullNotes(true);
    requestAnimationFrame(()=>document.getElementById("kv-full-reference")?.scrollIntoView({behavior:"smooth",block:"start"}));
  }
  async function toggle(action:"bookmark"|"reviewLater",value:boolean){
    if(!object)return;
    try {
      const response=await fetch("/api/knowledge-vault",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,clientKey:clientKey(),objectId:object.id,value})});
      const data=await response.json();
      if(!response.ok || !data.ok)throw new Error(data.error || "Could not update progress.");
      if(action==="bookmark")setBookmarked(value);else setReviewLater(value);
      if(data.progress && userId)updateCachedKVProgress(object.id,userId,data.progress);
    } catch(err){setError(err instanceof Error ? err.message : "Could not update progress.");}
  }
  async function saveRating(rating:"Again"|"Hard"|"Got It"){
    if(!object)return false;
    try {
      const response=await fetch("/api/knowledge-vault",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"rate",clientKey:clientKey(),objectId:object.id,rating})});
      const data=await response.json();
      if(!response.ok || !data.ok)return false;
      if(data.progress && userId)updateCachedKVProgress(object.id,userId,data.progress);
      return true;
    } catch {return false;}
  }

  if(busy && !object)return <div className="kv-mode-card kv-fast-skeleton"><div/><div/><div/><p>Preparing your short lesson…</p></div>;
  if(!object)return <section className="kv-mode-card kv-empty"><b>{error || "Lesson not found."}</b><button onClick={()=>router.refresh()}>Retry</button></section>;
  return <>
    <div className="kv-filter-row kv-learning-toolbar">
      <button onClick={()=>router.back()}>← Back</button>
      <button onClick={()=>void toggle("bookmark",!bookmarked)}>{bookmarked?"★ Bookmarked":"☆ Bookmark"}</button>
      <button onClick={()=>void toggle("reviewLater",!reviewLater)}>{reviewLater?"✓ Review Later":"↻ Review Later"}</button>
      <button onClick={()=>setFullNotes(x=>!x)}>{fullNotes?"Hide Full Notes":"Read Full Notes"}</button>
      <button onClick={()=>router.push("/knowledge-vault/quick-scan?object="+encodeURIComponent(object.id))}>Quick Scan →</button>
    </div>
    {error && <p role="alert" className="kv-focus-save-error">{error}</p>}
    <FocusQuest key={object.id} object={object} onRate={saveRating} onReadFull={openFullNotes}
      onNext={nextObject?()=>router.push("/knowledge-vault/object/"+nextObject.id):undefined}/>
    {fullNotes && <div id="kv-full-reference" className="kv-full-reference"><div className="kv-reference-heading"><div><span>DEEP-DIVE REFERENCE</span><h2>Full canonical explanation</h2><p>Read at your own pace. The short challenge is always available above.</p></div><button onClick={()=>setFullNotes(false)}>Collapse ↑</button></div><LearningObjectRenderer object={object} sources={sources}/></div>}
    <Related object={object} userId={userId} onNext={setNextObject}/>
  </>;
}

const relatedCache=new Map<string,{at:number;rows:Obj[]}>();
const relatedInFlight=new Map<string,Promise<Obj[]>>();
async function getRelatedRows(category:string):Promise<Obj[]>{
  const hit=relatedCache.get(category);
  if(hit && Date.now()-hit.at<300000)return hit.rows;
  const pending=relatedInFlight.get(category);
  if(pending)return pending;
  const promise=(async()=>{
    const response=await fetch("/api/knowledge-vault?action=list&category="+encodeURIComponent(category)+"&limit=20");
    const data=await response.json();
    if(!response.ok||!data.ok)throw new Error(data.error || "No related lessons.");
    const rows=Array.isArray(data.objects)?data.objects:[];
    relatedCache.set(category,{at:Date.now(),rows});
    return rows;
  })();
  relatedInFlight.set(category,promise);
  try{return await promise;}finally{relatedInFlight.delete(category);}
}
function Related({object,userId,onNext}:{object:Obj;userId:string;onNext:(item:Obj|null)=>void}){
  const router=useRouter();
  const [rows,setRows]=useState<Obj[]>([]);
  useEffect(()=>{
    if(!object?.category_slug)return;
    let active=true;
    void getRelatedRows(object.category_slug).then(items=>{
      if(!active)return;
      const currentIndex=items.findIndex(x=>x.id===object.id);
      const ordered=currentIndex>=0 ? [...items.slice(currentIndex+1),...items.slice(0,currentIndex)] : items;
      const next=ordered.filter(x=>x.id!==object.id).slice(0,3);
      setRows(next);
      onNext(next[0] || null);
      // First follow-on lesson loads in the background while user studies.
      if(next[0] && userId)prefetchKVObject(next[0].id,userId);
    }).catch(()=>{});
    return()=>{active=false;};
  },[object.id,object.category_slug,userId]);
  if(!rows.length)return null;
  return <section className="kv-mode-card kv-related-lessons"><div className="kv-related-title"><div><small>YOUR NEXT SMALL STEP</small><h3>Keep your momentum</h3></div><span>Same category · one lesson at a time</span></div>
    <div className="kv-browser-grid">{rows.map(x=><button key={x.id} className="kv-browser-card" onMouseEnter={()=>prefetchKVObject(x.id,userId)} onFocus={()=>prefetchKVObject(x.id,userId)} onClick={()=>router.push("/knowledge-vault/object/"+x.id)}>
      <small>{x.category}</small><h3>{x.title}</h3><p>{x.topic||x.content_type}</p><b>Play mini lesson →</b>
    </button>)}</div>
  </section>;
}

function Learn({category,search}:{category:string;search:string}){
  const router=useRouter();
  const profile=useAuthProfile();
  const [rows,setRows]=useState<Obj[]>([]);const [universe,setUniverse]=useState("");const [difficulty,setDifficulty]=useState("");const [busy,setBusy]=useState(true);
  useEffect(()=>{const timer=setTimeout(async()=>{setBusy(true);const p=new URLSearchParams({action:"list",limit:"50"});if(category)p.set("category",category);if(universe)p.set("universe",universe);if(search)p.set("q",search);const res=await fetch(`/api/knowledge-vault?${p}`);const data=await res.json();let list=data.ok?(data.objects||[]):[];if(difficulty)list=list.filter((x:Obj)=>String(x.difficulty||5)===difficulty);setRows(list);setBusy(false);},100);return()=>clearTimeout(timer);},[category,universe,difficulty,search]);
  return <section className="kv-mode-card"><div className="kv-filter-row"><select value={universe} onChange={e=>setUniverse(e.target.value)}><option value="">All Universes</option><option>Technicals</option><option>Market History</option><option>Legendary Trades & Deals</option><option>Crises & Events</option><option>Finance Facts</option></select><select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="">All Difficulty</option>{[1,2,3,4,5,6,7,8,9,10].map(x=><option key={x}>{x}</option>)}</select><button onClick={()=>router.push("/knowledge-vault/quick-scan")}>Start Quick Scan →</button></div>{busy?<p>Loading…</p>:rows.length?<div className="kv-browser-grid">{rows.map(x=><button className="kv-browser-card" key={x.id} onMouseEnter={()=>{if(profile?.id)prefetchKVObject(x.id,profile.id);}} onFocus={()=>{if(profile?.id)prefetchKVObject(x.id,profile.id);}} onClick={()=>router.push(`/knowledge-vault/object/${x.id}`)}><small>{x.universe} · D{x.difficulty}</small><h3>{x.title}</h3><p>{x.category} · {x.topic||x.content_type}</p></button>)}</div>:<Empty/>}</section>;
}

function Universe({slug}:{slug:string}){
  const router=useRouter();
  const universeMap:Record<string,string>={"technicals":"Technicals","market-history":"Market History","legendary-trades-deals":"Legendary Trades & Deals","crises-events":"Crises & Events","finance-facts":"Finance Facts"};const universe=universeMap[slug]||titleCase(slug);const [cats,setCats]=useState<any[]>([]);
  useEffect(()=>{(async()=>{const res=await fetch(`/api/knowledge-vault?action=categories&universe=${encodeURIComponent(universe)}`);const data=await res.json();if(data.ok)setCats(data.categories||[]);})();},[universe]);
  if(!cats.length)return <Empty text={`No ${universe} categories found.`}/>;return <section className="kv-mode-card"><div className="kv-browser-grid">{cats.map(c=><button className="kv-browser-card" key={c.slug} onClick={()=>router.push(`/knowledge-vault/category/${c.slug}`)}><small>{universe}</small><h3>{c.name}</h3><p>{c.count||120} live objects</p><b>Continue →</b></button>)}</div></section>;
}

function QuickScan(){
  const router=useRouter();
  const [rows,setRows]=useState<Obj[]>([]);const [index,setIndex]=useState(0);const [revealed,setRevealed]=useState(false);const [session,setSession]=useState<any>(null);const [busy,setBusy]=useState(true);const [response,setResponse]=useState("");const [saved,setSaved]=useState(false);const [startedAt,setStartedAt]=useState(Date.now());
  async function load(){setBusy(true);const qs=new URLSearchParams(window.location.search);const count=Math.min(50,Math.max(1,Number(qs.get("count")||10)));const single=qs.get("object");let objects:Obj[]=[];if(single){const one=await fetch(`/api/knowledge-vault?action=object&id=${encodeURIComponent(single)}`);const oneData=await one.json();if(oneData.ok)objects=[oneData.object];}else{const p=new URLSearchParams({action:"session-objects",clientKey:clientKey(),count:String(count)});if(qs.get("review"))p.set("review","1");const res=await fetch(`/api/knowledge-vault?${p}`);const data=await res.json();objects=data.ok?(data.objects||[]):[];}setRows(objects);setStartedAt(Date.now());if(objects.length){const s=await fetch("/api/knowledge-vault",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"startSession",clientKey:clientKey(),mode:qs.get("today")?"todays5":"quick_scan",objectIds:objects.map((x:Obj)=>x.id),settings:{count:objects.length}})});const sj=await s.json();if(sj.ok)setSession(sj.session);}setBusy(false);}
  useEffect(()=>{void load();},[]);
  const current=rows[index];
  async function saveResponse(){if(!current||!response.trim())return;const res=await fetch("/api/knowledge-vault",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"saveResponse",clientKey:clientKey(),objectId:current.id,response})});const data=await res.json();if(data.ok)setSaved(true);}
  async function rate(rating:string){if(!current)return;const isCorrect=rating==="Got It"||rating==="Mastered";await fetch("/api/knowledge-vault",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"rate",clientKey:clientKey(),objectId:current.id,rating,response:response.trim()})});const next=index+1;if(session){const correctCount=Number(session.correct_count||0)+(isCorrect?1:0);const incorrectCount=Number(session.incorrect_count||0)+(isCorrect?0:1);const attempts=correctCount+incorrectCount;const score=attempts?Math.round(correctCount/attempts*100):0;const durationSeconds=Math.max(1,Math.round((Date.now()-startedAt)/1000));await fetch("/api/knowledge-vault",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"updateSession",clientKey:clientKey(),sessionId:session.id,current_index:next,correct_count:correctCount,incorrect_count:incorrectCount,score,duration_seconds:durationSeconds,result:{accuracy:score},status:next>=rows.length?"completed":"active"})});setSession({...session,correct_count:correctCount,incorrect_count:incorrectCount,score,duration_seconds:durationSeconds});}if(next>=rows.length){setIndex(rows.length);setRevealed(false);}else{setIndex(next);setRevealed(false);setResponse("");setSaved(false);}}
  useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key===" "&&document.activeElement?.tagName!=="TEXTAREA"){e.preventDefault();setRevealed(true);}if(revealed&&e.key==="1")void rate("Again");if(revealed&&e.key==="2")void rate("Hard");if(revealed&&e.key==="3")void rate("Got It");if(revealed&&e.key==="4")void rate("Mastered");if(e.key==="Escape")router.push("/knowledge-vault");};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[revealed,current,index,session,rows.length,response]);
  if(busy)return <div className="kv-mode-card">Loading your fast session…</div>;if(!rows.length)return <Empty text="No Quick Scan objects matched this request."/>;if(index>=rows.length)return <section className="kv-mode-card kv-empty"><b>Session complete.</b><p>Your solved objects, saved responses, score and timestamps are now in Knowledge Vault Analytics.</p><button onClick={()=>router.push("/dashboard/knowledge-vault")}>View Knowledge Analytics →</button></section>;
  return <div className="kv-session-shell"><div className="kv-session-bar"><span>Knowledge Vault › {current.category}</span><b>{index+1} / {rows.length}</b><span>D{current.difficulty} · {current.source_kind==="source_grounded"?"Verified Source":"Capital Forge Authored"}</span></div><div className="kv-session-card"><div className="kv-object-meta"><span>{current.universe}</span><span>{current.category}</span><span>{current.content_type}</span></div><h2>{current.title}</h2><div className="kv-object-prompt"><small>{current.question_type||"Recall Prompt"}</small><p>{current.prompt||"Recall the core idea, mechanics and why it matters."}</p></div><textarea value={response} onChange={e=>{setResponse(e.target.value);setSaved(false);}} placeholder="Write your response here before revealing the canonical answer…" style={{width:"100%",minHeight:110,border:"1px solid #d8e0ea",borderRadius:10,padding:12,font:"inherit",resize:"vertical",boxSizing:"border-box",margin:"10px 0"}}/>{revealed?<LearningObjectRenderer object={current} compact/>:<button className="kv-reveal" onClick={()=>setRevealed(true)}>Reveal Answer <small>(Space)</small></button>}</div>{revealed&&<><div className="kv-filter-row" style={{marginTop:10}}><button onClick={()=>void saveResponse()} disabled={!response.trim()}>{saved?"✓ Response Saved in Dashboard":"Save This Response"}</button></div><div className="kv-rating-bar"><button onClick={()=>rate("Again")}>1 · Again</button><button onClick={()=>rate("Hard")}>2 · Hard</button><button onClick={()=>rate("Got It")}>3 · Got It</button><button onClick={()=>rate("Mastered")}>4 · Mastered</button></div></>}</div>;
}

function Quiz(){
  const router=useRouter();
  const [count,setCount]=useState(10);const [started,setStarted]=useState(false);if(started)return <QuickScan/>;return <section className="kv-mode-card"><h2>Knowledge Quiz</h2><p>Build a persisted quiz from canonical Knowledge Vault objects.</p><div className="kv-filter-row"><select value={count} onChange={e=>setCount(Number(e.target.value))}>{[5,10,20,50].map(x=><option key={x} value={x}>{x} questions</option>)}</select><select><option>All Universes</option><option>Technicals</option><option>Market History</option><option>Crises & Events</option></select><select><option>All Difficulty</option><option>Previously incorrect</option><option>Unseen</option><option>Bookmarked</option></select><button onClick={()=>{router.replace(`/knowledge-vault/quiz?count=${count}`,{scroll:false});setStarted(true);}}>Start Quiz →</button></div></section>;
}

function Timeline({search}:{search:string}){const router=useRouter();const [rows,setRows]=useState<Obj[]>([]);useEffect(()=>{(async()=>{const p=new URLSearchParams({action:"timeline",limit:"50"});if(search)p.set("q",search);const res=await fetch(`/api/knowledge-vault?${p}`);const data=await res.json();if(data.ok)setRows(data.objects||[]);})();},[search]);if(!rows.length)return <Empty text="No dated events matched this view."/>;return <section className="kv-mode-card"><div className="kv-filter-row"><select><option>All Events</option><option>Crises</option><option>Central Banks</option><option>Corporate</option><option>Trades</option><option>M&A</option><option>IPO</option><option>Currency</option><option>Bank Failures</option></select></div>{rows.map(x=><button key={x.id} className="kv-browser-card" style={{width:"100%",marginBottom:8}} onClick={()=>router.push(`/knowledge-vault/object/${x.id}`)}><small>{x.event_date} · {x.category}</small><h3>{x.title}</h3></button>)}</section>}

function Saved(){const router=useRouter();const profile=useAuthProfile();const [kind,setKind]=useState("bookmarks");const [rows,setRows]=useState<Obj[]>([]);useEffect(()=>{const qs=new URLSearchParams(window.location.search);const initial=qs.get("kind")||kind;setKind(initial);},[]);useEffect(()=>{(async()=>{const res=await fetch(`/api/knowledge-vault?action=saved&clientKey=${encodeURIComponent(clientKey())}&kind=${encodeURIComponent(kind)}`,{cache:"no-store"});const data=await res.json();if(data.ok)setRows(data.objects||[]);})();},[kind]);return <section className="kv-mode-card"><div className="kv-filter-row">{[["bookmarks","Bookmarks"],["responses","Saved Responses"],["incorrect","Incorrect Answers"],["review","Review Later"],["mastered","Mastered"],["recent","Recently Viewed"]].map(([k,l])=><button key={k} onClick={()=>setKind(k)}>{l}</button>)}</div>{rows.length?<div className="kv-browser-grid">{rows.map(x=><button className="kv-browser-card" key={x.id} onMouseEnter={()=>{if(profile?.id)prefetchKVObject(x.id,profile.id);}} onFocus={()=>{if(profile?.id)prefetchKVObject(x.id,profile.id);}} onClick={()=>router.push(`/knowledge-vault/object/${x.id}`)}><small>{x.category}</small><h3>{x.title}</h3><p>{x.progress?.response_saved?`Saved response: ${String(x.progress?.user_response||"").slice(0,90)}${String(x.progress?.user_response||"").length>90?"…":""}`:x.progress?.status||"Saved"}</p></button>)}</div>:<Empty text="Nothing saved in this view yet."/>}</section>}

function ProgressRedirect(){const router=useRouter();useEffect(()=>{router.replace("/dashboard/knowledge-vault");},[]);return <div className="kv-mode-card">Opening Knowledge Vault Analytics…</div>}
