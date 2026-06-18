import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { success, error, getClientIp } from "@/lib/api-response";
import { getTraceId } from "@/lib/trace";
import { ensureApplicationAccess } from "@/lib/application-access";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request);
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) return error("未登录", 401);

    const body = await request.json();
    const { appId, redirectUri, state } = body;

    if (!appId || !redirectUri) {
      return error("缺少 appId 或 redirectUri", 400);
    }

    const app = await prisma.application.findUnique({
      where: { id: appId },
    });

    if (!app || app.status !== "ACTIVE") {
      return error("应用不存在或已被禁用", 400);
    }

    if (app.callbackUrl) {
      const registered = new URL(app.callbackUrl);
      const requested = new URL(redirectUri);
      if (registered.origin !== requested.origin) {
        return error("回调地址不匹配", 400);
      }
    }

    const appAccess = await ensureApplicationAccess(appId, currentUser.userId);
    if (!appAccess.ok) {
      await createAuditLog({
        userId: currentUser.userId,
        action: "DENY_APPLICATION_AUTHORIZE",
        resource: "application_user",
        detail: {
          appId,
          targetUserId: currentUser.userId,
          reason: appAccess.reason,
          result: "DENIED",
        },
        ip: getClientIp(request),
        traceId,
      }).catch(() => undefined);
      return error(appAccess.message, appAccess.status);
    }

    const code = uuidv4().replace(/-/g, "");

    await prisma.authCode.create({
      data: {
        code,
        appId,
        userId: currentUser.userId,
        redirectUri,
        state: state || null,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    return success({ code, traceId });
  } catch (err) {
    console.error("Authorize error:", err);
    return error("生成授权码失败", 500);
  }
}
