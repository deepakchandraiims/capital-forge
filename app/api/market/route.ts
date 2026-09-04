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

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildEvents(quote: Quote, provider: string, live: boolean) {
  const direction = (quote.change || 0) >= 0 ? "up" : "down";
  const pct = quote.percentChange == null ? "unknown" : `${quote.percentChange.toFixed(2)}%`;
  return [
    {
      title: `${quote.symbol} is ${direction} ${pct}`,
      assetClass: `${provider} / Equity Market Data`,
      question: "What valuation, WACC or exit multiple assumption changes when the market price moves sharply?",
      task: "Write a 5-line investment view: price move, likely driver, valuation impact, downside risk and decision."
    },
    {
      title: live ? "Live quote converted into a practice drill" : "Demo quote converted into a practice drill",
      assetClass: "Markets / Interview Practice",
      question: "Would you buy, avoid or wait for a better entry point based only on this market snapshot?",
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
    currency: "USD",
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "AAPL").trim().toUpperCase();
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
      return NextResponse.json({
        configured: true,
        provider: "alphavantage",
        source: process.env.BACKUP_MARKET_API_KEY || process.env.ALPHA_VANTAGE_API_KEY ? "vercel-env" : "browser-vault",
        backup: true,
        symbol,
        primaryWarning: primaryError instanceof Error ? primaryError.message : "Primary market provider failed",
        quote,
        events: buildEvents(quote, "Alpha Vantage", true),
        generatedAt: new Date().toISOString()
      });
    } catch (backupError) {
      const quote = { ...demoQuote, symbol };
      return NextResponse.json({
        configured: false,
        provider,
        source: "fallback",
        warning: backupError instanceof Error ? backupError.message : "Market providers unavailable. Returning demo challenges.",
        quote,
        events: buildEvents(quote, "Capital Forge Demo", false),
        generatedAt: new Date().toISOString()
      });
    }
  }
}
