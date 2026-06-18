import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { success, error, getClientIp } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { isAdmin } from "@/lib/permissions";
import { getTraceId } from "@/lib/trace";

const updateManagersSchema = z.object({
  adminUserIds: z.array(z.string().min(1)).min(1, "请选择至少一个应用管理员").optional(),
  adminUserId: z.string().min(1, "请选择应用管理员").optional(),
  userIds: z.array(z.string().min(1)).min(1, "请选择至少一个应用管理员").optional(),
});

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids));
}

function resolveAdminUserIds(data: z.infer<typeof updateManagersSchema>) {
  return uniqueIds(
    data.adminUserIds ?? data.userIds ?? (data.adminUserId ? [data.adminUserId] : [])
  );
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

    const managers = await prisma.applicationManager.findMany({
      where: { appId: id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            phone: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return success(managers.map((manager) => manager.user));
  } catch (err) {
    console.error("Get application managers error:", err);
    return error("获取应用管理员失败", 500);
  }
}

export async function POST(
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
    const parsed = updateManagersSchema.safeParse(body);

    if (!parsed.success) {
      return error(parsed.error.issues[0].message);
    }

    const app = await prisma.application.findUnique({
      where: { id },
      include: {
        managers: {
          select: { userId: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!app) return error("应用不存在", 404);

    const adminUserIds = resolveAdminUserIds(parsed.data);
    if (adminUserIds.length === 0) return error("请选择至少一个应用管理员", 400);

    const adminUsers = await prisma.user.findMany({
      where: { id: { in: adminUserIds }, status: "ACTIVE" },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        status: true,
      },
    });

    if (adminUsers.length !== adminUserIds.length) {
      return error("应用管理员不存在或已被禁用", 400);
    }

    const currentAdminIds = app.managers.map((manager) => manager.userId);
    const addedAdminIds = adminUserIds.filter((userId) => !currentAdminIds.includes(userId));
    const removedAdminIds = currentAdminIds.filter((userId) => !adminUserIds.includes(userId));

    await prisma.$transaction(async (tx) => {
      await tx.applicationManager.deleteMany({ where: { appId: id } });
      await tx.applicationManager.createMany({
        data: adminUserIds.map((userId) => ({ appId: id, userId })),
      });
    });

    await createAuditLog({
      userId: currentUser.userId,
      action: "ASSIGN_APPLICATION_MANAGER",
      resource: "application_manager",
      detail: {
        appId: id,
        appName: app.name,
        targetUserIds: adminUserIds,
        targetUsernames: adminUsers.map((user) => user.username),
        addedUserIds: addedAdminIds,
        removedUserIds: removedAdminIds,
      },
      ip: getClientIp(request),
      traceId,
    });

    return success({ message: "应用管理员已更新", administrators: adminUsers });
  } catch (err) {
    console.error("Update application managers error:", err);
    return error("更新应用管理员失败", 500);
  }
}
