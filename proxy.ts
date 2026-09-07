import { NextRequest, NextResponse } from "next/server";
import { routeForNav } from "./app/navigation";
import { applyProxyCookies, readProxyAuth } from "./lib/supabase/proxy";

const fastMarketSymbols = new Set([
  "NIFTY:NSE","NIFTY50:NSE","SENSEX:BSE","BANKNIFTY:NSE","NIFTYBANK:NSE",
  "RELIANCE:NSE","HDFCBANK:NSE","ICICIBANK:NSE","TCS:NSE","INFY:NSE",
  "GOLD","BRENT","USDINR","INDIAVIX","US10Y","NVDA","AAPL"
]);

const PUBLIC_PAGES = ["/login", "/signup", "/auth/confirm", "/auth/error"];
const PUBLIC_API_PREFIXES = [
  "/api/health",
  "/api/build-info",
  "/api/market",
  "/api/market-quote",
  "/api/news",
  "/api/fundamentals"
];
const ADMIN_PAGE_PREFIXES = [
  "/admin",
  "/content-import",
  "/content-release-v2",
  "/content-release-v2-direct",
  "/content-repair-v2",
  "/content-validate-v2"
];
const ADMIN_API_PREFIXES = ["/api/admin", "/api/content-release-v2-direct", "/api/lab"];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function redirectWithCookies(request: NextRequest, path: string, cookieWrites: Awaited<ReturnType<typeof readProxyAuth>>["cookieWrites"]) {
  const url = request.nextUrl.clone();
  const [pathname, query = ""] = path.split("?");
  url.pathname = pathname;
  url.search = query ? `?${query}` : "";
  return applyProxyCookies(NextResponse.redirect(url), cookieWrites);
}

function apiError(status: number, message: string) {
  return new NextResponse(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "content-type": "application/json", "cache-control": "private, no-store" }
  });
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Preserve the fast quote rewrite from CF-052/CF-051. Market data itself is not user-specific.
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

  // Keep the legacy root redirect behavior. The destination request is then auth-gated normally.
  if (pathname === "/") {
    const open = searchParams.get("open");
    const legacyDestination = open ? routeForNav(open) : undefined;
    const url = request.nextUrl.clone();
    url.pathname = legacyDestination || "/home";
    if (legacyDestination) url.searchParams.delete("open");
    else url.search = "";
    return NextResponse.redirect(url);
  }

  if (matches(pathname, PUBLIC_API_PREFIXES)) return NextResponse.next();
  if (pathname === "/auth/confirm" || pathname === "/auth/error") return NextResponse.next();

  const { response, cookieWrites, user, profile } = await readProxyAuth(request);
  const emailVerified = Boolean(user?.email_confirmed_at);
  const approved = Boolean(user && emailVerified && profile?.status === "approved");
  const admin = Boolean(approved && profile?.role === "admin");

  if (pathname === "/login" || pathname === "/signup") {
    if (!user) return response;
    if (approved) return redirectWithCookies(request, "/home", cookieWrites);
    return redirectWithCookies(request, "/pending", cookieWrites);
  }

  if (pathname === "/pending") {
    if (!user) return redirectWithCookies(request, "/login", cookieWrites);
    if (approved) return redirectWithCookies(request, "/home", cookieWrites);
    return response;
  }

  if (matches(pathname, PUBLIC_PAGES)) return response;

  if (matches(pathname, ADMIN_API_PREFIXES)) {
    if (!user) return apiError(401, "Authentication required.");
    if (!admin) return apiError(404, "Not found.");
    return response;
  }

  if (matches(pathname, ADMIN_PAGE_PREFIXES)) {
    if (!user) return redirectWithCookies(request, `/login?next=${encodeURIComponent(pathname + request.nextUrl.search)}`, cookieWrites);
    if (!admin) return redirectWithCookies(request, "/home", cookieWrites);
    return response;
  }

  if (pathname.startsWith("/api/")) {
    if (!user) return apiError(401, "Authentication required.");
    if (!emailVerified) return apiError(403, "Verify your email before continuing.");
    if (!profile || profile.status !== "approved") return apiError(403, "Account approval required.");
    return response;
  }

  // Everything else in the learning product requires an approved account.
  if (!user) return redirectWithCookies(request, `/login?next=${encodeURIComponent(pathname + request.nextUrl.search)}`, cookieWrites);
  if (!emailVerified) return redirectWithCookies(request, "/pending?state=email-unverified", cookieWrites);
  if (!profile || profile.status !== "approved") return redirectWithCookies(request, "/pending", cookieWrites);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"]
};
