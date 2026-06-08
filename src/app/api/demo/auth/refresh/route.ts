import { NextRequest, NextResponse } from "next/server";

import {
  DEMO_COOKIES,
  clearDemoCookies,
  demoCookieOptions,
  getDemoConfig,
  tokenPreview,
} from "@/lib/demo-app";
import { error, success } from "@/lib/api-response";

interface RefreshResponse {
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
  };
  error?: string;
}

export async function POST(request: NextRequest) {
  const config = getDemoConfig(request);
  const refreshToken = request.cookies.get(DEMO_COOKIES.refreshToken)?.value || "";

  if (!refreshToken) {
    return error("Demo 系统没有可用的 refreshToken", 401);
  }

  try {
    const refreshRes = await fetch(`${config.userServiceBaseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    const refreshData = (await refreshRes.json()) as RefreshResponse;

    if (!refreshRes.ok || !refreshData.success || !refreshData.data) {
      const response = NextResponse.json(
        {
          success: false,
          error: refreshData.error || "刷新 Demo 登录态失败",
        },
        { status: refreshRes.status || 401 }
      );
      clearDemoCookies(response);
      return response;
    }

    const response = success({
      accessToken: tokenPreview(refreshData.data.accessToken),
      refreshToken: tokenPreview(refreshData.data.refreshToken),
    });
    response.cookies.set(
      DEMO_COOKIES.accessToken,
      refreshData.data.accessToken,
      demoCookieOptions(15 * 60)
    );
    response.cookies.set(
      DEMO_COOKIES.refreshToken,
      refreshData.data.refreshToken,
      demoCookieOptions(7 * 24 * 60 * 60)
    );
    return response;
  } catch (err) {
    console.error("Demo refresh error:", err);
    return error("刷新 Demo 登录态失败", 500);
  }
}
