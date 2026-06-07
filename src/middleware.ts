import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Trace ID: propagate or generate (use Web Crypto API for Edge Runtime)
  const traceId = request.headers.get("x-trace-id") || crypto.randomUUID();
  response.headers.set("X-Trace-Id", traceId);
  // Store in request headers for downstream API routes to read
  response.headers.set("x-trace-id", traceId);

  // CORS headers for API routes
  if (pathname.startsWith("/api/")) {
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, x-trace-id");
    response.headers.set("Access-Control-Expose-Headers", "X-Trace-Id");

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }
  }

  // For embed mode auth pages, allow iframe from specified origins
  if (pathname.startsWith("/auth/")) {
    const mode = request.nextUrl.searchParams.get("mode");
    if (mode === "embed") {
      const origin = request.nextUrl.searchParams.get("origin");
      if (origin) {
        response.headers.set(
          "Content-Security-Policy",
          `frame-ancestors 'self' ${origin}`
        );
        response.headers.delete("X-Frame-Options");
      }
    } else {
      response.headers.set("X-Frame-Options", "DENY");
    }
  }

  // Admin pages - check for access token cookie
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = request.cookies.get("admin_token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*", "/auth/:path*", "/admin/:path*"],
};
