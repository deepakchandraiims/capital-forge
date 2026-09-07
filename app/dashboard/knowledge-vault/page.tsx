"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PRIMARY_NAV, NAV_ICONS, routeForNav } from "../../navigation";
import LiveDateTime from "../../LiveDateTime";
import { profileDisplayName, profileInitials, useAuthProfile } from "../../AuthProvider";

const tabs=PRIMARY_NAV;
const icons=NAV_ICONS;
const universeOrder=["Technicals","Market History","Legendary Trades & Deals","Crises & Events","Finance Facts"];
const universeTotals:Record<string,number>={"Technicals":1200,"Market History":480,"Legendary Trades & Deals":600,"Crises & Events":480,"Finance Facts":240};
const universeIcons:Record<string,string>={"Technicals":"▥","Market History":"▤","Legendary Trades & Deals":"▥","Crises & Events":"◎","Finance Facts":"◉"};

function clientKey(){const k="capital-forge-kv-client-v1";let v=localStorage.getItem(k);if(!v){v=`cfkv-${crypto.randomUUID()}`;localStorage.setItem(k,v);}return v;}
function asPercent(n:number,d:number){return d?Math.round((n/d)*100):0;}
function ago(value?:string){if(!value)return "";const diff=Date.now()-new Date(value).getTime();const m=Math.max(0,Math.floor(diff/60000));if(m<1)return"just now";if(m<60)return `${m} min ago`;const h=Math.floor(m/60);if(h<24)return `${h} hr${h===1?"":"s"} ago`;const d=Math.floor(h/24);return `${d} day${d===1?"":"s"} ago`;}

type Row={name:string;reviewed:number;mastered:number;attempts:number;correct:number;accuracy:number};
type Session={mode:string;status:string;last_activity_at?:string;duration_seconds?:number;result?:any;score?:number;correct_count?:number;incorrect_count?:number};
type Analytics={reviewed:number;mastered:number;recallAccuracy:number;reviewDue:number;savedResponses:number;streak:number;byUniverse:Row[];byCategory:Row[];sessions:Session[]};
type Recent={id:string;title:string;category:string;universe:string;content_type?:string;progress?:{status?:string;last_seen_at?:string;last_result?:string;response_saved?:boolean;user_response?:string;solved_at?:string}};
type Category={name:string;slug:string;universe:string;count:number};

const emptyAnalytics:Analytics={reviewed:0,mastered:0,recallAccuracy:0,reviewDue:0,savedResponses:0,streak:0,byUniverse:[],byCategory:[],sessions:[]};

export default function KnowledgeVaultDashboard(){
  const router=useRouter();
  const profile=useAuthProfile();
  const displayName=profileDisplayName(profile);
  const initials=profileInitials(profile);
  function go(tab:string){const route=routeForNav(tab);if(route)router.push(route);}
  const [a,setA]=useState<Analytics>(emptyAnalytics);
  const [recent,setRecent]=useState<Recent[]>([]);
  const [categories,setCategories]=useState<Category[]>([]);
  const [goal,setGoal]=useState<any>(null);
  const [goalOpen,setGoalOpen]=useState(false);
  const [goalTarget,setGoalTarget]=useState(50);
  const [goalPeriod,setGoalPeriod]=useState("week");
  const [rangeDays,setRangeDays]=useState(30);
  const [serverTime,setServerTime]=useState("");
  const [resetting,setResetting]=useState(false);
  const [notice,setNotice]=useState("");

  async function refresh(){
    const key=clientKey();
    const [ar,lr,cr]=await Promise.all([
      fetch(`/api/knowledge-vault?action=analytics&clientKey=${encodeURIComponent(key)}`,{cache:"no-store"}),
      fetch(`/api/knowledge-vault?action=landing&clientKey=${encodeURIComponent(key)}`,{cache:"no-store"}),
      fetch(`/api/knowledge-vault?action=categories`)
    ]);
    const [ad,ld,cd]=await Promise.all([ar.json(),lr.json(),cr.json()]);
    if(ad.ok){setA({...emptyAnalytics,...ad.analytics,sessions:ad.analytics?.sessions||[]});setServerTime(ad.serverTime||"");}
    if(ld.ok){setRecent(ld.recent||[]);setGoal(ld.goal||null);if(!serverTime&&ld.serverTime)setServerTime(ld.serverTime);}
    if(cd.ok)setCategories(cd.categories||[]);
  }
  useEffect(()=>{void refresh();},[]);

  const strong=useMemo(()=>[...a.byCategory].filter(x=>x.attempts>0).sort((x,y)=>(y.accuracy||0)-(x.accuracy||0)||y.reviewed-x.reviewed).slice(0,5),[a.byCategory]);
  const weak=useMemo(()=>[...a.byCategory].filter(x=>x.attempts>0).sort((x,y)=>(x.accuracy||0)-(y.accuracy||0)||y.reviewed-x.reviewed).slice(0,5),[a.byCategory]);
  const cutoff=Date.now()-rangeDays*86400000;
  const sessions=useMemo(()=>(a.sessions||[]).filter(s=>!s.last_activity_at||new Date(s.last_activity_at).getTime()>=cutoff),[a.sessions,cutoff]);
  const minutes=Math.round(sessions.reduce((n,s)=>n+Number(s.duration_seconds||0),0)/60);
  const modeRows=useMemo(()=>{
    const labels:Record<string,string>={quick_scan:"Quick Scan",todays5:"Quick Scan",learn:"Learn",quiz:"Quiz",timeline:"Timeline",saved:"Saved/Review"};
    const bucket=new Map<string,number>();
    for(const s of sessions){const label=labels[s.mode]||"Other";bucket.set(label,(bucket.get(label)||0)+1);}
    return ["Quick Scan","Learn","Quiz","Timeline","Saved/Review"].map(name=>({name,count:bucket.get(name)||0}));
  },[sessions]);
  const sessionTotal=modeRows.reduce((n,x)=>n+x.count,0);
  const donutStops=useMemo(()=>{const palette=["#1478f2","#20b987","#ff535f","#f5b82e","#7856e8"];let cursor=0;const parts:string[]=[];modeRows.forEach((x,i)=>{const share=sessionTotal?(x.count/sessionTotal)*100:0;parts.push(`${palette[i]} ${cursor}% ${cursor+share}%`);cursor+=share;});return sessionTotal?`conic-gradient(${parts.join(",")})`:"conic-gradient(#eef3f8 0 100%)";},[modeRows,sessionTotal]);
  const completion=asPercent(a.reviewed,3000);
  const categoryProgress=useMemo(()=>new Map(a.byCategory.map(x=>[x.name,x])),[a.byCategory]);
  const categoriesByUniverse=useMemo(()=>universeOrder.map(universe=>({universe,rows:categories.filter(c=>c.universe===universe)})),[categories]);
  const trend=useMemo(()=>{
    const pts=sessions.map(s=>{const raw=typeof s.result?.accuracy==="number"?s.result.accuracy:typeof s.score==="number"?s.score:null;return raw===null||!s.last_activity_at?null:{date:new Date(s.last_activity_at),value:Math.max(0,Math.min(100,Number(raw)))};}).filter(Boolean) as {date:Date;value:number}[];
    return pts.sort((x,y)=>x.date.getTime()-y.date.getTime());
  },[sessions]);

  async function createGoal(){
    const res=await fetch("/api/knowledge-vault",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"goal",clientKey:clientKey(),goalType:"objects",target:goalTarget,period:goalPeriod})});
    const data=await res.json();if(data.ok){setGoal(data.goal);setGoalOpen(false);}
  }

  async function resetAllHistory(){
    if(!window.confirm("Reset ALL Capital Forge history? Practice attempts, Vault learning, saved responses, goals and session history will return to 0."))return;
    setResetting(true);setNotice("");
    try{
      const res=await fetch("/api/knowledge-vault",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"resetAll",clientKey:clientKey()})});
      const data=await res.json();if(!data.ok)throw new Error(data.error||"Reset failed.");
      ["capital-forge-canonical-practice-v1","capital-forge-practice-bookmarks-v1","capital-forge-practice-workstation-fixed-v3","capital-forge-prepmate-live-v2","capital-forge-practice-workstation-v1","capital-forge-advanced-progress-v1","capital-forge-dashboard-goal-v1","capital-forge-focus-practice-v1"].forEach(k=>localStorage.removeItem(k));
      setA(emptyAnalytics);setRecent([]);setGoal(null);setNotice("Reset complete — Practice and Knowledge Vault history are now 0. Start fresh whenever you’re ready.");setServerTime(data.resetAt||new Date().toISOString());
    }catch(e){setNotice(e instanceof Error?e.message:"Reset failed.");}
    finally{setResetting(false);}
  }

  return <div className="dash-app kv-analytics-page">
    <header className="dash-header"><div className="dash-brand"><div className="dash-brand-mark">CF</div><div><b>Capital Forge</b><small>Master Finance. Build Your Future.</small></div></div><div className="dash-header-mid"><div className="dash-search"><span>⌕</span><input placeholder="Search topics, companies, trades, events or concepts..."/><kbd>⌘ K</kbd></div></div><div className="dash-header-right"><LiveDateTime compact/><button className="dash-ai" onClick={()=>go("Advanced")}>✦ AI Assistant</button><button className="dash-profile" onClick={()=>router.push("/account")}><div className="dash-avatar">{initials}</div><div><b>{displayName}</b><small>Capital Forge</small></div><span className="dash-caret">⌄</span></button></div></header>
    <aside className="dash-sidebar"><nav className="dash-nav">{tabs.map(tab=><button key={tab} className={tab==="Dashboard"?"active":""} onClick={()=>tab==="Dashboard"?undefined:go(tab)}><span>{icons[tab]}</span>{tab}</button>)}</nav><div className="dash-upgrade"><h3>Knowledge Vault</h3><p>Your permanent finance memory system across 3,000 canonical learning objects.</p><button onClick={()=>go("Knowledge Vault")}>Continue Learning →</button></div><div className="dash-version">Capital Forge · Live Knowledge Analytics<br/>Actual timestamps · saved responses · real scores.</div></aside>
    <main className="dash-workspace"><div className="kv-dash-wrap">
      <div className="kv-dashboard-switch"><button onClick={()=>router.push("/dashboard")}>▥ &nbsp; Practice & Skills</button><button className="active">▣ &nbsp; Knowledge Vault</button></div>

      <div className="kv-dash-title"><div><h1>Knowledge Vault Analytics</h1><p>Live progress from your saved responses, ratings, session scores and timestamps across 3,000 objects.</p>{notice&&<small style={{display:"block",marginTop:6,color:notice.startsWith("Reset complete")?"#138a63":"#c23b49",fontWeight:800}}>{notice}</small>}{serverTime&&<small style={{display:"block",marginTop:4,color:"#7b8798"}}>Last server sync: {new Date(serverTime).toLocaleString()}</small>}</div><div style={{display:"flex",gap:8,alignItems:"center"}}><button onClick={resetAllHistory} disabled={resetting} style={{height:38,padding:"0 13px",border:"1px solid #efc5ca",borderRadius:8,background:"#fff5f6",color:"#bf3344",fontWeight:800,cursor:"pointer"}}>{resetting?"Resetting…":"Reset All History"}</button><label className="kv-range">▣ <select value={rangeDays} onChange={e=>setRangeDays(Number(e.target.value))}><option value={7}>Last 7 Days</option><option value={30}>Last 30 Days</option><option value={90}>Last 90 Days</option></select></label></div></div>

      <div className="kv-top-layout">
        <div className="kv-main-column">
          <div className="kv-dash-kpis">
            <Metric icon="▣" tone="blue" label="Solved / Reviewed" value={`${a.reviewed.toLocaleString()} / 3,000`} note={`${completion}% of the Vault covered`}/>
            <Metric icon="♜" tone="green" label="Mastered" value={a.mastered.toLocaleString()} note={`${asPercent(a.mastered,Math.max(1,a.reviewed))}% of solved objects`}/>
            <Metric icon="◎" tone="red" label="Recall Accuracy" value={`${a.recallAccuracy}%`} note="Actual rated Vault attempts"/>
            <Metric icon="♨" tone="orange" label="Current Streak" value={`${a.streak} day${a.streak===1?"":"s"}`} note="Actual session timestamps"/>
            <Metric icon="▤" tone="green" label="Saved Responses" value={a.savedResponses.toLocaleString()} note={`${a.reviewDue} review${a.reviewDue===1?"":"s"} due now`}/>
          </div>

          <div className="kv-middle-grid">
            <section className="kv-dash-card kv-progress-card"><div className="kv-dash-head"><h3>Progress by Universe</h3><div className="kv-legend"><span><i className="blue"/>Reviewed</span><span><i className="green"/>Mastered</span><span>Accuracy</span></div></div><div className="kv-universe-progress">{universeOrder.map(name=>{const x=a.byUniverse.find(y=>y.name===name)||{reviewed:0,mastered:0,accuracy:0};const total=universeTotals[name];return <div className="kv-universe-row" key={name}><div className="kv-u-name"><span>{universeIcons[name]}</span><b>{name}</b></div><div className="kv-u-bars"><i><em className="reviewed" style={{width:`${asPercent(x.reviewed,total)}%`}}/></i><i><em className="mastered" style={{width:`${asPercent(x.mastered,total)}%`}}/></i></div><strong>{x.reviewed} / {total}</strong><strong>{x.mastered}</strong><strong>{x.accuracy}%</strong></div>})}</div></section>

            <section className="kv-dash-card kv-trend-card"><div className="kv-dash-head"><h3>Recall Trend</h3><span className="kv-chip">Accuracy (%)</span></div><TrendChart points={trend}/><div className="kv-trend-stats"><b><strong>{trend.length?Math.round(trend[0].value):0}%</strong><small>Start of period</small></b><b className="gain"><strong>{trend.length>1?`${Math.round(trend[trend.length-1].value-trend[0].value)>=0?"+":""}${Math.round(trend[trend.length-1].value-trend[0].value)}%` : "—"}</strong><small>Improvement</small></b><b><strong>{a.recallAccuracy}%</strong><small>Current accuracy</small></b></div></section>
          </div>

          <div className="kv-lower-grid">
            <section className="kv-dash-card kv-heat-card"><div className="kv-dash-head"><h3>Universe Mastery Heatmap</h3><div className="kv-legend"><span><i className="green"/>High (≥80%)</span><span><i className="amber"/>Medium (50–79%)</span><span><i className="red"/>Low (&lt;50%)</span></div></div>{categories.length?<div className="kv-universe-heatmap">{categoriesByUniverse.map(group=><div className="kv-heat-group" key={group.universe}><h4><span>{universeIcons[group.universe]}</span>{group.universe}</h4>{group.rows.map(c=>{const p=categoryProgress.get(c.name);const accuracy=p?.attempts?p.accuracy:null;const cls=accuracy===null?"none":accuracy>=80?"high":accuracy>=50?"medium":"low";return <button key={c.slug} onClick={()=>router.push(`/knowledge-vault/category/${c.slug}`)}><span>{c.name}</span><i className={cls}/></button>})}</div>)}</div>:<p className="kv-dash-empty">Category analytics are temporarily unavailable.</p>}</section>

            <section className="kv-dash-card kv-recent-card"><div className="kv-dash-head"><h3>Recent Vault Activity</h3><button onClick={()=>router.push("/knowledge-vault/saved?kind=recent")}>View All →</button></div>{recent.length?<div className="kv-recent-list">{recent.slice(0,5).map((r,i)=><button key={r.id} onClick={()=>router.push(`/knowledge-vault/object/${r.id}`)}><span className={`event e${i%5}`}>{r.progress?.status==="mastered"?"✓":r.progress?.response_saved?"▤":r.progress?.last_result==="Again"?"↻":"▣"}</span><div><b>{r.progress?.response_saved?"Response saved":r.progress?.status==="mastered"?"Mastered":r.progress?.last_result?`Reviewed: ${r.progress.last_result}`:"Reviewed"}: {r.title}</b><small>{r.universe} · {r.category}{r.progress?.user_response?` · “${r.progress.user_response.slice(0,70)}${r.progress.user_response.length>70?"…":""}”`:""}</small></div><em>{ago(r.progress?.solved_at||r.progress?.last_seen_at)}</em></button>)}</div>:<p className="kv-dash-empty">Your first solved object or saved response will appear here immediately.</p>}</section>
          </div>

          <div className="kv-continue"><span>✦</span><div><b>Keep going! You’re {completion}% through the Knowledge Vault.</b><p>Every rating and saved response updates this dashboard from real activity.</p></div><button onClick={()=>router.push("/knowledge-vault/quick-scan")}>Continue Learning →</button></div>
        </div>

        <aside className="kv-right-column">
          <section className="kv-dash-card kv-activity-card"><div className="kv-dash-head"><h3>Learning Activity</h3><span>{rangeDays} days</span></div><div className="kv-donut-wrap"><div className="kv-donut" style={{background:donutStops}}><div><b>{sessionTotal}</b><small>Sessions</small></div></div><div className="kv-donut-legend">{modeRows.map((x,i)=><div key={x.name}><i className={`c${i}`}/><span>{x.name}</span><b>{x.count}</b><em>{sessionTotal?`(${Math.round(x.count/sessionTotal*100)}%)`:"(0%)"}</em></div>)}</div></div><div className="kv-activity-foot"><span>{minutes} min studied</span><span>{sessions.length} recorded sessions</span></div></section>

          <section className="kv-dash-card kv-rank-card"><div className="kv-dash-head"><h3>Strongest Categories</h3><button onClick={()=>router.push("/knowledge-vault/learn")}>View All →</button></div><Rank rows={strong} kind="strong"/></section>

          <section className="kv-dash-card kv-rank-card"><div className="kv-dash-head"><h3>Needs Review</h3><button onClick={()=>router.push("/knowledge-vault/quick-scan?review=1")}>View All →</button></div><Rank rows={weak} kind="weak"/></section>

          <section className="kv-dash-card kv-goal-card"><div className="kv-goal-icon">◎</div><div className="kv-goal-copy"><h3>{goal?"Learning Goal":"Set a Learning Goal"}</h3>{goal?<p><b>{goal.target}</b> objects per {goal.period}. Keep the cadence going.</p>:<p>Create a goal to stay focused and track your progress.</p>}{goalOpen?<div className="kv-goal-form"><select value={goalTarget} onChange={e=>setGoalTarget(Number(e.target.value))}><option value={25}>25 objects</option><option value={50}>50 objects</option><option value={100}>100 objects</option><option value={250}>250 objects</option></select><select value={goalPeriod} onChange={e=>setGoalPeriod(e.target.value)}><option value="week">Per week</option><option value="month">Per month</option></select><button onClick={createGoal}>Save Goal</button></div>:<button onClick={()=>setGoalOpen(true)}>{goal?"Change Goal":"Create Goal"} →</button>}</div></section>
        </aside>
      </div>
    </div></main>
  </div>;
}

function Metric({icon,tone,label,value,note}:{icon:string;tone:string;label:string;value:string;note:string}){return <section className="kv-dash-metric"><span className={`kv-metric-icon ${tone}`}>{icon}</span><div><b>{value}</b><strong>{label}</strong><small>{note}</small></div></section>}
function Rank({rows,kind}:{rows:Row[];kind:"strong"|"weak"}){return <div className={`kv-rank ${kind}`}>{rows.length?rows.map((x,i)=><div key={x.name}><span>{i+1}</span><b>{x.name}</b><em>{x.accuracy}%</em><i><u style={{width:`${x.accuracy}%`}}/></i></div>):<p>No measured categories yet. Start reviewing Vault objects to build this ranking.</p>}</div>}
function TrendChart({points}:{points:{date:Date;value:number}[]}){
  if(points.length<2)return <div className="kv-trend-empty"><span>⌁</span><b>Recall trend will appear after scored sessions.</b><small>Quick Scan now stores real score and session duration; no sample values are fabricated.</small></div>;
  const w=620,h=170,pad=18;const minT=points[0].date.getTime(),maxT=points[points.length-1].date.getTime();const range=Math.max(1,maxT-minT);const xy=points.map(p=>({x:pad+((p.date.getTime()-minT)/range)*(w-pad*2),y:h-pad-(p.value/100)*(h-pad*2)}));const poly=xy.map(p=>`${p.x},${p.y}`).join(" ");const area=`${pad},${h-pad} ${poly} ${w-pad},${h-pad}`;
  return <div className="kv-trend-chart"><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Recall accuracy trend">{[0,25,50,75,100].map(v=>{const y=h-pad-(v/100)*(h-pad*2);return <g key={v}><line x1={pad} x2={w-pad} y1={y} y2={y}/><text x="0" y={y+3}>{v}%</text></g>})}<polygon points={area}/><polyline points={poly}/>{xy.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={i===xy.length-1?5:3}/>)}</svg></div>;
}
