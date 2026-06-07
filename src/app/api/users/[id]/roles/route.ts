import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { success, error, getClientIp } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { isAdmin } from "@/lib/permissions";
import { getTraceId } from "@/lib/trace";

const assignRolesSchema = z.object({
  roleIds: z.array(z.string()).min(1, "至少选择一个角色"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) return error("未登录", 401);
    if (!isAdmin(currentUser)) return error("无权限", 403);

    const { id } = await params;

    const userRoles = await prisma.userRole.findMany({
      where: { userId: id },
      include: { role: true },
    });

    return success(userRoles.map((ur: typeof userRoles[number]) => ur.role));
  } catch (err) {
    console.error("Get user roles error:", err);
    return error("获取用户角色失败", 500);
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
    const parsed = assignRolesSchema.safeParse(body);

    if (!parsed.success) {
      return error(parsed.error.issues[0].message);
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return error("用户不存在", 404);

    await prisma.userRole.deleteMany({ where: { userId: id } });

    await prisma.userRole.createMany({
      data: parsed.data.roleIds.map((roleId: string) => ({
        userId: id,
        roleId,
      })),
    });

    await createAuditLog({
      userId: currentUser.userId,
      action: "ASSIGN_ROLES",
      resource: "user_role",
      detail: { targetUserId: id, roleIds: parsed.data.roleIds },
      ip: getClientIp(request),
      traceId,
    });

    return success({ message: "角色分配成功" });
  } catch (err) {
    console.error("Assign roles error:", err);
    return error("角色分配失败", 500);
  }
}
