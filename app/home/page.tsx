"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PRIMARY_NAV, NAV_ICONS, routeForNav } from "../navigation";
import LiveDateTime from "../LiveDateTime";
import { profileDisplayName, profileInitials, useAuthProfile } from "../AuthProvider";

type Tone = "blue" | "red" | "green" | "purple" | "black";
type NewsItem = { id:string; tag:string; tone?:Tone; title:string; summary:string; time:string; imageUrl?:string; source?:string; url?:string };
type HomeAttempt = { correct?:boolean|null; durationSeconds?:number; at?:string };
type Store = { xp?:number; attempts?:HomeAttempt[]; streak?:number; studySeconds?:number };
type CanonicalCase = {
  id:string;
  source_record_key?:string|null;
  title?:string|null;
  prompt?:string|null;
  case_prompt?:string|null;
  question?:string|null;
  scenario?:string|null;
  context?:string|null;
  difficulty?:number|null;
  seniority?:string|null;
  career_tracks?:string[]|null;
  domain_name?:string|null;
  topic_name?:string|null;
};
type MarketQuote = { price:number|null; change:number|null; percentChange:number|null; currency?:string; timestamp?:string };
type MarketRow = { id:string; label:string; symbol:string; market:string; kind:string; quote?:MarketQuote|null; status:"loading"|"live"|"unavailable" };
type SearchResult = { symbol:string; name:string; exchange?:string; type?:string; currency?:string };

const tabs=PRIMARY_NAV;
const icons=NAV_ICONS;
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
const fallbackCases:CanonicalCase[]=[
  {id:"fallback-1",source_record_key:"CASE-FM",domain_name:"Financial Modeling",title:"Build a 3-Statement Model",prompt:"Build a full operating model and derive key valuation metrics.",difficulty:5,seniority:"Analyst"},
  {id:"fallback-2",source_record_key:"CASE-VAL",domain_name:"Valuation",title:"DCF Valuation Analysis",prompt:"Estimate intrinsic value and run sensitivities on major assumptions.",difficulty:5,seniority:"Analyst"},
  {id:"fallback-3",source_record_key:"CASE-MA",domain_name:"Mergers & Acquisitions",title:"Buy-Side M&A Case",prompt:"Assess acquisition logic, synergies, financing and accretion/dilution.",difficulty:8,seniority:"Associate"},
  {id:"fallback-4",source_record_key:"CASE-PE",domain_name:"Private Equity",title:"Investment Committee Decision",prompt:"Make a go/no-go recommendation using returns, downside and execution risk.",difficulty:8,seniority:"Associate"}
];
const watchlist:Omit<MarketRow,"quote"|"status">[]=[
  {id:"nifty50",label:"NIFTY 50",symbol:"NIFTY:NSE",market:"INDIA",kind:"INDEX"},
  {id:"sensex",label:"SENSEX",symbol:"SENSEX:BSE",market:"INDIA",kind:"INDEX"},
  {id:"banknifty",label:"NIFTY BANK",symbol:"BANKNIFTY:NSE",market:"INDIA",kind:"INDEX"},
  {id:"reliance",label:"Reliance",symbol:"RELIANCE:NSE",market:"INDIA",kind:"STOCK"},
  {id:"hdfc",label:"HDFC Bank",symbol:"HDFCBANK:NSE",market:"INDIA",kind:"STOCK"},
  {id:"tcs",label:"TCS",symbol:"TCS:NSE",market:"INDIA",kind:"STOCK"},
  {id:"gold",label:"Gold",symbol:"GOLD",market:"GLOBAL",kind:"COMMODITY"},
  {id:"brent",label:"Brent Crude",symbol:"BRENT",market:"GLOBAL",kind:"COMMODITY"},
  {id:"usdinr",label:"USD / INR",symbol:"USDINR",market:"INDIA",kind:"FX"},
  {id:"indiavix",label:"India VIX",symbol:"INDIAVIX",market:"INDIA",kind:"VOLATILITY"},
  {id:"us10y",label:"US 10Y",symbol:"US10Y",market:"USA",kind:"YIELD"},
  {id:"nvda",label:"NVIDIA",symbol:"NVDA",market:"USA",kind:"STOCK"}
];

function ensureFive(items:NewsItem[]){
  const out=items.slice(0,5).map((x,i)=>({...x,imageUrl:x.imageUrl||fallbackImages[i]}));
  for(let i=out.length;i<5;i++) out.push({...fallback[i],id:`fill-${i}`});
  return out.slice(0,5);
}
function pickCaseText(item:CanonicalCase,keys:(keyof CanonicalCase)[]){for(const key of keys){const value=item[key];if(typeof value==="string"&&value.trim())return value.trim();}return "";}
function caseTitle(item:CanonicalCase){return pickCaseText(item,["title","question","prompt","case_prompt","scenario"])||item.source_record_key||"Canonical Decision Case";}
function caseSummary(item:CanonicalCase){const text=pickCaseText(item,["prompt","case_prompt","question","scenario","context"]);return text.length>170?`${text.slice(0,167)}…`:text||"Open the canonical case and make your recommendation before revealing the framework.";}
function difficultyLabel(value?:number|null){const n=Number(value||1);if(n<=3)return"Foundation";if(n<=6)return"Intermediate";if(n<=8)return"Hard";return"Director / IC";}
function formatPrice(row:MarketRow){
  const value=row.quote?.price;if(value==null)return "—";
  const currency=row.quote?.currency==="USD"?"$":row.quote?.currency==="INR"?"₹":"";
  if(row.kind==="YIELD")return `${value.toFixed(2)}%`;
  return `${currency}${value.toLocaleString(undefined,{maximumFractionDigits:2})}`;
}

export default function HomePage(){
  const router=useRouter();
  const profile=useAuthProfile();
  const displayName=profileDisplayName(profile);
  const initials=profileInitials(profile);
  function nav(tab:string){const route=routeForNav(tab);if(route)router.push(route);}
  function openMarket(symbol:string,name?:string){const params=new URLSearchParams({symbol});if(name)params.set("name",name);router.push(`/markets?${params.toString()}`);}
  const [news,setNews]=useState<NewsItem[]>(fallback);
  const [busy,setBusy]=useState(false);
  const [caseBusy,setCaseBusy]=useState(false);
  const [caseItems,setCaseItems]=useState<CanonicalCase[]>(fallbackCases);
  const [store,setStore]=useState<Store>({xp:0,attempts:[],streak:0,studySeconds:0});
  const [lastUpdated,setLastUpdated]=useState("Just now");
  const [marketRows,setMarketRows]=useState<MarketRow[]>(watchlist.map(x=>({...x,status:"loading"})));
  const [marketBusy,setMarketBusy]=useState(false);
  const [marketUpdated,setMarketUpdated]=useState("Waiting for live feed");
  const [assetQuery,setAssetQuery]=useState("");
  const [assetResults,setAssetResults]=useState<SearchResult[]>([]);
  const [assetSearchBusy,setAssetSearchBusy]=useState(false);

  useEffect(()=>{
    try{
      const keys=["capital-forge-prepmate-live-v2","capital-forge-practice-workstation-fixed-v3","capital-forge-practice-workstation-v1"];
      for(const key of keys){const raw=localStorage.getItem(key);if(raw){const parsed=JSON.parse(raw);setStore(parsed);break;}}
    }catch{}
    fetch("/api/user-progress",{cache:"no-store"}).then(r=>r.json()).then(data=>{
      if(!data?.ok||!Array.isArray(data.attempts))return;
      const attempts=data.attempts as HomeAttempt[];
      const studySeconds=attempts.reduce((n,a)=>n+Number(a.durationSeconds||0),0);
      setStore(current=>({...current,attempts,studySeconds}));
    }).catch(()=>{});
    void refreshNews();void refreshCases();void refreshMarkets();
    const id=window.setInterval(()=>void refreshMarkets(),60000);
    return ()=>window.clearInterval(id);
  },[]);

  useEffect(()=>{
    const q=assetQuery.trim();
    if(q.length<2){setAssetResults([]);setAssetSearchBusy(false);return;}
    setAssetSearchBusy(true);
    const id=window.setTimeout(async()=>{
      try{
        const res=await fetch(`/api/market?action=search&q=${encodeURIComponent(q)}`,{cache:"no-store"});
        const data=await res.json();
        setAssetResults(Array.isArray(data.results)?data.results:[]);
      }catch{setAssetResults([]);}finally{setAssetSearchBusy(false);}
    },250);
    return ()=>window.clearTimeout(id);
  },[assetQuery]);

  async function refreshNews(){setBusy(true);try{const res=await fetch("/api/news?limit=5",{cache:"no-store"});const data=await res.json();setNews(ensureFive(Array.isArray(data.news)?data.news:fallback));setLastUpdated(new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));}catch{setNews(fallback);}finally{setBusy(false);}}
  async function refreshCases(){setCaseBusy(true);try{const res=await fetch("/api/content?type=cases&limit=1000",{cache:"no-store"});const data=await res.json();if(!res.ok||!data.ok)throw new Error(data.error||"Cases unavailable");const rows=(Array.isArray(data.cases)?data.cases:[]) as CanonicalCase[];const decision=rows.filter((x)=>String(x.source_record_key||"").startsWith("DEC-"));const source=decision.length>=4?decision:rows;const selected=[...source].sort((a,b)=>String(a.source_record_key||"").localeCompare(String(b.source_record_key||""))).slice(0,4);setCaseItems(selected.length?selected:fallbackCases);}catch{setCaseItems(fallbackCases);}finally{setCaseBusy(false);}}
  async function refreshMarkets(){
    setMarketBusy(true);setMarketRows(current=>current.map(x=>({...x,status:x.quote?"live":"loading"})));
    try{
      const results=await Promise.all(watchlist.map(async row=>{try{const res=await fetch(`/api/market?symbol=${encodeURIComponent(row.symbol)}`,{cache:"no-store"});const data=await res.json();if(!res.ok||data.configured===false||!data.quote||typeof data.quote.price!=="number")return {...row,status:"unavailable" as const,quote:null};return {...row,status:"live" as const,quote:data.quote as MarketQuote};}catch{return {...row,status:"unavailable" as const,quote:null};}}));
      setMarketRows(results);setMarketUpdated(new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));
    }finally{setMarketBusy(false);}
  }

  const visible=useMemo(()=>ensureFive(news),[news]);
  const attempts=store.attempts||[];
  const graded=attempts.filter(x=>typeof x.correct==="boolean");
  const accuracy=graded.length?Math.round(graded.filter(x=>x.correct===true).length/graded.length*100):0;
  const studySeconds=Number(store.studySeconds||0);
  const studyHours=studySeconds>0?(studySeconds/3600).toFixed(studySeconds<3600?1:0):"0";

  return <div className="home-app">
    <header className="home-header">
      <div className="home-brand"><div className="home-brand-mark">CF</div><div><b>Capital Forge</b><small>Master Finance. Build Your Future.</small></div></div>
      <div className="home-search"><span>⌕</span><input placeholder="Search topics, news, cases, questions..."/><kbd>⌘ K</kbd></div>
      <button className="home-ai-btn" onClick={()=>nav("Advanced")}>✦ AI Assistant</button><button className="home-bell">🔔</button><button className="home-trophy">🏆</button>
      <button className="home-profile" onClick={()=>router.push("/account")}><div className="home-avatar">{initials}</div><div><b>{displayName}</b><small>Keep Going!</small></div><span>⌄</span></button>
    </header>

    <aside className="home-sidebar"><nav>{tabs.map(tab=><button key={tab} className={tab==="Home"?"active":""} onClick={()=>nav(tab)}><span>{icons[tab]}</span>{tab}</button>)}</nav><div className="home-upgrade"><h3>Canonical Content OS</h3><p>700 quality-gated learning objects across finance, investing and interviews.</p><button onClick={()=>router.push("/cases")}>⚡ Open Decision Lab</button></div><div className="home-version">Capital Forge · Full Catalog<br/>Built for your best tomorrow.</div></aside>

    <main className="home-workspace"><div className="home-grid"><section className="home-maincol">
      <section className="home-hero-card"><div className="home-hero-copy"><p className="home-eyebrow">AI-powered finance learning</p><h1>Welcome back, <span>{displayName}!</span> 👋</h1><p>Practice smarter across IB, PE, VC, private credit, valuation, markets and interviews.</p><div className="home-kpis"><Kpi label="AI Accuracy" value={`${accuracy}%`} tone="green"/><Kpi label="Questions Solved" value={String(attempts.length)} tone="blue"/><Kpi label="Study Time" value={`${studyHours}h`} tone="red"/></div></div><div className="home-hero-art"><div className="home-float f1">DCF</div><div className="home-float f2">LBO</div><div className="home-cube">AI</div></div></section>
      <section className="home-section news-section"><div className="home-section-head"><div><h2><i className="live-dot"/>Live News & Updates</h2><p>Curated insights from markets, AI, and global finance.</p></div><div className="home-refresh-wrap"><small>Last updated: {lastUpdated}</small><button onClick={refreshNews}>{busy?"Refreshing...":"↻ Refresh"}</button></div></div><div className="home-news-grid">{visible.map((item,i)=><article key={item.id}><div className="home-news-img" style={{backgroundImage:`url(${item.imageUrl||fallbackImages[i]})`}}/><div className="home-news-meta"><span className={item.tone||"blue"}>{item.tag}</span><small>{item.time}</small></div><h3>{item.title}</h3><p>{item.summary}</p><div className="home-news-foot"><small>{item.source||"Marketaux"}</small>{item.url?<a href={item.url} target="_blank" rel="noreferrer">Read →</a>:<span>Read →</span>}</div></article>)}</div></section>
      <section className="home-section cases-section"><div className="home-section-head"><div><h2>📕 Canonical Decision Cases</h2><p>Cases from the 105-case decision set you uploaded and published.</p></div><div style={{display:"flex",gap:8}}><button onClick={refreshCases}>{caseBusy?"Loading...":"↻ Refresh Cases"}</button><button onClick={()=>router.push("/cases")}>View All 110 →</button></div></div><div className="home-case-grid">{caseItems.map((c,i)=><article key={c.id}><div><span>{c.source_record_key||`Case ${i+1}`}</span><b>{c.domain_name||c.topic_name||"Decision Making"}</b></div><h3>{caseTitle(c)}</h3><p>{caseSummary(c)}</p><small>{difficultyLabel(c.difficulty)} · {c.seniority||"Investment Judgment"}</small><button onClick={()=>router.push(`/cases?case=${encodeURIComponent(c.source_record_key||c.id)}`)}>Solve Now →</button></article>)}</div></section>
    </section>

    <aside className="home-rail"><section className="home-market-card">
      <div className="home-market-head"><div><p className="home-market-kicker"><i/> MARKET WATCH</p><h3>12-Asset Market Pulse</h3><small>Equities · macro · commodities · FX</small></div><button onClick={refreshMarkets} disabled={marketBusy}>{marketBusy?"…":"↻"}</button></div>
      <div className="home-market-clock"><LiveDateTime compact/></div>
      <div className="home-asset-search-wrap">
        <div className="home-asset-search"><span>⌕</span><input value={assetQuery} onChange={e=>setAssetQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&assetResults[0])openMarket(assetResults[0].symbol,assetResults[0].name)}} placeholder="Search any global asset..."/>{assetSearchBusy&&<i>…</i>}</div>
        {assetQuery.trim().length>=2&&<div className="home-asset-results">{assetResults.length?assetResults.map(result=><button key={`${result.symbol}-${result.exchange}`} onClick={()=>openMarket(result.symbol,result.name)}><div><b>{result.name}</b><small>{result.symbol} · {result.exchange||"Global"}</small></div><span>{result.type||"Asset"} ›</span></button>):!assetSearchBusy?<p>No matching assets found.</p>:null}</div>}
      </div>
      <div className="home-market-columns"><span>Asset</span><span>Price</span><span>Change</span></div>
      <div className="home-market-list">{marketRows.map((row,index)=>{const pct=row.quote?.percentChange;const changeClass=pct==null?"flat":pct>=0?"up":"down";return <button className="home-market-row" key={row.id} onClick={()=>openMarket(row.symbol,row.label)} title={`Open ${row.label} chart and history`}><div className="home-market-rank">{String(index+1).padStart(2,"0")}</div><div className="home-market-name"><b>{row.label}</b><small>{row.market} · {row.kind}</small></div><div className="home-market-price">{row.status==="loading"?"…":formatPrice(row)}</div><div className={`home-market-change ${changeClass}`}>{row.status==="live"&&pct!=null?`${pct>=0?"+":""}${pct.toFixed(2)}%`:"—"}</div></button>})}</div>
      <div className="home-market-foot"><span><i className={marketRows.some(x=>x.status==="live")?"live":"off"}/>{marketRows.some(x=>x.status==="live")?"Live market feed":"Market feed unavailable"}</span><small>Updated {marketUpdated}</small></div>
    </section></aside>
    </div></main>
  </div>;
}

function Kpi({label,value,tone}:{label:string;value:string;tone:string}){return <div className={`home-kpi ${tone}`}><small>{label}</small><b>{value}</b></div>}
