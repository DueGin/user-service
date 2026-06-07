import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { updateAppSchema } from "@/lib/validations";
import { success, error, getClientIp } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { isAdmin } from "@/lib/permissions";
import { getTraceId } from "@/lib/trace";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) return error("未登录", 401);
    if (!isAdmin(currentUser)) return error("无权限", 403);

    const { id } = await params;

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) return error("应用不存在", 404);

    return success(app);
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

    const existing = await prisma.application.findUnique({ where: { id } });
    if (!existing) return error("应用不存在", 404);

    const app = await prisma.application.update({
      where: { id },
      data: parsed.data,
    });

    await createAuditLog({
      userId: currentUser.userId,
      action: "UPDATE_APPLICATION",
      resource: "application",
      detail: { appId: id, changes: parsed.data },
      ip: getClientIp(request),
      traceId,
    });

    return success(app);
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
