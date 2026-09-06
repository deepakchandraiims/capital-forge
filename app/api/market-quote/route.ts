import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const aliases:Record<string,string>={
  "NIFTY:NSE":"^NSEI",
  "NIFTY50:NSE":"^NSEI",
  "SENSEX:BSE":"^BSESN",
  "BANKNIFTY:NSE":"^NSEBANK",
  "NIFTYBANK:NSE":"^NSEBANK",
  "RELIANCE:NSE":"RELIANCE.NS",
  "HDFCBANK:NSE":"HDFCBANK.NS",
  "ICICIBANK:NSE":"ICICIBANK.NS",
  "TCS:NSE":"TCS.NS",
  "INFY:NSE":"INFY.NS",
  "GOLD":"GC=F",
  "BRENT":"BZ=F",
  "USDINR":"INR=X",
  "INDIAVIX":"^INDIAVIX",
  "US10Y":"^TNX"
};

function n(v:unknown){const x=Number(v);return Number.isFinite(x)?x:null;}

export async function GET(request:Request){
  const {searchParams}=new URL(request.url);
  const requested=String(searchParams.get("symbol")||"AAPL").trim();
  const symbol=requested.toUpperCase();
  const ys=aliases[symbol]||requested;
  try{
    const url=new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ys)}`);
    url.searchParams.set("interval","1m");url.searchParams.set("range","1d");
    const res=await fetch(url,{cache:"no-store",headers:{"User-Agent":"Mozilla/5.0 CapitalForge/1.0","Accept":"application/json"}});
    if(!res.ok)throw new Error(`Yahoo Finance ${res.status}`);
    const data=await res.json() as any;
    if(data.chart?.error)throw new Error(data.chart.error.description||"Yahoo Finance error");
    const result=data.chart?.result?.[0];const meta=result?.meta||{};
    const price=n(meta.regularMarketPrice);if(price==null)throw new Error("No market price");
    const previousClose=n(meta.chartPreviousClose??meta.previousClose);
    const change=previousClose==null?null:price-previousClose;
    const percentChange=previousClose&&change!=null?change/previousClose*100:null;
    return NextResponse.json({configured:true,provider:"yahoo-finance",source:"public-live",symbol:requested,yahooSymbol:ys,quote:{symbol:requested,name:meta.shortName||meta.longName||requested,exchange:meta.fullExchangeName||meta.exchangeName||"",currency:meta.currency||"",price,change,percentChange,open:n(meta.regularMarketOpen),high:n(meta.regularMarketDayHigh),low:n(meta.regularMarketDayLow),previousClose,volume:n(meta.regularMarketVolume),timestamp:typeof meta.regularMarketTime==="number"?new Date(meta.regularMarketTime*1000).toISOString():new Date().toISOString()},generatedAt:new Date().toISOString()});
  }catch(error){return NextResponse.json({configured:false,error:error instanceof Error?error.message:"Quote unavailable"},{status:502});}
}
