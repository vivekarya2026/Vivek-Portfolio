/**
 * Next.js Middleware — validates the Appwrite session cookie and redirects
 * unauthenticated visitors away from /admin/* routes.
 *
 * Runs on the Edge runtime (no Node.js APIs allowed).
 * Uses direct fetch to the Appwrite REST API rather than the Node SDK.
 */
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "appwrite-session";
const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1";
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "";

export const config = {
  matcher: ["/admin/:path*"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow the login page.
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const sessionSecret = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionSecret) {
    return redirectToLogin(request);
  }

  // Validate session with Appwrite REST API (Edge-compatible fetch).
  try {
    const res = await fetch(`${APPWRITE_ENDPOINT}/account`, {
      headers: {
        "X-Appwrite-Project": PROJECT_ID,
        "X-Appwrite-Session": sessionSecret,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return redirectToLogin(request);
    }
  } catch {
    // If Appwrite is unreachable, fall through to layout guard.
    return NextResponse.next();
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}
