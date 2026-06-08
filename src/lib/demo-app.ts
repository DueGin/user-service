import type { NextRequest, NextResponse } from "next/server";

export const DEMO_APP_NAME = "示例业务系统 Demo";
export const DEMO_APP_ID_FALLBACK = "demo-business-app";
export const DEMO_APP_SECRET_FALLBACK = "sk_demo_business_app_secret";

export const DEMO_COOKIES = {
  accessToken: "demo_access_token",
  refreshToken: "demo_refresh_token",
  state: "demo_oauth_state",
} as const;

export interface DemoConfig {
  appId: string;
  apiSecret: string;
  userServiceBaseUrl: string;
  demoAppBaseUrl: string;
  callbackUrl: string;
  configured: boolean;
}

function cleanBaseUrl(value: string | undefined | null): string {
  return (value || "").trim().replace(/\/+$/, "");
}

function fallbackOrigin(request?: NextRequest): string {
  return request?.nextUrl.origin || "http://localhost:3000";
}

export function getDemoConfig(request?: NextRequest): DemoConfig {
  const allowDevFallback = process.env.NODE_ENV !== "production";
  const appId =
    process.env.DEMO_APP_ID || (allowDevFallback ? DEMO_APP_ID_FALLBACK : "");
  const apiSecret =
    process.env.DEMO_APP_SECRET || (allowDevFallback ? DEMO_APP_SECRET_FALLBACK : "");
  const userServiceBaseUrl =
    cleanBaseUrl(process.env.USER_SERVICE_BASE_URL) || fallbackOrigin(request);
  const demoAppBaseUrl =
    cleanBaseUrl(process.env.DEMO_APP_BASE_URL) || fallbackOrigin(request);

  return {
    appId,
    apiSecret,
    userServiceBaseUrl,
    demoAppBaseUrl,
    callbackUrl: `${demoAppBaseUrl}/api/demo/auth/callback`,
    configured: Boolean(appId && apiSecret && userServiceBaseUrl && demoAppBaseUrl),
  };
}

export function demoCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function clearDemoCookies(response: NextResponse) {
  response.cookies.set(DEMO_COOKIES.accessToken, "", demoCookieOptions(0));
  response.cookies.set(DEMO_COOKIES.refreshToken, "", demoCookieOptions(0));
  response.cookies.set(DEMO_COOKIES.state, "", demoCookieOptions(0));
}

export function tokenPreview(token: string | undefined | null): string {
  if (!token) return "";
  if (token.length <= 24) return token;
  return `${token.slice(0, 16)}...${token.slice(-8)}`;
}
