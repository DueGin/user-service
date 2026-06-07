import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { createRoleSchema } from "@/lib/validations";
import { success, error, getClientIp } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { isAdmin } from "@/lib/permissions";
import { getTraceId } from "@/lib/trace";

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) return error("未登录", 401);
    if (!isAdmin(currentUser)) return error("无权限", 403);

    const roles = await prisma.role.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { userRoles: true } } },
    });

    return success(roles);
  } catch (err) {
    console.error("List roles error:", err);
    return error("获取角色列表失败", 500);
  }
}

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request);
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) return error("未登录", 401);
    if (!isAdmin(currentUser)) return error("无权限", 403);

    const body = await request.json();
    const parsed = createRoleSchema.safeParse(body);

    if (!parsed.success) {
      return error(parsed.error.issues[0].message);
    }

    const existing = await prisma.role.findUnique({
      where: { name: parsed.data.name },
    });
    if (existing) return error("角色名已存在");

    const role = await prisma.role.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        permissions: parsed.data.permissions,
      },
    });

    await createAuditLog({
      userId: currentUser.userId,
      action: "CREATE_ROLE",
      resource: "role",
      detail: { roleId: role.id, name: role.name },
      ip: getClientIp(request),
      traceId,
    });

    return success(role, 201);
  } catch (err) {
    console.error("Create role error:", err);
    return error("创建角色失败", 500);
  }
}
