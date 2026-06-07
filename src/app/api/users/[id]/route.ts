import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { updateUserSchema } from "@/lib/validations";
import { success, error, getClientIp } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { isAdmin } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth";
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

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        avatar: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: { role: { select: { id: true, name: true, description: true, permissions: true } } },
        },
      },
    });

    if (!user) return error("用户不存在", 404);

    return success({
      ...user,
      roles: user.userRoles.map((ur: typeof user.userRoles[number]) => ur.role),
    });
  } catch (err) {
    console.error("Get user error:", err);
    return error("获取用户详情失败", 500);
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
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return error(parsed.error.issues[0].message);
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return error("用户不存在", 404);

    const data: Record<string, unknown> = {};
    if (parsed.data.username !== undefined) data.username = parsed.data.username;
    if (parsed.data.email !== undefined) data.email = parsed.data.email || null;
    if (parsed.data.phone !== undefined) data.phone = parsed.data.phone || null;
    if (parsed.data.avatar !== undefined) data.avatar = parsed.data.avatar || null;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.password) data.passwordHash = await hashPassword(parsed.data.password);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        avatar: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      userId: currentUser.userId,
      action: "UPDATE_USER",
      resource: "user",
      detail: { targetUserId: id, changes: parsed.data },
      ip: getClientIp(request),
      traceId,
    });

    return success(user);
  } catch (err) {
    console.error("Update user error:", err);
    return error("更新用户失败", 500);
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

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return error("用户不存在", 404);

    await prisma.user.update({
      where: { id },
      data: { status: "DISABLED" },
    });

    await createAuditLog({
      userId: currentUser.userId,
      action: "DISABLE_USER",
      resource: "user",
      detail: { targetUserId: id, username: existing.username },
      ip: getClientIp(request),
      traceId,
    });

    return success({ message: "用户已禁用" });
  } catch (err) {
    console.error("Delete user error:", err);
    return error("禁用用户失败", 500);
  }
}
