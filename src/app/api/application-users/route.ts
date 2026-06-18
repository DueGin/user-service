import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/session";
import { success, error, getClientIp } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import {
  canManageApplicationMembers,
  getUserAdminContext,
} from "@/lib/application-access";
import { canManageApplicationMembersFromContext } from "@/lib/application-access-policy";
import { getTraceId } from "@/lib/trace";

const createApplicationUserSchema = z.object({
  appId: z.string().min(1, "请选择应用"),
  userId: z.string().min(1, "请选择已有用户"),
});

function serializeApplicationUser(
  item: Prisma.ApplicationUserGetPayload<{
    include: {
      application: { select: { id: true; name: true } };
      user: {
        select: {
          id: true;
          username: true;
          email: true;
          phone: true;
          status: true;
          createdAt: true;
          updatedAt: true;
        };
      };
    };
  }>
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

export async function GET(request: NextRequest) {
  const traceId = getTraceId(request);
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) return error("未登录", 401);

    const access = await getUserAdminContext(currentUser);
    if (!access.canAccessAdmin) return error("无权限", 403);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20"))
    );
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const appId = searchParams.get("appId") || "";

    const applications = access.managedApplications;

    if (applications.length === 0) {
      await createAuditLog({
        userId: currentUser.userId,
        action: "DENY_APPLICATION_USER_ACCESS",
        resource: "application_user",
        detail: {
          reason: "NO_MANAGED_APPLICATION",
          result: "DENIED",
        },
        ip: getClientIp(request),
        traceId,
      }).catch(() => undefined);
      return error("无权管理应用成员", 403);
    }

    if (appId && !canManageApplicationMembersFromContext(access, appId)) {
      await createAuditLog({
        userId: currentUser.userId,
        action: "DENY_APPLICATION_USER_ACCESS",
        resource: "application_user",
        detail: {
          appId,
          reason: "NOT_APPLICATION_MANAGER",
          result: "DENIED",
        },
        ip: getClientIp(request),
        traceId,
      }).catch(() => undefined);
      return error("无权管理该应用", 403);
    }

    const selectedAppId = appId || applications[0]?.id || "";
    const appIds = selectedAppId ? [selectedAppId] : [];

    if (appIds && appIds.length === 0) {
      return success({
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        applications,
        selectedAppId,
        isAdmin: access.isAdmin,
      });
    }

    const where: Prisma.ApplicationUserWhereInput = {
      ...(appIds ? { appId: { in: appIds } } : {}),
      ...(status ? { status: status as "ACTIVE" | "DISABLED" } : {}),
      ...(search
        ? {
            user: {
              OR: [
                { username: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search } },
              ],
            },
          }
        : {}),
    };

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

    const [total, items] = await Promise.all([
      prisma.applicationUser.count({ where }),
      prisma.applicationUser.findMany({
        where,
        include,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return success({
      items: items.map(serializeApplicationUser),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      applications,
      selectedAppId,
      isAdmin: access.isAdmin,
    });
  } catch (err) {
    console.error("List application users error:", err);
    return error("获取应用用户失败", 500);
  }
}

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request);
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) return error("未登录", 401);

    const body = await request.json();
    const parsed = createApplicationUserSchema.safeParse(body);
    if (!parsed.success) {
      return error(parsed.error.issues[0].message);
    }

    const { appId, userId } = parsed.data;

    if (!(await canManageApplicationMembers(currentUser, appId))) {
      await createAuditLog({
        userId: currentUser.userId,
        action: "DENY_APPLICATION_USER_ACCESS",
        resource: "application_user",
        detail: {
          appId,
          targetUserId: userId,
          reason: "NOT_APPLICATION_MANAGER",
          result: "DENIED",
        },
        ip: getClientIp(request),
        traceId,
      }).catch(() => undefined);
      return error("无权管理该应用", 403);
    }

    const app = await prisma.application.findUnique({
      where: { id: appId },
      select: { id: true, name: true, status: true },
    });

    if (!app || app.status !== "ACTIVE") {
      return error("应用不存在或已被禁用", 400);
    }

    const item = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, status: true },
      });
      if (!existingUser || existingUser.status !== "ACTIVE") {
        throw new Error("USER_NOT_AVAILABLE");
      }

      const existingMembership = await tx.applicationUser.findUnique({
        where: {
          appId_userId: {
            appId,
            userId,
          },
        },
        select: { id: true, status: true },
      });

      if (existingMembership?.status === "ACTIVE") {
        throw new Error("APPLICATION_USER_EXISTS");
      }

      if (existingMembership?.status === "DISABLED") {
        throw new Error("APPLICATION_USER_DISABLED");
      }

      await tx.applicationUser.create({
        data: {
          appId,
          userId,
          status: "ACTIVE",
        },
      });

      return tx.applicationUser.findUniqueOrThrow({
        where: {
          appId_userId: {
            appId,
            userId,
          },
        },
        include: {
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
        },
      });
    });

    await createAuditLog({
      userId: currentUser.userId,
      action: "ADD_APPLICATION_USER",
      resource: "application_user",
      detail: { appId, appName: app.name, targetUserId: item.userId },
      ip: getClientIp(request),
      traceId,
    });

    return success(serializeApplicationUser(item), 201);
  } catch (err) {
    if (err instanceof Error && err.message === "USER_NOT_AVAILABLE") {
      return error("用户不存在或已被禁用", 404);
    }
    if (err instanceof Error && err.message === "APPLICATION_USER_EXISTS") {
      return error("该用户已是当前应用成员", 409);
    }
    if (err instanceof Error && err.message === "APPLICATION_USER_DISABLED") {
      return error("该用户已被当前应用禁用，请使用启用操作恢复访问", 409);
    }

    console.error("Create application user error:", err);
    return error("关联应用成员失败", 500);
  }
}
