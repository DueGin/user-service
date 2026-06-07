import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { updateRoleSchema } from "@/lib/validations";
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

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: { user: { select: { id: true, username: true, email: true } } },
        },
        _count: { select: { userRoles: true } },
      },
    });

    if (!role) return error("角色不存在", 404);
    return success(role);
  } catch (err) {
    console.error("Get role error:", err);
    return error("获取角色详情失败", 500);
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
    const parsed = updateRoleSchema.safeParse(body);

    if (!parsed.success) {
      return error(parsed.error.issues[0].message);
    }

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) return error("角色不存在", 404);

    const role = await prisma.role.update({
      where: { id },
      data: parsed.data,
    });

    await createAuditLog({
      userId: currentUser.userId,
      action: "UPDATE_ROLE",
      resource: "role",
      detail: { roleId: id, changes: parsed.data },
      ip: getClientIp(request),
      traceId,
    });

    return success(role);
  } catch (err) {
    console.error("Update role error:", err);
    return error("更新角色失败", 500);
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

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) return error("角色不存在", 404);

    await prisma.role.delete({ where: { id } });

    await createAuditLog({
      userId: currentUser.userId,
      action: "DELETE_ROLE",
      resource: "role",
      detail: { roleId: id, name: existing.name },
      ip: getClientIp(request),
      traceId,
    });

    return success({ message: "角色已删除" });
  } catch (err) {
    console.error("Delete role error:", err);
    return error("删除角色失败", 500);
  }
}
