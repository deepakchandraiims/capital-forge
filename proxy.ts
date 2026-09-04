import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname !== "/") return NextResponse.next();

  const open = searchParams.get("open");
  const destination =
    open === "Dashboard" ? "/dashboard" :
    open === "Feedback" ? "/feedback" :
    open === "Interview Room" ? "/interview" :
    open === "Home" || !open ? "/home" :
    null;

  if (!destination) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = destination;
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/"]
};
