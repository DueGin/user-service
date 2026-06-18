import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/session";
import { success, error, getClientIp } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { canManageApplicationMembers } from "@/lib/application-access";
import { getTraceId } from "@/lib/trace";

const updateApplicationUserSchema = z.object({
  status: z.enum(["ACTIVE", "DISABLED"]),
});

const include = {
  application: { select: { id: true, name: true } },
  user: {
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.ApplicationUserInclude;

function serializeApplicationUser(
  item: Prisma.ApplicationUserGetPayload<{ include: typeof include }>
) {
  return {
    id: item.id,
    appId: item.appId,
    appName: item.application.name,
    userId: item.userId,
    username: item.user.username,
    email: item.user.email,
    phone: item.user.phone,
    userStatus: item.user.status,
    membershipStatus: item.status,
    lastLoginAt: item.lastLoginAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = getTraceId(request);
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) return error("未登录", 401);

    const { id } = await params;
    const body = await request.json();
    const parsed = updateApplicationUserSchema.safeParse(body);
    if (!parsed.success) {
      return error(parsed.error.issues[0].message);
    }

    const existing = await prisma.applicationUser.findUnique({
      where: { id },
      include,
    });

    if (!existing) return error("应用用户不存在", 404);

    if (!(await canManageApplicationMembers(currentUser, existing.appId))) {
      await createAuditLog({
        userId: currentUser.userId,
        action: "DENY_APPLICATION_USER_ACCESS",
        resource: "application_user",
        detail: {
          applicationUserId: id,
          appId: existing.appId,
          targetUserId: existing.userId,
          reason: "NOT_APPLICATION_MANAGER",
          result: "DENIED",
        },
        ip: getClientIp(request),
        traceId,
      }).catch(() => undefined);
      return error("无权管理该应用", 403);
    }

    const item = await prisma.applicationUser.update({
      where: { id },
      data: { status: parsed.data.status },
      include,
    });

    await createAuditLog({
      userId: currentUser.userId,
      action: "UPDATE_APPLICATION_USER",
      resource: "application_user",
      detail: {
        applicationUserId: id,
        appId: item.appId,
        targetUserId: item.userId,
        status: parsed.data.status,
      },
      ip: getClientIp(request),
      traceId,
    });

    return success(serializeApplicationUser(item));
  } catch (err) {
    console.error("Update application user error:", err);
    return error("更新应用用户失败", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = getTraceId(request);
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) return error("未登录", 401);

    const { id } = await params;
    const existing = await prisma.applicationUser.findUnique({
      where: { id },
      include,
    });

    if (!existing) return error("应用用户不存在", 404);

    if (!(await canManageApplicationMembers(currentUser, existing.appId))) {
      await createAuditLog({
        userId: currentUser.userId,
        action: "DENY_APPLICATION_USER_ACCESS",
        resource: "application_user",
        detail: {
          applicationUserId: id,
          appId: existing.appId,
          targetUserId: existing.userId,
          reason: "NOT_APPLICATION_MANAGER",
          result: "DENIED",
        },
        ip: getClientIp(request),
        traceId,
      }).catch(() => undefined);
      return error("无权管理该应用", 403);
    }

    const item = await prisma.applicationUser.update({
      where: { id },
      data: { status: "DISABLED" },
      include,
    });

    await createAuditLog({
      userId: currentUser.userId,
      action: "DISABLE_APPLICATION_USER",
      resource: "application_user",
      detail: {
        applicationUserId: id,
        appId: item.appId,
        targetUserId: item.userId,
      },
      ip: getClientIp(request),
      traceId,
    });

    return success(serializeApplicationUser(item));
  } catch (err) {
    console.error("Disable application user error:", err);
    return error("禁用应用用户失败", 500);
  }
}
