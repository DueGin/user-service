import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { success, error, getClientIp } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { getTraceId } from "@/lib/trace";
import { ensureApplicationAccess } from "@/lib/application-access";

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request);
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return error(parsed.error.issues[0].message);
    }

    const { username, password, email, phone, appId } = parsed.data;

    if (appId) {
      const app = await prisma.application.findUnique({
        where: { id: appId },
        select: { id: true, status: true, accessMode: true },
      });

      if (!app || app.status !== "ACTIVE") {
        return error("应用不存在或已被禁用", 400);
      }

      if (app.accessMode !== "OPEN") {
        return error("该应用不开放自助注册，请联系应用管理员", 403);
      }
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existing) {
      if (existing.username === username) return error("用户名已存在");
      if (email && existing.email === email) return error("邮箱已被注册");
      if (phone && existing.phone === phone) return error("手机号已被注册");
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        email: email || null,
        phone: phone || null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    if (appId) {
      const appAccess = await ensureApplicationAccess(appId, user.id);
      if (!appAccess.ok) {
        return error(appAccess.message, appAccess.status);
      }
    }

    await createAuditLog({
      userId: user.id,
      action: "REGISTER",
      resource: "user",
      detail: { username, appId },
      ip: getClientIp(request),
      traceId,
    });

    return success(user, 201);
  } catch (err) {
    console.error("Register error:", err);
    return error("注册失败，请稍后重试", 500);
  }
}
