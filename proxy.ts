import { NextRequest, NextResponse } from "next/server";
import { routeForNav } from "./app/navigation";

const fastMarketSymbols = new Set([
  "NIFTY:NSE","NIFTY50:NSE","SENSEX:BSE","BANKNIFTY:NSE","NIFTYBANK:NSE",
  "RELIANCE:NSE","HDFCBANK:NSE","ICICIBANK:NSE","TCS:NSE","INFY:NSE",
  "GOLD","BRENT","USDINR","INDIAVIX","US10Y","NVDA","AAPL"
]);

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/api/market") {
    const action = searchParams.get("action");
    const symbol = String(searchParams.get("symbol") || "").toUpperCase();
    if (!action && fastMarketSymbols.has(symbol)) {
      const url = request.nextUrl.clone();
      url.pathname = "/api/market-quote";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  if (pathname !== "/") return NextResponse.next();

const open = searchParams.get("open");
const legacyDestination = open ? routeForNav(open) : undefined;
const url = request.nextUrl.clone();
url.pathname = legacyDestination || "/home";
if (legacyDestination) url.searchParams.delete("open");
else url.search = "";
return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/", "/api/market"]
};
