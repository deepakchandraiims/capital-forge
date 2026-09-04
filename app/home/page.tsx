"use client";

import { useEffect, useMemo, useState } from "react";

type Tone = "blue" | "red" | "green" | "purple" | "black";
type NewsItem = { id:string; tag:string; tone?:Tone; title:string; summary:string; time:string; imageUrl?:string; source?:string; url?:string };
type Store = { xp?:number; attempts?:Array<{correct?:boolean}>; streak?:number };

const tabs=["Home","Practice","Advanced","Dashboard","Feedback","Interview Room","API"];
const icons:Record<string,string>={Home:"⌂",Practice:"▣",Advanced:"▥",Dashboard:"▦",Feedback:"▱","Interview Room":"▻",API:"⌘"};
const fallbackImages=[
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1460317442991-0ec209397118?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1446776709462-d6b525c57bd3?q=80&w=1000&auto=format&fit=crop"
];
const fallback:NewsItem[]=[
  {id:"h1",tag:"Markets",tone:"green",title:"Equities reprice growth, rates and earnings expectations",summary:"Use the move to think through discount rates, valuation and sector sensitivity.",time:"2h ago",source:"Capital Forge",imageUrl:fallbackImages[0]},
  {id:"h2",tag:"AI & Tech",tone:"purple",title:"AI investment keeps reshaping technology valuation debates",summary:"Revenue growth, margin durability and terminal value remain central questions.",time:"3h ago",source:"Capital Forge",imageUrl:fallbackImages[1]},
  {id:"h3",tag:"Strategy",tone:"blue",title:"Private equity stays selective as exit markets normalize",summary:"Sponsors are prioritizing cash conversion, leverage headroom and downside cases.",time:"4h ago",source:"Capital Forge",imageUrl:fallbackImages[2]},
  {id:"h4",tag:"Business",tone:"red",title:"Infrastructure and renewables M&A remains active",summary:"Strategic and financial buyers continue to screen cash-generative platforms.",time:"5h ago",source:"Capital Forge",imageUrl:fallbackImages[3]},
  {id:"h5",tag:"Global",tone:"blue",title:"Global markets await the next central-bank signal",summary:"Rates, currencies and risk appetite remain key cross-asset drivers.",time:"6h ago",source:"Capital Forge",imageUrl:fallbackImages[4]}
];
const cases=[
  ["Financial Modeling","Build a 3-Statement Model","Build a full operating model and derive key valuation metrics.","Medium","45 min"],
  ["Valuation","DCF Valuation Analysis","Estimate intrinsic value and run sensitivities on major assumptions.","Medium","40 min"],
  ["M&A","Buy-Side M&A Case","Assess acquisition logic, synergies, financing and accretion/dilution.","Hard","60 min"],
  ["Market Analysis","Market Entry Strategy","Evaluate attractiveness and propose a defensible go-to-market strategy.","Medium","35 min"]
];

function nav(tab:string){
  if(tab==="Home") window.location.assign("/home");
  else if(tab==="Dashboard") window.location.assign("/dashboard");
  else if(tab==="Feedback") window.location.assign("/feedback");
  else window.location.assign(`/?open=${encodeURIComponent(tab)}`);
}
function ensureFive(items:NewsItem[]){
  const out=items.slice(0,5).map((x,i)=>({...x,imageUrl:x.imageUrl||fallbackImages[i]}));
  for(let i=out.length;i<5;i++) out.push({...fallback[i],id:`fill-${i}`});
  return out.slice(0,5);
}

export default function HomePage(){
  const [news,setNews]=useState<NewsItem[]>(fallback);
  const [busy,setBusy]=useState(false);
  const [store,setStore]=useState<Store>({xp:0,attempts:[],streak:0});
  const [lastUpdated,setLastUpdated]=useState("Just now");

  useEffect(()=>{
    try{
      const keys=["capital-forge-prepmate-live-v2","capital-forge-practice-workstation-fixed-v3","capital-forge-practice-workstation-v1"];
      for(const key of keys){const raw=localStorage.getItem(key);if(raw){const parsed=JSON.parse(raw);setStore(parsed);break;}}
    }catch{}
    void refreshNews();
  },[]);

  async function refreshNews(){
    setBusy(true);
    try{
      const res=await fetch("/api/news?limit=5",{cache:"no-store"});
      const data=await res.json();
      setNews(ensureFive(Array.isArray(data.news)?data.news:fallback));
      setLastUpdated(new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));
    }catch{setNews(fallback);}finally{setBusy(false);}
  }

  const visible=useMemo(()=>ensureFive(news),[news]);
  const attempts=store.attempts||[];
  const accuracy=attempts.length?Math.round(attempts.filter(x=>x.correct).length/attempts.length*100):0;
  const xp=store.xp||0;
  const progress=Math.min(100,Math.max(0,Math.round(xp/20)));
  const streak=store.streak||7;

  return <div className="home-app">
    <header className="home-header">
      <div className="home-brand"><div className="home-brand-mark">CF</div><div><b>Capital Forge</b><small>Master Finance. Build Your Future.</small></div></div>
      <div className="home-search"><span>⌕</span><input placeholder="Search topics, news, cases, questions..."/><kbd>⌘ K</kbd></div>
      <button className="home-ai-btn" onClick={()=>nav("Advanced")}>✦ AI Assistant</button><button className="home-bell">🔔</button><button className="home-trophy">🏆</button>
      <div className="home-profile"><div className="home-avatar">DC</div><div><b>Deepak</b><small>Keep Going!</small></div><span>⌄</span></div>
    </header>

    <aside className="home-sidebar"><nav>{tabs.map(tab=><button key={tab} className={tab==="Home"?"active":""} onClick={()=>nav(tab)}><span>{icons[tab]}</span>{tab}</button>)}</nav><div className="home-upgrade"><h3>Upgrade to Pro</h3><p>Unlock advanced AI, analytics, feedback and unlimited practice.</p><button>⚡ Upgrade Now</button></div><div className="home-version">Capital Forge v1.4.0<br/>Built for your best tomorrow.</div></aside>

    <main className="home-workspace">
      <div className="home-grid">
        <section className="home-maincol">
          <section className="home-hero-card"><div className="home-hero-copy"><p className="home-eyebrow">AI-powered finance learning</p><h1>Welcome back, <span>Deepak!</span> 👋</h1><p>Practice smarter across IB, PE, VC, private credit, valuation, markets and interviews.</p><div className="home-kpis"><Kpi label="AI Accuracy" value={`${accuracy}%`} tone="green"/><Kpi label="Questions Solved" value={String(attempts.length)} tone="blue"/><Kpi label="Time Saved" value={`${Math.max(12,Math.round(xp/30))}h`} tone="red"/></div></div><div className="home-hero-art"><div className="home-float f1">DCF</div><div className="home-float f2">LBO</div><div className="home-cube">AI</div></div></section>

          <section className="home-section news-section"><div className="home-section-head"><div><h2><i className="live-dot"/>Live News & Updates</h2><p>Curated insights from markets, AI, and global finance.</p></div><div className="home-refresh-wrap"><small>Last updated: {lastUpdated}</small><button onClick={refreshNews}>{busy?"Refreshing...":"↻ Refresh"}</button></div></div><div className="home-news-grid">{visible.map((item,i)=><article key={item.id}><div className="home-news-img" style={{backgroundImage:`url(${item.imageUrl||fallbackImages[i]})`}}/><div className="home-news-meta"><span className={item.tone||"blue"}>{item.tag}</span><small>{item.time}</small></div><h3>{item.title}</h3><p>{item.summary}</p><div className="home-news-foot"><small>{item.source||"Marketaux"}</small>{item.url?<a href={item.url} target="_blank" rel="noreferrer">Read →</a>:<span>Read →</span>}</div></article>)}</div></section>

          <section className="home-section cases-section"><div className="home-section-head"><div><h2>📕 Featured Short Cases</h2><p>Real-world scenarios to sharpen your thinking.</p></div><button onClick={()=>nav("Practice")}>↻ Refresh Cases</button></div><div className="home-case-grid">{cases.map((c,i)=><article key={c[1]}><div><span>Case {i+1}</span><b>{c[0]}</b></div><h3>{c[1]}</h3><p>{c[2]}</p><small>{c[3]} · ~{c[4]}</small><button onClick={()=>nav("Practice")}>Solve Now →</button></article>)}</div></section>
        </section>

        <aside className="home-rail">
          <section className="home-rail-card progress-card"><div className="home-rail-head"><h3>Your Progress</h3><button onClick={()=>nav("Dashboard")}>View Dashboard →</button></div><div className="home-progress-body"><div className="home-donut" style={{background:`conic-gradient(#0875fa 0 ${Math.max(18,progress)}%,#e9eef5 ${Math.max(18,progress)}% 100%)`}}><div><b>{Math.max(18,progress)}%</b><small>Overall</small></div></div><div className="home-progress-list"><Progress label="Practice" value={Math.max(20,accuracy)} tone="green"/><Progress label="Advanced" value={64} tone="blue"/><Progress label="Interview" value={Math.max(18,attempts.length*5)} tone="purple"/></div></div></section>
          <section className="home-rail-card streak-card"><div><h3>🔥 7 Day Streak</h3><p>Keep it up!</p></div><b>{streak}<small>Days</small></b><div className="home-days">{["M","T","W","T","F","S","S"].map((d,i)=><span key={i} className={i<5?"done":""}>{i<4?"✓":d}</span>)}</div></section>
          <section className="home-rail-card insight-card"><h3>AI Insights <em>New</em></h3><p>You perform best in Valuation and Modeling. Focus on Market Analysis to balance your skill set and improve interview readiness.</p><div><button onClick={()=>nav("Dashboard")}>View Insights →</button><span>AI</span></div></section>
          <section className="home-rail-card"><h3>Recommended For You</h3><div className="home-reco"><button onClick={()=>nav("Advanced")}><span>🎯</span><b>Complete 5 more Advanced questions<small>+120 XP</small></b><i>›</i></button><button onClick={()=>nav("Practice")}><span>🧠</span><b>Try a Hard case this weekend<small>+150 XP</small></b><i>›</i></button><button onClick={()=>nav("Interview Room")}><span>👤</span><b>Book a mock interview<small>+200 XP</small></b><i>›</i></button></div></section>
          <section className="home-rail-card"><h3>Quick Actions</h3><div className="home-quick"><button onClick={()=>nav("Practice")}><span>▶</span><small>Start Practice</small></button><button onClick={()=>nav("Advanced")}><span>▥</span><small>Go to Advanced</small></button><button onClick={()=>nav("Interview Room")}><span>▣</span><small>Interview Room</small></button><button onClick={()=>nav("Feedback")}><span>▱</span><small>Feedback</small></button></div></section>
        </aside>
      </div>
    </main>
  </div>
}

function Kpi({label,value,tone}:{label:string;value:string;tone:string}){return <div className={`home-kpi ${tone}`}><small>{label}</small><b>{value}</b></div>}
function Progress({label,value,tone}:{label:string;value:number;tone:string}){return <div><span>{label}</span><i><b className={tone} style={{width:`${Math.min(100,value)}%`}}/></i><small>{Math.min(100,value)}%</small></div>}
