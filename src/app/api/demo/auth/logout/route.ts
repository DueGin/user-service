import { NextRequest, NextResponse } from "next/server";

import { DEMO_COOKIES, clearDemoCookies, getDemoConfig } from "@/lib/demo-app";

export async function POST(request: NextRequest) {
  const config = getDemoConfig(request);
  const accessToken = request.cookies.get(DEMO_COOKIES.accessToken)?.value || "";

  if (accessToken) {
    try {
      await fetch(`${config.userServiceBaseUrl}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
    } catch (err) {
      console.error("Demo logout upstream error:", err);
    }
  }

  const response = NextResponse.json({
    success: true,
    data: { message: "Demo 系统已退出登录" },
  });
  clearDemoCookies(response);
  return response;
}
