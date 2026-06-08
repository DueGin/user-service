import { NextRequest, NextResponse } from "next/server";

import {
  DEMO_COOKIES,
  clearDemoCookies,
  demoCookieOptions,
  getDemoConfig,
} from "@/lib/demo-app";

interface ExchangeResponse {
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
  };
  error?: string;
}

function redirectToDemo(request: NextRequest, searchParams: Record<string, string>) {
  const url = new URL("/demo", request.nextUrl.origin);
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url;
}

export async function GET(request: NextRequest) {
  const config = getDemoConfig(request);
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state") || "";
  const savedState = request.cookies.get(DEMO_COOKIES.state)?.value || "";

  if (!config.configured) {
    const response = NextResponse.redirect(
      redirectToDemo(request, { error: "demo-config-missing" })
    );
    clearDemoCookies(response);
    return response;
  }

  if (!code) {
    const response = NextResponse.redirect(
      redirectToDemo(request, { error: "missing-code" })
    );
    clearDemoCookies(response);
    return response;
  }

  if (!savedState || !state || savedState !== state) {
    const response = NextResponse.redirect(
      redirectToDemo(request, { error: "invalid-state" })
    );
    clearDemoCookies(response);
    return response;
  }

  try {
    const exchangeRes = await fetch(`${config.userServiceBaseUrl}/api/auth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        appId: config.appId,
        apiSecret: config.apiSecret,
      }),
      cache: "no-store",
    });
    const exchangeData = (await exchangeRes.json()) as ExchangeResponse;

    if (!exchangeRes.ok || !exchangeData.success || !exchangeData.data) {
      const response = NextResponse.redirect(
        redirectToDemo(request, {
          error: encodeURIComponent(exchangeData.error || "exchange-failed"),
        })
      );
      clearDemoCookies(response);
      return response;
    }

    const response = NextResponse.redirect(
      redirectToDemo(request, { login: "success" })
    );
    response.cookies.set(
      DEMO_COOKIES.accessToken,
      exchangeData.data.accessToken,
      demoCookieOptions(15 * 60)
    );
    response.cookies.set(
      DEMO_COOKIES.refreshToken,
      exchangeData.data.refreshToken,
      demoCookieOptions(7 * 24 * 60 * 60)
    );
    response.cookies.set(DEMO_COOKIES.state, "", demoCookieOptions(0));
    return response;
  } catch (err) {
    console.error("Demo auth callback error:", err);
    const response = NextResponse.redirect(
      redirectToDemo(request, { error: "exchange-request-failed" })
    );
    clearDemoCookies(response);
    return response;
  }
}
