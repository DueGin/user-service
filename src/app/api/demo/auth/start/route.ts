import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  DEMO_APP_ID_FALLBACK,
  DEMO_APP_NAME,
  DEMO_APP_SECRET_FALLBACK,
  DEMO_COOKIES,
  demoCookieOptions,
  getDemoConfig,
} from "@/lib/demo-app";

export async function GET(request: NextRequest) {
  const config = getDemoConfig(request);
  if (!config.configured) {
    return NextResponse.redirect(
      new URL("/demo?error=demo-config-missing", request.nextUrl.origin)
    );
  }

  try {
    if (
      process.env.NODE_ENV !== "production" &&
      config.appId === DEMO_APP_ID_FALLBACK &&
      config.apiSecret === DEMO_APP_SECRET_FALLBACK
    ) {
      await prisma.application.upsert({
        where: { id: DEMO_APP_ID_FALLBACK },
        update: {
          name: DEMO_APP_NAME,
          description: "用于演示第三方业务系统如何接入 User Service 默认登录页",
          apiKey: "ak_demo_business_app",
          apiSecret: DEMO_APP_SECRET_FALLBACK,
          callbackUrl: config.callbackUrl,
          allowedOrigins: [config.demoAppBaseUrl],
          status: "ACTIVE",
        },
        create: {
          id: DEMO_APP_ID_FALLBACK,
          name: DEMO_APP_NAME,
          description: "用于演示第三方业务系统如何接入 User Service 默认登录页",
          apiKey: "ak_demo_business_app",
          apiSecret: DEMO_APP_SECRET_FALLBACK,
          callbackUrl: config.callbackUrl,
          allowedOrigins: [config.demoAppBaseUrl],
          status: "ACTIVE",
        },
      });
    } else {
      const app = await prisma.application.findUnique({
        where: { id: config.appId },
        select: { id: true, status: true },
      });

      if (!app || app.status !== "ACTIVE") {
        return NextResponse.redirect(
          new URL("/demo?error=demo-app-not-found", request.nextUrl.origin)
        );
      }
    }
  } catch (err) {
    console.error("Demo app prepare error:", err);
    return NextResponse.redirect(
      new URL("/demo?error=demo-app-prepare-failed", request.nextUrl.origin)
    );
  }

  const state = crypto.randomUUID();
  const loginUrl = new URL("/auth/login", config.userServiceBaseUrl);
  loginUrl.searchParams.set("app_id", config.appId);
  loginUrl.searchParams.set("redirect_uri", config.callbackUrl);
  loginUrl.searchParams.set("mode", "redirect");
  loginUrl.searchParams.set("state", state);
  loginUrl.searchParams.set("app_name", DEMO_APP_NAME);

  const response = NextResponse.redirect(loginUrl);
  response.cookies.set(DEMO_COOKIES.state, state, demoCookieOptions(10 * 60));
  return response;
}
