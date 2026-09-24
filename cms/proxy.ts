/**
 * Next.js Proxy — guards /admin/* routes.
 *
 * Lightweight check: just verifies the session cookie is present.
 * Deep auth validation (verifying the secret with Appwrite) happens
 * in the Server Component layout (app/admin/(shell)/layout.tsx) which
 * uses node-appwrite's setSession() correctly.
 *
 * Runs on the Edge runtime (no Node.js APIs allowed).
 */
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "appwrite-session";

export const config = {
  matcher: ["/admin/:path*"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow the login page through.
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // If no session cookie → redirect to login immediately.
  const sessionSecret = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionSecret) {
    return redirectToLogin(request);
  }

  // Cookie is present → let the request through.
  // The layout Server Component will call account.get() via setSession()
  // and redirect to /admin/login if the session is expired/invalid.
  return NextResponse.next();
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export default proxy;
