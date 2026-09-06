import { NextRequest, NextResponse } from "next/server";

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
  const destination =
    open === "Dashboard" ? "/dashboard" :
    open === "Feedback" ? "/feedback" :
    open === "Interview Room" ? "/interview" :
    open === "Practice" ? "/practice" :
    open === "Home" || !open ? "/home" :
    null;

  if (!destination) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = destination;
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/", "/api/market"]
};
