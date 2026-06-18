import { NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { updateAppSchema } from "@/lib/validations";
import { success, error, getClientIp } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { isAdmin } from "@/lib/permissions";
import { getTraceId } from "@/lib/trace";

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids));
}

const managerUserSelect = {
  id: true,
  username: true,
  email: true,
  phone: true,
  status: true,
} satisfies Prisma.UserSelect;

const applicationSelect = {
  id: true,
  name: true,
  description: true,
  apiKey: true,
  status: true,
  accessMode: true,
  callbackUrl: true,
  allowedOrigins: true,
  createdAt: true,
  updatedAt: true,
  managers: {
    include: {
      user: { select: managerUserSelect },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.ApplicationSelect;

type SelectedApplication = Prisma.ApplicationGetPayload<{
  select: typeof applicationSelect;
}>;

function serializeApplication(app: SelectedApplication) {
  const { managers, ...data } = app;

  return {
    ...data,
    administrators: managers.map((manager) => manager.user),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) return error("未登录", 401);
    if (!isAdmin(currentUser)) return error("无权限", 403);

    const { id } = await params;

    const app = await prisma.application.findUnique({
      where: { id },
      select: applicationSelect,
    });
    if (!app) return error("应用不存在", 404);

    return success(serializeApplication(app));
  } catch (err) {
    console.error("Get app error:", err);
    return error("获取应用详情失败", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = getTraceId(request);
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) return error("未登录", 401);
    if (!isAdmin(currentUser)) return error("无权限", 403);

    const { id } = await params;
    const body = await request.json();
    const parsed = updateAppSchema.safeParse(body);

    if (!parsed.success) {
      return error(parsed.error.issues[0].message);
    }

    const existing = await prisma.application.findUnique({
      where: { id },
      include: {
        managers: {
          include: { user: { select: { id: true, username: true, status: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!existing) return error("应用不存在", 404);

    const nextStatus = parsed.data.status ?? existing.status;
    const requestedAdminUserIds = parsed.data.adminUserIds
      ? uniqueIds(parsed.data.adminUserIds)
      : undefined;
    const existingActiveAdminIds = existing.managers
      .filter((manager) => manager.user.status === "ACTIVE")
      .map((manager) => manager.userId);

    let adminUsers: Array<{ id: string; username: string }> = [];
    if (requestedAdminUserIds) {
      adminUsers = await prisma.user.findMany({
        where: { id: { in: requestedAdminUserIds }, status: "ACTIVE" },
        select: { id: true, username: true },
      });

      if (adminUsers.length !== requestedAdminUserIds.length) {
        return error("应用管理员不存在或已被禁用", 400);
      }
    }

    const nextActiveAdminIds = requestedAdminUserIds ?? existingActiveAdminIds;
    if (nextStatus === "ACTIVE" && nextActiveAdminIds.length === 0) {
      return error("启用应用前请至少设置一个可用的应用管理员", 400);
    }

    const applicationData = {
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status,
      accessMode: parsed.data.accessMode,
      allowedOrigins: parsed.data.allowedOrigins,
      ...(parsed.data.callbackUrl !== undefined
        ? { callbackUrl: parsed.data.callbackUrl || null }
        : {}),
    };

    const currentAdminIds = existing.managers.map((manager) => manager.userId);
    const addedAdminIds = requestedAdminUserIds
      ? requestedAdminUserIds.filter((userId) => !currentAdminIds.includes(userId))
      : [];
    const removedAdminIds = requestedAdminUserIds
      ? currentAdminIds.filter((userId) => !requestedAdminUserIds.includes(userId))
      : [];

    const app = await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id },
        data: applicationData,
      });

      if (requestedAdminUserIds) {
        await tx.applicationManager.deleteMany({ where: { appId: id } });
        await tx.applicationManager.createMany({
          data: requestedAdminUserIds.map((userId) => ({ appId: id, userId })),
        });
      }

      return tx.application.findUniqueOrThrow({
        where: { id },
        select: applicationSelect,
      });
    });

    await createAuditLog({
      userId: currentUser.userId,
      action: "UPDATE_APPLICATION",
      resource: "application",
      detail: { appId: id, changes: parsed.data },
      ip: getClientIp(request),
      traceId,
    });

    if (requestedAdminUserIds) {
      await createAuditLog({
        userId: currentUser.userId,
        action: "ASSIGN_APPLICATION_MANAGER",
        resource: "application_manager",
        detail: {
          appId: id,
          appName: app.name,
          targetUserIds: requestedAdminUserIds,
          targetUsernames: adminUsers.map((user) => user.username),
          addedUserIds: addedAdminIds,
          removedUserIds: removedAdminIds,
        },
        ip: getClientIp(request),
        traceId,
      });
    }

    return success(serializeApplication(app));
  } catch (err) {
    console.error("Update app error:", err);
    return error("更新应用失败", 500);
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
    if (!isAdmin(currentUser)) return error("无权限", 403);

    const { id } = await params;

    const existing = await prisma.application.findUnique({ where: { id } });
    if (!existing) return error("应用不存在", 404);

    await prisma.application.update({
      where: { id },
      data: { status: "DISABLED" },
    });

    await createAuditLog({
      userId: currentUser.userId,
      action: "DISABLE_APPLICATION",
      resource: "application",
      detail: { appId: id, name: existing.name },
      ip: getClientIp(request),
      traceId,
    });

    return success({ message: "应用已禁用" });
  } catch (err) {
    console.error("Delete app error:", err);
    return error("禁用应用失败", 500);
  }
}
