"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LiveDateTime from "../LiveDateTime";
import SharedAppSidebar from "../SharedAppSidebar";

type Quote = {
  symbol:string;
  name?:string;
  exchange?:string;
  currency?:string;
  price:number|null;
  change:number|null;
  percentChange:number|null;
  open?:number|null;
  high?:number|null;
  low?:number|null;
  previousClose?:number|null;
  volume?:number|null;
  timestamp?:string;
};
type Point = { timestamp:string; close:number; open?:number|null; high?:number|null; low?:number|null; volume?:number|null };
type SearchResult = { symbol:string; name:string; exchange?:string; type?:string; currency?:string };

const ranges=["1D","5D","1M","6M","1Y","5Y","MAX"];

function money(value:number|null|undefined,currency?:string,symbol?:string){
  if(value==null)return "—";
  if(symbol==="US10Y")return `${value.toFixed(2)}%`;
  const prefix=currency==="INR"?"₹":currency==="USD"?"$":"";
  return `${prefix}${value.toLocaleString(undefined,{maximumFractionDigits:2})}`;
}
function compact(value:number|null|undefined){if(value==null)return"—";return Intl.NumberFormat(undefined,{notation:"compact",maximumFractionDigits:1}).format(value);}
function when(value?:string){if(!value)return"—";try{return new Date(value).toLocaleString();}catch{return value;}}
function chartPath(points:Point[],width=1000,height=390){
  if(points.length<2)return {line:"",area:"",min:0,max:0};
  const values=points.map(x=>x.close);const min=Math.min(...values);const max=Math.max(...values);const span=max-min||1;
  const coords=points.map((p,i)=>{const x=i/(points.length-1)*width;const y=height-((p.close-min)/span)*(height-38)-19;return [x,y] as const;});
  const line=coords.map((p,i)=>`${i===0?"M":"L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area=`${line} L${width},${height} L0,${height} Z`;
  return {line,area,min,max};
}

export default function MarketsPage(){
  const router=useRouter();
  const [symbol,setSymbol]=useState("NIFTY:NSE");
  const [nameHint,setNameHint]=useState("NIFTY 50");
  const [range,setRange]=useState("1Y");
  const [quote,setQuote]=useState<Quote|null>(null);
  const [points,setPoints]=useState<Point[]>([]);
  const [historyMeta,setHistoryMeta]=useState<any>(null);
  const [performance,setPerformance]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [query,setQuery]=useState("");
  const [results,setResults]=useState<SearchResult[]>([]);
  const [searchBusy,setSearchBusy]=useState(false);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const s=params.get("symbol");const n=params.get("name");
    if(s)setSymbol(s);if(n)setNameHint(n);
  },[]);

  useEffect(()=>{
    void loadMarket(symbol,range);
  },[symbol,range]);

  useEffect(()=>{
    const q=query.trim();
    if(q.length<2){setResults([]);setSearchBusy(false);return;}
    setSearchBusy(true);
    const id=window.setTimeout(async()=>{
      try{const res=await fetch(`/api/market?action=search&q=${encodeURIComponent(q)}`,{cache:"no-store"});const data=await res.json();setResults(Array.isArray(data.results)?data.results:[]);}catch{setResults([]);}finally{setSearchBusy(false);}
    },250);
    return ()=>window.clearTimeout(id);
  },[query]);

  async function loadMarket(nextSymbol:string,nextRange:string){
    setLoading(true);setError("");
    try{
      const [qRes,hRes]=await Promise.all([
        fetch(`/api/market?symbol=${encodeURIComponent(nextSymbol)}`,{cache:"no-store"}),
        fetch(`/api/market?action=history&symbol=${encodeURIComponent(nextSymbol)}&range=${encodeURIComponent(nextRange)}`,{cache:"no-store"})
      ]);
      const qData=await qRes.json();const hData=await hRes.json();
      if(qRes.ok&&qData.configured!==false&&qData.quote)setQuote(qData.quote);else setQuote(null);
      if(!hRes.ok||!hData.ok)throw new Error(hData.error||"Historical data unavailable");
      setPoints(Array.isArray(hData.points)?hData.points:[]);setHistoryMeta(hData.meta||null);setPerformance(hData.performance||null);
    }catch(e){setError(e instanceof Error?e.message:"Market data unavailable");setPoints([]);}finally{setLoading(false);}
  }

  function selectAsset(result:SearchResult){
    setSymbol(result.symbol);setNameHint(result.name);setQuery("");setResults([]);setRange("1Y");
    const params=new URLSearchParams({symbol:result.symbol,name:result.name});window.history.replaceState({},"",`/markets?${params.toString()}`);
  }

  const chart=useMemo(()=>chartPath(points),[points]);
  const displayName=quote?.name||historyMeta?.name||nameHint||symbol;
  const pct=quote?.percentChange;
  const periodPct=performance?.percentChange;
  const periodClass=periodPct==null?"flat":periodPct>=0?"up":"down";
  const latest=points[points.length-1];

  return <div className="markets-app">
    <header className="markets-header">
      <button className="markets-back" onClick={()=>router.push("/home")}>← Home</button>
      <div className="markets-brand"><div>CF</div><span><b>Capital Forge Markets</b><small>Global asset explorer</small></span></div>
      <div className="markets-live"><LiveDateTime/></div>
    </header>
    <SharedAppSidebar active="Home" title="Markets" note="Global market data, price history and finance learning links."/>

    <main className="markets-shell">
      <section className="markets-search-card">
        <div><p>GLOBAL ASSET SEARCH</p><h1>Search any listed asset worldwide</h1><small>Stocks, indices, ETFs, currencies, commodities and major market instruments.</small></div>
        <div className="markets-search-wrap">
          <div className="markets-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&results[0])selectAsset(results[0])}} placeholder="Try: Reliance, Apple, S&P 500, Gold, USDINR..."/>{searchBusy&&<i>Searching…</i>}</div>
          {query.trim().length>=2&&<div className="markets-results">{results.length?results.map(result=><button key={`${result.symbol}-${result.exchange}`} onClick={()=>selectAsset(result)}><div><b>{result.name}</b><small>{result.symbol} · {result.exchange||"Global"}</small></div><span>{result.type||"Asset"} ›</span></button>):!searchBusy?<p>No matching assets found.</p>:null}</div>}
        </div>
      </section>

      <section className="markets-overview">
        <div className="markets-title"><p>{historyMeta?.exchange||quote?.exchange||"MARKET"} · {symbol}</p><h2>{displayName}</h2><div className="markets-price-line"><b>{money(quote?.price,quote?.currency,symbol)}</b><span className={pct==null?"flat":pct>=0?"up":"down"}>{pct==null?"—":`${pct>=0?"+":""}${pct.toFixed(2)}%`}</span></div><small>Last market update: {when(quote?.timestamp)}</small></div>
        <div className="markets-stat-grid"><Stat label="Open" value={money(quote?.open,quote?.currency,symbol)}/><Stat label="Day High" value={money(quote?.high,quote?.currency,symbol)}/><Stat label="Day Low" value={money(quote?.low,quote?.currency,symbol)}/><Stat label="Prev. Close" value={money(quote?.previousClose,quote?.currency,symbol)}/><Stat label="Volume" value={compact(quote?.volume)}/><Stat label={`${range} Return`} value={periodPct==null?"—":`${periodPct>=0?"+":""}${periodPct.toFixed(2)}%`} tone={periodClass}/></div>
      </section>

      <section className="markets-chart-card">
        <div className="markets-chart-head"><div><p>PRICE HISTORY</p><h3>{displayName}</h3><small>{points.length.toLocaleString()} historical observations · {range}</small></div><div className="markets-ranges">{ranges.map(r=><button key={r} className={range===r?"active":""} onClick={()=>setRange(r)}>{r}</button>)}</div></div>
        <div className="markets-chart-stage">
          {loading?<div className="markets-state">Loading market history…</div>:error?<div className="markets-state error">{error}</div>:points.length<2?<div className="markets-state">No historical series available.</div>:<>
            <div className="markets-chart-label top">{money(chart.max,quote?.currency,symbol)}</div><div className="markets-chart-label bottom">{money(chart.min,quote?.currency,symbol)}</div>
            <svg viewBox="0 0 1000 390" preserveAspectRatio="none" role="img" aria-label={`${displayName} ${range} price chart`}><defs><linearGradient id="marketFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#0875fa" stopOpacity=".24"/><stop offset="100%" stopColor="#0875fa" stopOpacity=".01"/></linearGradient></defs><path d={chart.area} fill="url(#marketFill)"/><path d={chart.line} fill="none" stroke="#0875fa" strokeWidth="3" vectorEffect="non-scaling-stroke"/></svg>
            <div className="markets-chart-axis"><span>{new Date(points[0].timestamp).toLocaleDateString()}</span><span>{new Date(points[Math.floor(points.length/2)].timestamp).toLocaleDateString()}</span><span>{new Date(points[points.length-1].timestamp).toLocaleDateString()}</span></div>
          </>}
        </div>
      </section>

      <section className="markets-bottom-grid">
        <div className="markets-card"><p>PERIOD SNAPSHOT</p><div className="markets-big-return"><span className={periodClass}>{periodPct==null?"—":`${periodPct>=0?"+":""}${periodPct.toFixed(2)}%`}</span><small>{range} price return</small></div><dl><div><dt>Start</dt><dd>{money(performance?.first,quote?.currency,symbol)}</dd></div><div><dt>Latest</dt><dd>{money(performance?.last,quote?.currency,symbol)}</dd></div><div><dt>Absolute move</dt><dd>{performance?.change==null?"—":money(performance.change,quote?.currency,symbol)}</dd></div></dl></div>
        <div className="markets-card"><p>LATEST OBSERVATION</p><dl><div><dt>Date / Time</dt><dd>{when(latest?.timestamp)}</dd></div><div><dt>Close</dt><dd>{money(latest?.close,quote?.currency,symbol)}</dd></div><div><dt>High</dt><dd>{money(latest?.high,quote?.currency,symbol)}</dd></div><div><dt>Low</dt><dd>{money(latest?.low,quote?.currency,symbol)}</dd></div><div><dt>Volume</dt><dd>{compact(latest?.volume)}</dd></div></dl></div>
        <div className="markets-card learning"><p>LEARNING MODE</p><h3>Turn this market move into a finance drill</h3><small>Ask what changed in valuation, discount rates, risk appetite, earnings expectations or macro conditions.</small><button onClick={()=>router.push(`/advanced?prompt=${encodeURIComponent(`Analyze ${displayName} (${symbol}) over ${range}. Explain the price move, likely macro/company drivers, valuation implications, risks and what I should learn from it.`)}`)}>✦ Analyze with AI</button></div>
      </section>
    </main>
  </div>;
}

function Stat({label,value,tone}:{label:string;value:string;tone?:string}){return <div className="markets-stat"><small>{label}</small><b className={tone||""}>{value}</b></div>}
