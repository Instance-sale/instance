import { NextRequest, NextResponse } from "next/server";
const LEGACY_LOCALES = new Set(["en", "de", "fr", "hi", "es"]);

export function proxy(req: NextRequest) {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("origin");
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      "http://localhost:3000",
      "http://localhost:4000",
    ].filter(Boolean) as string[];

    const isAllowed = origin && (allowedOrigins.includes(origin) || process.env.NODE_ENV === "development");
    const allowOriginHeader = isAllowed ? origin : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": allowOriginHeader,
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, x-session-token, Cookie, RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Url",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  }

  const pathname = req.nextUrl.pathname;

  // 1. If URL has a legacy locale prefix (e.g., /en/dashboard -> /dashboard), strip it and redirect
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && LEGACY_LOCALES.has(segments[0].toLowerCase())) {
    const strippedPath = "/" + segments.slice(1).join("/");
    const url = new URL(strippedPath || "/", req.url);
    url.search = req.nextUrl.search;
    return NextResponse.redirect(url, 308);
  }

  // 3. Read session cookie
  const sessionToken =
    req.cookies.get("__Secure-next-auth.session-token")?.value ||
    req.cookies.get("next-auth.session-token")?.value;

  const isAuthenticated = Boolean(sessionToken);

  // 4. If already logged in, redirect away from login/signup to dashboard
  if (
    isAuthenticated &&
    (pathname === "/login" ||
      pathname.startsWith("/login/") ||
      pathname === "/signup" ||
      pathname.startsWith("/signup/"))
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 5. Protected routes that require authentication
  const isProtectedPath =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/setup" ||
    pathname.startsWith("/setup/");

  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    const targetUrl = req.nextUrl.search ? `${pathname}${req.nextUrl.search}` : pathname;
    loginUrl.searchParams.set("callbackUrl", targetUrl);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next(?:/|$)|api(?:/|$)|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm|pdf|txt)$).*)",
  ],
};
