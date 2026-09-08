"use client";

import { useEffect } from "react";

const HOME_SYMBOLS = new Set([
  "NIFTY:NSE","SENSEX:BSE","BANKNIFTY:NSE","RELIANCE:NSE","HDFCBANK:NSE","TCS:NSE",
  "GOLD","BRENT","USDINR","INDIAVIX","US10Y","NVDA"
]);

type Pending = {
  symbol: string;
  resolve: (response: Response) => void;
  reject: (error: unknown) => void;
};

export default function MarketRequestCoalescer({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    const originalFetch = window.fetch.bind(window);
    let pending: Pending[] = [];
    let timer: number | null = null;

    const flush = async () => {
      timer = null;
      const batch = pending;
      pending = [];
      if (!batch.length) return;

      const symbols = Array.from(new Set(batch.map(x => x.symbol)));
      try {
        const response = await originalFetch(`/api/market-quote?symbols=${encodeURIComponent(symbols.join(","))}`, { cache: "default" });
        const payload = await response.json();
        const bySymbol = new Map<string, any>();
        for (const row of Array.isArray(payload?.results) ? payload.results : []) {
          bySymbol.set(String(row?.symbol || "").toUpperCase(), row);
        }
        for (const item of batch) {
          const body = bySymbol.get(item.symbol.toUpperCase()) || { configured: false, symbol: item.symbol, error: "Quote unavailable" };
          item.resolve(new Response(JSON.stringify(body), {
            status: body.configured === false ? 502 : 200,
            headers: { "content-type": "application/json", "cache-control": "public, max-age=10" }
          }));
        }
      } catch (error) {
        batch.forEach(item => item.reject(error));
      }
    };

    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const method = String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
        if (method !== "GET") return originalFetch(input, init);
        const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const url = new URL(raw, window.location.origin);
        if (url.origin !== window.location.origin || url.pathname !== "/api/market" || url.searchParams.get("action")) return originalFetch(input, init);
        const symbol = String(url.searchParams.get("symbol") || "").toUpperCase();
        if (!HOME_SYMBOLS.has(symbol)) return originalFetch(input, init);

        return new Promise<Response>((resolve, reject) => {
          pending.push({ symbol, resolve, reject });
          if (timer === null) timer = window.setTimeout(() => void flush(), 8);
        });
      } catch {
        return originalFetch(input, init);
      }
    }) as typeof window.fetch;

    return () => {
      window.fetch = originalFetch as typeof window.fetch;
      if (timer !== null) window.clearTimeout(timer);
      const leftovers = pending;
      pending = [];
      leftovers.forEach(item => item.reject(new Error("Market request coalescer stopped.")));
    };
  }, [enabled]);

  return null;
}
