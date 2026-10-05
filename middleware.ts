import { NextResponse, type NextRequest } from "next/server";

const APP_ROUTES = ["/week", "/stats", "/habits", "/settings"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get("tally_session")?.value);
  if (APP_ROUTES.some((p) => pathname.startsWith(p)) && !hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if ((pathname === "/login" || pathname === "/register") && hasSession) {
    return NextResponse.redirect(new URL("/week", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/week/:path*", "/stats/:path*", "/habits/:path*", "/settings/:path*", "/login", "/register"],
};
