import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { loginSchema } from "@/lib/validations";
import { success, error, getClientIp } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { getTraceId } from "@/lib/trace";
import {
  ensureApplicationAccess,
  getUserAdminContext,
} from "@/lib/application-access";

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request);
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return error(parsed.error.issues[0].message);
    }

    const { account, password, appId } = parsed.data;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: account }, { email: account }, { phone: account }],
      },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      return error("账号或密码错误", 401);
    }

    if (user.status !== "ACTIVE") {
      return error("账号已被禁用", 403);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return error("账号或密码错误", 401);
    }

    const roles = user.userRoles.map((ur: { role: { name: string } }) => ur.role.name);
    const payload = { userId: user.id, username: user.username, roles };

    if (appId) {
      const appAccess = await ensureApplicationAccess(appId, user.id);
      if (!appAccess.ok) {
        await createAuditLog({
          userId: user.id,
          action: "DENY_APPLICATION_LOGIN",
          resource: "application_user",
          detail: {
            appId,
            targetUserId: user.id,
            reason: appAccess.reason,
            result: "DENIED",
          },
          ip: getClientIp(request),
          traceId,
        }).catch(() => undefined);
        return error(appAccess.message, appAccess.status);
      }
    }

    const adminContext = await getUserAdminContext(payload);

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ip: getClientIp(request),
        userAgent: request.headers.get("user-agent") ?? undefined,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "LOGIN",
      resource: "session",
      detail: { sessionId: session.id, appId },
      ip: getClientIp(request),
      traceId,
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
        managedApplications: adminContext.managedApplications,
        isAdmin: adminContext.isAdmin,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return error("登录失败，请稍后重试", 500);
  }
}
