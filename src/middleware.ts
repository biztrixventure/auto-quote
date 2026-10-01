import { NextRequest, NextResponse } from "next/server";

// First filter for the admin area: no session cookie means no access. The real checks
// (valid session, 2FA done, role) run on every admin page, action and API route via
// requireAdmin() in src/lib/admin-guard.ts. Login lockouts live in the login action.

const SESSION_COOKIE = "va_session"; // keep in sync with src/lib/auth.ts

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isLogin = pathname === "/admin/login";
  const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value;

  if (!isLogin && !hasSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    const login = new URL("/admin/login", req.url);
    if (pathname !== "/admin") login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }

  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
