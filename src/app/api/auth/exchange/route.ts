import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { exchangeCodeSchema } from "@/lib/validations";
import { success, error, getClientIp } from "@/lib/api-response";
import { getTraceId } from "@/lib/trace";
import type { Prisma } from "@/generated/prisma/client";
import { ensureApplicationAccess } from "@/lib/application-access";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request);
  try {
    const body = await request.json();
    const parsed = exchangeCodeSchema.safeParse(body);

    if (!parsed.success) {
      return error(parsed.error.issues[0].message);
    }

    const { code, appId, apiSecret } = parsed.data;

    const app = await prisma.application.findUnique({
      where: { id: appId },
    });

    if (!app || app.apiSecret !== apiSecret) {
      return error("应用验证失败", 401);
    }

    if (app.status !== "ACTIVE") {
      return error("应用已被禁用", 403);
    }

    const authCode = await prisma.authCode.findUnique({
      where: { code },
    });

    if (!authCode) {
      return error("授权码无效", 400);
    }

    if (authCode.used) {
      return error("授权码已使用", 400);
    }

    if (authCode.expiresAt < new Date()) {
      return error("授权码已过期", 400);
    }

    if (authCode.appId !== appId) {
      return error("授权码与应用不匹配", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: authCode.userId },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || user.status !== "ACTIVE") {
      return error("用户不存在或已被禁用", 403);
    }

    const appAccess = await ensureApplicationAccess(appId, user.id);
    if (!appAccess.ok) {
      await createAuditLog({
        userId: user.id,
        action: "DENY_APPLICATION_EXCHANGE",
        resource: "application_user",
        detail: {
          appId,
          appName: app.name,
          targetUserId: user.id,
          reason: appAccess.reason,
          result: "DENIED",
        },
        ip: getClientIp(request),
        traceId,
      }).catch(() => undefined);
      return error(appAccess.message, appAccess.status);
    }

    const roles = user.userRoles.map((ur: { role: { name: string } }) => ur.role.name);
    const payload = { userId: user.id, username: user.username, roles };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.$transaction(async (tx) => {
      const marked = await tx.authCode.updateMany({
        where: { id: authCode.id, used: false },
        data: { used: true },
      });

      if (marked.count !== 1) {
        throw new Error("AUTH_CODE_ALREADY_USED");
      }

      await tx.session.create({
        data: {
          userId: user.id,
          token: accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          ip: getClientIp(request),
          userAgent: request.headers.get("user-agent") ?? undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "AUTH_CODE_EXCHANGE",
          resource: "auth_code",
          detail: { appId, appName: app.name } as Prisma.InputJsonValue,
          ip: getClientIp(request),
          traceId,
        },
      });
    });

    return success({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        roles,
      },
    });
  } catch (err) {
    console.error("Exchange error:", err);
    return error("授权码兑换失败", 500);
  }
}
