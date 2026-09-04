import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DIRECT_ROUTES: Record<string, string> = {
  Home: "/home",
  Dashboard: "/dashboard",
  Feedback: "/feedback",
};

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname !== "/") return NextResponse.next();

  const open = searchParams.get("open");

  if (!open) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const direct = DIRECT_ROUTES[open];
  if (direct) {
    const url = request.nextUrl.clone();
    url.pathname = direct;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
