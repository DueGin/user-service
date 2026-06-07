import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
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

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) return error("未登录", 401);
    if (!isAdmin(currentUser)) return error("无权限", 403);

    const apps = await prisma.application.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        apiKey: true,
        status: true,
        callbackUrl: true,
        allowedOrigins: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return success(apps);
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

    const app = await prisma.application.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        callbackUrl: parsed.data.callbackUrl || null,
        allowedOrigins: parsed.data.allowedOrigins,
        apiKey: generateApiKey(),
        apiSecret: generateApiSecret(),
      },
    });

    await createAuditLog({
      userId: currentUser.userId,
      action: "CREATE_APPLICATION",
      resource: "application",
      detail: { appId: app.id, name: app.name },
      ip: getClientIp(request),
      traceId,
    });

    return success(app, 201);
  } catch (err) {
    console.error("Create app error:", err);
    return error("创建应用失败", 500);
  }
}
