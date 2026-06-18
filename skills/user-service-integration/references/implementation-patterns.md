# Implementation Patterns

## Framework-Agnostic Redirect Flow

Start login endpoint:

```ts
const state = crypto.randomUUID();
storeStateInHttpOnlyCookieOrSession(state);

const url = new URL("/auth/login", USER_SERVICE_BASE_URL);
url.searchParams.set("app_id", USER_SERVICE_APP_ID);
url.searchParams.set("redirect_uri", USER_SERVICE_CALLBACK_URL);
url.searchParams.set("mode", "redirect");
url.searchParams.set("state", state);
url.searchParams.set("app_name", APP_DISPLAY_NAME);

redirect(url.toString());
```

Callback endpoint:

```ts
const { code, state } = getQueryParams(request);
const savedState = readStateFromHttpOnlyCookieOrSession(request);

if (!code) fail("missing-code");
if (!savedState || savedState !== state) fail("invalid-state");

const exchange = await fetch(`${USER_SERVICE_BASE_URL}/api/auth/exchange`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    code,
    appId: USER_SERVICE_APP_ID,
    apiSecret: USER_SERVICE_API_SECRET,
  }),
});

const result = await exchange.json();
if (!exchange.ok || !result.success) fail(result.error || "exchange-failed");

storeTokensInServerSessionOrHttpOnlyCookies(result.data.accessToken, result.data.refreshToken);
redirect(APP_AFTER_LOGIN_URL);
```

## Next.js App Router Minimal Routes

Start route:

```ts
// app/api/auth/user-service/start/route.ts
import { NextRequest, NextResponse } from "next/server";

const cookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function GET(request: NextRequest) {
  const state = crypto.randomUUID();
  const callbackUrl = process.env.USER_SERVICE_CALLBACK_URL!;
  const loginUrl = new URL("/auth/login", process.env.USER_SERVICE_BASE_URL!);

  loginUrl.searchParams.set("app_id", process.env.USER_SERVICE_APP_ID!);
  loginUrl.searchParams.set("redirect_uri", callbackUrl);
  loginUrl.searchParams.set("mode", "redirect");
  loginUrl.searchParams.set("state", state);
  loginUrl.searchParams.set("app_name", process.env.APP_DISPLAY_NAME || "Business App");

  const response = NextResponse.redirect(loginUrl);
  response.cookies.set("us_oauth_state", state, { ...cookie, maxAge: 600 });
  return response;
}
```

Callback route:

```ts
// app/api/auth/user-service/callback/route.ts
import { NextRequest, NextResponse } from "next/server";

const cookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get("us_oauth_state")?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL("/login?error=invalid-auth-callback", request.url));
  }

  const exchangeRes = await fetch(`${process.env.USER_SERVICE_BASE_URL}/api/auth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      appId: process.env.USER_SERVICE_APP_ID,
      apiSecret: process.env.USER_SERVICE_API_SECRET,
    }),
  });
  const exchange = await exchangeRes.json();

  if (!exchangeRes.ok || !exchange.success) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(exchange.error || "exchange-failed")}`, request.url));
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set("access_token", exchange.data.accessToken, { ...cookie, maxAge: 15 * 60 });
  response.cookies.set("refresh_token", exchange.data.refreshToken, { ...cookie, maxAge: 7 * 24 * 60 * 60 });
  response.cookies.set("us_oauth_state", "", { ...cookie, maxAge: 0 });
  return response;
}
```

Logout route:

```ts
// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value;
  if (token) {
    await fetch(`${process.env.USER_SERVICE_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("access_token", "", { path: "/", maxAge: 0 });
  response.cookies.set("refresh_token", "", { path: "/", maxAge: 0 });
  return response;
}
```

## Express Minimal Routes

```ts
import express from "express";
import crypto from "node:crypto";

const router = express.Router();

router.get("/auth/user-service/start", (req, res) => {
  const state = crypto.randomUUID();
  res.cookie("us_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60 * 1000,
  });

  const loginUrl = new URL("/auth/login", process.env.USER_SERVICE_BASE_URL);
  loginUrl.searchParams.set("app_id", process.env.USER_SERVICE_APP_ID!);
  loginUrl.searchParams.set("redirect_uri", process.env.USER_SERVICE_CALLBACK_URL!);
  loginUrl.searchParams.set("mode", "redirect");
  loginUrl.searchParams.set("state", state);
  loginUrl.searchParams.set("app_name", process.env.APP_DISPLAY_NAME || "Business App");

  res.redirect(loginUrl.toString());
});

router.get("/auth/user-service/callback", async (req, res) => {
  const code = String(req.query.code || "");
  const state = String(req.query.state || "");
  if (!code || !state || req.cookies.us_oauth_state !== state) {
    return res.redirect("/login?error=invalid-auth-callback");
  }

  const exchangeRes = await fetch(`${process.env.USER_SERVICE_BASE_URL}/api/auth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      appId: process.env.USER_SERVICE_APP_ID,
      apiSecret: process.env.USER_SERVICE_API_SECRET,
    }),
  });
  const exchange = await exchangeRes.json();

  if (!exchangeRes.ok || !exchange.success) {
    return res.redirect(`/login?error=${encodeURIComponent(exchange.error || "exchange-failed")}`);
  }

  res.cookie("access_token", exchange.data.accessToken, { httpOnly: true, sameSite: "lax", maxAge: 15 * 60 * 1000 });
  res.cookie("refresh_token", exchange.data.refreshToken, { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.clearCookie("us_oauth_state");
  res.redirect("/");
});
```
