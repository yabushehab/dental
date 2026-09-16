import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "./lib/session";

const PUBLIC_PATHS = ["/sign-in", "/sign-up"];

/**
 * Fast cookie-presence gate. Real verification (signature, user lookup)
 * happens server-side in layouts/actions — this only keeps anonymous
 * traffic away from app pages.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!isPublic && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }
  if (isPublic && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except static assets and endpoints that must stay reachable
  // without a session: Meta webhooks and the platform health probe.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/health).*)"],
};
