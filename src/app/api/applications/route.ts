import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { createAppSchema } from "@/lib/validations";
import { success, error, getClientIp } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { isAdmin } from "@/lib/permissions";
import { getTraceId } from "@/lib/trace";

function generateApiKey(): string {
  return `ak_${uuidv4().replace(/-/g, "")}`;
}

function generateApiSecret(): string {
  return `sk_${uuidv4().replace(/-/g, "")}${uuidv4().replace(/-/g, "")}`;
}

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
}> & { apiSecret?: string };

function serializeApplication(app: SelectedApplication) {
  const { managers, ...data } = app;
  const administrators = managers.map((manager) => manager.user);

  return {
    ...data,
    administrators,
  };
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) return error("未登录", 401);
    if (!isAdmin(currentUser)) return error("无权限", 403);

    const apps = await prisma.application.findMany({
      orderBy: { createdAt: "desc" },
      select: applicationSelect,
    });

    return success(apps.map(serializeApplication));
  } catch (err) {
    console.error("List apps error:", err);
    return error("获取应用列表失败", 500);
  }
}

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request);
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) return error("未登录", 401);
    if (!isAdmin(currentUser)) return error("无权限", 403);

    const body = await request.json();
    const parsed = createAppSchema.safeParse(body);

    if (!parsed.success) {
      return error(parsed.error.issues[0].message);
    }

    const existing = await prisma.application.findUnique({
      where: { name: parsed.data.name },
    });
    if (existing) return error("应用名已存在");

    const adminUserIds = uniqueIds(parsed.data.adminUserIds);
    const adminUsers = await prisma.user.findMany({
      where: { id: { in: adminUserIds }, status: "ACTIVE" },
      select: { id: true, username: true },
    });

    if (adminUsers.length !== adminUserIds.length) {
      return error("应用管理员不存在或已被禁用", 400);
    }

    const app = await prisma.$transaction(async (tx) => {
      const created = await tx.application.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          callbackUrl: parsed.data.callbackUrl || null,
          allowedOrigins: parsed.data.allowedOrigins,
          accessMode: parsed.data.accessMode,
          apiKey: generateApiKey(),
          apiSecret: generateApiSecret(),
        },
        select: { id: true },
      });

      await tx.applicationManager.createMany({
        data: adminUserIds.map((userId) => ({
          appId: created.id,
          userId,
        })),
      });

      return tx.application.findUniqueOrThrow({
        where: { id: created.id },
        select: {
          ...applicationSelect,
          apiSecret: true,
        },
      });
    });

    await createAuditLog({
      userId: currentUser.userId,
      action: "CREATE_APPLICATION",
      resource: "application",
      detail: {
        appId: app.id,
        name: app.name,
        accessMode: app.accessMode,
        adminUserIds,
      },
      ip: getClientIp(request),
      traceId,
    });

    await createAuditLog({
      userId: currentUser.userId,
      action: "ASSIGN_APPLICATION_MANAGER",
      resource: "application_manager",
      detail: {
        appId: app.id,
        appName: app.name,
        targetUserIds: adminUserIds,
        targetUsernames: adminUsers.map((user) => user.username),
      },
      ip: getClientIp(request),
      traceId,
    });

    return success(serializeApplication(app), 201);
  } catch (err) {
    console.error("Create app error:", err);
    return error("创建应用失败", 500);
  }
}
