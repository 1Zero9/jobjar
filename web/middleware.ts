import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/",
  "/admin",
  "/log",
  "/tasks",
  "/projects",
  "/stats",
  "/settings",
  "/setup",
  "/help",
  "/more",
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const needsAuth = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || (prefix !== "/" && pathname.startsWith(`${prefix}/`)),
  );

  if (!needsAuth) {
    return NextResponse.next();
  }

  const session = request.cookies.get("jobjar_session_user")?.value;
  if (session) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/log/:path*",
    "/tasks/:path*",
    "/projects/:path*",
    "/stats/:path*",
    "/settings/:path*",
    "/setup/:path*",
    "/help/:path*",
    "/more/:path*",
  ],
};
