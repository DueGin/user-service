import { NextRequest } from "next/server";

import { DEMO_COOKIES, getDemoConfig, tokenPreview } from "@/lib/demo-app";
import { success } from "@/lib/api-response";

interface MeResponse {
  success: boolean;
  data?: {
    id: string;
    username: string;
    email?: string | null;
    phone?: string | null;
    status?: string;
    roles?: Array<{
      id: string;
      name: string;
      description?: string | null;
      permissions?: unknown;
    }>;
  };
  error?: string;
}

export async function GET(request: NextRequest) {
  const config = getDemoConfig(request);
  const accessToken = request.cookies.get(DEMO_COOKIES.accessToken)?.value || "";
  const refreshToken = request.cookies.get(DEMO_COOKIES.refreshToken)?.value || "";

  if (!accessToken) {
    return success({
      authenticated: false,
      error: refreshToken ? "access-token-missing" : null,
      canRefresh: Boolean(refreshToken),
      config: {
        appId: config.appId,
        callbackUrl: config.callbackUrl,
        userServiceBaseUrl: config.userServiceBaseUrl,
        configured: config.configured,
      },
      tokens: {
        accessToken: "",
        refreshToken: tokenPreview(refreshToken),
      },
    });
  }

  try {
    const meRes = await fetch(`${config.userServiceBaseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const me = (await meRes.json()) as MeResponse;

    return success({
      authenticated: meRes.ok && me.success,
      error: me.success ? null : me.error || "session-invalid",
      canRefresh: Boolean(refreshToken),
      user: me.data || null,
      config: {
        appId: config.appId,
        callbackUrl: config.callbackUrl,
        userServiceBaseUrl: config.userServiceBaseUrl,
        configured: config.configured,
      },
      tokens: {
        accessToken: tokenPreview(accessToken),
        refreshToken: tokenPreview(refreshToken),
      },
    });
  } catch (err) {
    console.error("Demo session error:", err);
    return success({
      authenticated: false,
      error: "session-request-failed",
      canRefresh: Boolean(refreshToken),
      user: null,
      config: {
        appId: config.appId,
        callbackUrl: config.callbackUrl,
        userServiceBaseUrl: config.userServiceBaseUrl,
        configured: config.configured,
      },
      tokens: {
        accessToken: tokenPreview(accessToken),
        refreshToken: tokenPreview(refreshToken),
      },
    });
  }
}
