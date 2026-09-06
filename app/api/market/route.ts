import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Quote = {
  symbol: string;
  name?: string;
  exchange?: string;
  currency?: string;
  price: number | null;
  change: number | null;
  percentChange: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  previousClose?: number | null;
  volume?: number | null;
  timestamp?: string;
};

type HistoryPoint = { timestamp: string; close: number; open?: number | null; high?: number | null; low?: number | null; volume?: number | null };

const demoQuote: Quote = {
  symbol: "AAPL",
  name: "Demo Quote",
  exchange: "Demo",
  currency: "USD",
  price: 100,
  change: 1.25,
  percentChange: 1.26,
  open: 98.4,
  high: 101.2,
  low: 97.9,
  previousClose: 98.75,
  volume: 1200000,
  timestamp: new Date().toISOString()
};

const yahooAliases: Record<string,string> = {
  "NIFTY:NSE": "^NSEI",
  "NIFTY50:NSE": "^NSEI",
  "SENSEX:BSE": "^BSESN",
  "BANKNIFTY:NSE": "^NSEBANK",
  "NIFTYBANK:NSE": "^NSEBANK",
  "RELIANCE:NSE": "RELIANCE.NS",
  "HDFCBANK:NSE": "HDFCBANK.NS",
  "ICICIBANK:NSE": "ICICIBANK.NS",
  "TCS:NSE": "TCS.NS",
  "INFY:NSE": "INFY.NS",
  "GOLD": "GC=F",
  "BRENT": "BZ=F",
  "USDINR": "INR=X",
  "INDIAVIX": "^INDIAVIX",
  "US10Y": "^TNX"
};

const rangeConfig: Record<string,{range:string;interval:string}> = {
  "1D": { range: "1d", interval: "5m" },
  "5D": { range: "5d", interval: "15m" },
  "1M": { range: "1mo", interval: "1h" },
  "6M": { range: "6mo", interval: "1d" },
  "1Y": { range: "1y", interval: "1d" },
  "5Y": { range: "5y", interval: "1wk" },
  "MAX": { range: "max", interval: "1mo" }
};

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function yahooSymbol(symbol: string) {
  return yahooAliases[symbol.toUpperCase()] || symbol;
}

function buildEvents(quote: Quote, provider: string, live: boolean) {
  const direction = (quote.change || 0) >= 0 ? "up" : "down";
  const pct = quote.percentChange == null ? "unknown" : `${quote.percentChange.toFixed(2)}%`;
  return [
    {
      title: `${quote.symbol} is ${direction} ${pct}`,
      assetClass: `${provider} / Market Data`,
      question: "What valuation, WACC or exit multiple assumption changes when the market price moves sharply?",
      task: "Write a 5-line investment view: price move, likely driver, valuation impact, downside risk and decision."
    },
    {
      title: live ? "Live quote converted into a practice drill" : "Demo quote converted into a practice drill",
      assetClass: "Markets / Interview Practice",
      question: "What does this move imply for risk appetite, valuation and the macro backdrop?",
      task: "Answer with conclusion first, then support with valuation, risk and catalyst logic."
    }
  ];
}

async function fetchTwelveData(symbol: string, apiKey: string, apiUrl?: string | null): Promise<Quote> {
  if (!apiKey) throw new Error("MARKET_DATA_API_KEY missing");
  const base = (apiUrl || "https://api.twelvedata.com").replace(/\/$/, "");
  const url = new URL(`${base}/quote`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", apiKey);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Twelve Data ${response.status}`);
  const data = await response.json() as Record<string, unknown>;
  if (data.status === "error") throw new Error(String(data.message || "Twelve Data error"));
  return {
    symbol: String(data.symbol || symbol).toUpperCase(),
    name: typeof data.name === "string" ? data.name : undefined,
    exchange: typeof data.exchange === "string" ? data.exchange : undefined,
    currency: typeof data.currency === "string" ? data.currency : undefined,
    price: toNumber(data.close),
    change: toNumber(data.change),
    percentChange: toNumber(data.percent_change),
    open: toNumber(data.open),
    high: toNumber(data.high),
    low: toNumber(data.low),
    previousClose: toNumber(data.previous_close),
    volume: toNumber(data.volume),
    timestamp: typeof data.datetime === "string" ? data.datetime : new Date().toISOString()
  };
}

async function fetchAlphaVantage(symbol: string, apiKey: string): Promise<Quote> {
  if (!apiKey) throw new Error("BACKUP_MARKET_API_KEY missing");
  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "GLOBAL_QUOTE");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", apiKey);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Alpha Vantage ${response.status}`);
  const data = await response.json() as { "Global Quote"?: Record<string, string>; Note?: string; Information?: string };
  if (data.Note || data.Information) throw new Error(data.Note || data.Information || "Alpha Vantage limit/error");
  const quote = data["Global Quote"];
  if (!quote || !quote["05. price"]) throw new Error("Alpha Vantage returned no quote");
  return {
    symbol: quote["01. symbol"] || symbol.toUpperCase(),
    name: "Alpha Vantage Quote",
    currency: symbol.includes(":NSE") || symbol.includes(":BSE") ? "INR" : "USD",
    price: toNumber(quote["05. price"]),
    change: toNumber(quote["09. change"]),
    percentChange: toNumber((quote["10. change percent"] || "").replace("%", "")),
    open: toNumber(quote["02. open"]),
    high: toNumber(quote["03. high"]),
    low: toNumber(quote["04. low"]),
    previousClose: toNumber(quote["08. previous close"]),
    volume: toNumber(quote["06. volume"]),
    timestamp: quote["07. latest trading day"] || new Date().toISOString()
  };
}

async function yahooChart(symbol: string, range = "1d", interval = "1m") {
  const ys = yahooSymbol(symbol);
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ys)}`);
  url.searchParams.set("interval", interval);
  url.searchParams.set("range", range);
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "div,splits");
  const response = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0 CapitalForge/1.0", "Accept": "application/json" } });
  if (!response.ok) throw new Error(`Yahoo Finance ${response.status}`);
  const data = await response.json() as any;
  if (data.chart?.error) throw new Error(data.chart.error.description || "Yahoo Finance error");
  const result = data.chart?.result?.[0];
  if (!result) throw new Error("Yahoo Finance returned no chart result");
  return result;
}

async function fetchYahooFinance(symbol: string): Promise<Quote> {
  const result = await yahooChart(symbol, "1d", "1m");
  const meta = result.meta || {};
  const price = toNumber(meta.regularMarketPrice);
  if (price == null) throw new Error("Yahoo Finance returned no price");
  const previousClose = toNumber(meta.chartPreviousClose ?? meta.previousClose);
  const change = previousClose == null ? null : price - previousClose;
  const percentChange = previousClose && change != null ? (change / previousClose) * 100 : null;
  return {
    symbol,
    name: typeof meta.shortName === "string" ? meta.shortName : typeof meta.longName === "string" ? meta.longName : undefined,
    exchange: typeof meta.fullExchangeName === "string" ? meta.fullExchangeName : typeof meta.exchangeName === "string" ? meta.exchangeName : undefined,
    currency: typeof meta.currency === "string" ? meta.currency : undefined,
    price,
    change,
    percentChange,
    open: toNumber(meta.regularMarketOpen),
    high: toNumber(meta.regularMarketDayHigh),
    low: toNumber(meta.regularMarketDayLow),
    previousClose,
    volume: toNumber(meta.regularMarketVolume),
    timestamp: typeof meta.regularMarketTime === "number" ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString()
  };
}

async function fetchYahooHistory(symbol: string, requestedRange: string) {
  const key = requestedRange.toUpperCase();
  const cfg = rangeConfig[key] || rangeConfig["1Y"];
  const result = await yahooChart(symbol, cfg.range, cfg.interval);
  const timestamps: number[] = Array.isArray(result.timestamp) ? result.timestamp : [];
  const quote = result.indicators?.quote?.[0] || {};
  const closes: Array<number|null> = quote.close || [];
  const opens: Array<number|null> = quote.open || [];
  const highs: Array<number|null> = quote.high || [];
  const lows: Array<number|null> = quote.low || [];
  const volumes: Array<number|null> = quote.volume || [];
  const points: HistoryPoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = toNumber(closes[i]);
    if (close == null || close === 0) continue;
    points.push({
      timestamp: new Date(timestamps[i] * 1000).toISOString(),
      close,
      open: toNumber(opens[i]),
      high: toNumber(highs[i]),
      low: toNumber(lows[i]),
      volume: toNumber(volumes[i])
    });
  }
  const meta = result.meta || {};
  const first = points[0]?.close ?? null;
  const last = points[points.length - 1]?.close ?? null;
  const periodChange = first != null && last != null ? last - first : null;
  const periodChangePct = first && periodChange != null ? periodChange / first * 100 : null;
  return {
    symbol,
    yahooSymbol: yahooSymbol(symbol),
    range: key,
    interval: cfg.interval,
    meta: {
      name: meta.shortName || meta.longName || symbol,
      exchange: meta.fullExchangeName || meta.exchangeName || "",
      currency: meta.currency || "",
      regularMarketPrice: toNumber(meta.regularMarketPrice),
      previousClose: toNumber(meta.chartPreviousClose ?? meta.previousClose)
    },
    points,
    performance: { first, last, change: periodChange, percentChange: periodChangePct }
  };
}

async function searchYahoo(query: string) {
  const url = new URL("https://query1.finance.yahoo.com/v1/finance/search");
  url.searchParams.set("q", query);
  url.searchParams.set("quotesCount", "12");
  url.searchParams.set("newsCount", "0");
  url.searchParams.set("listsCount", "0");
  const response = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0 CapitalForge/1.0", "Accept": "application/json" } });
  if (!response.ok) throw new Error(`Yahoo search ${response.status}`);
  const data = await response.json() as any;
  const quotes = Array.isArray(data.quotes) ? data.quotes : [];
  return quotes.filter((x:any) => x?.symbol && !["OPTION","FUTURE"].includes(String(x.quoteType || ""))).slice(0, 10).map((x:any) => ({ symbol: String(x.symbol), name: String(x.shortname || x.longname || x.symbol), exchange: String(x.exchDisp || x.exchange || ""), type: String(x.typeDisp || x.quoteType || "Asset"), currency: String(x.currency || "") }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = (searchParams.get("action") || "quote").toLowerCase();
  if (action === "search") {
    const q = String(searchParams.get("q") || "").trim().slice(0, 80);
    if (q.length < 1) return NextResponse.json({ ok: true, results: [] });
    try { const results = await searchYahoo(q); return NextResponse.json({ ok: true, results, generatedAt: new Date().toISOString() }); }
    catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Search unavailable", results: [] }, { status: 502 }); }
  }

  const symbol = (searchParams.get("symbol") || "AAPL").trim().toUpperCase();
  if (action === "history") {
    try { const history = await fetchYahooHistory(symbol, searchParams.get("range") || "1Y"); return NextResponse.json({ ok: true, provider: "yahoo-finance", source: "public-fallback", ...history, generatedAt: new Date().toISOString() }); }
    catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "History unavailable", points: [] }, { status: 502 }); }
  }

  const provider = (process.env.MARKET_DATA_PROVIDER || request.headers.get("x-capital-forge-market-provider") || "twelvedata").toLowerCase();
  const primaryKey = process.env.MARKET_DATA_API_KEY || request.headers.get("x-capital-forge-market-key") || "";
  const primaryUrl = process.env.MARKET_DATA_API_URL || request.headers.get("x-capital-forge-market-url") || "https://api.twelvedata.com";
  const backupKey = process.env.BACKUP_MARKET_API_KEY || process.env.ALPHA_VANTAGE_API_KEY || request.headers.get("x-capital-forge-backup-market-key") || "";

  try {
    if (provider === "twelvedata") {
      const quote = await fetchTwelveData(symbol, primaryKey, primaryUrl);
      return NextResponse.json({ configured: true, provider: "twelvedata", source: process.env.MARKET_DATA_API_KEY ? "vercel-env" : "browser-vault", symbol, quote, events: buildEvents(quote, "Twelve Data", true), generatedAt: new Date().toISOString() });
    }
    throw new Error(`Unsupported primary market provider: ${provider}`);
  } catch (primaryError) {
    try {
      const quote = await fetchAlphaVantage(symbol, backupKey);
      return NextResponse.json({ configured: true, provider: "alphavantage", source: process.env.BACKUP_MARKET_API_KEY || process.env.ALPHA_VANTAGE_API_KEY ? "vercel-env" : "browser-vault", backup: true, symbol, primaryWarning: primaryError instanceof Error ? primaryError.message : "Primary market provider failed", quote, events: buildEvents(quote, "Alpha Vantage", true), generatedAt: new Date().toISOString() });
    } catch (backupError) {
      try {
        const quote = await fetchYahooFinance(symbol);
        return NextResponse.json({ configured: true, provider: "yahoo-finance", source: "public-fallback", backup: true, symbol, primaryWarning: primaryError instanceof Error ? primaryError.message : "Primary market provider failed", backupWarning: backupError instanceof Error ? backupError.message : "Backup market provider failed", quote, events: buildEvents(quote, "Yahoo Finance", true), generatedAt: new Date().toISOString() });
      } catch (publicError) {
        const quote = { ...demoQuote, symbol };
        return NextResponse.json({ configured: false, provider, source: "fallback", warning: publicError instanceof Error ? publicError.message : "Market providers unavailable. Returning demo challenges.", quote, events: buildEvents(quote, "Capital Forge Demo", false), generatedAt: new Date().toISOString() });
      }
    }
  }
}
