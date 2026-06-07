import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { success, error } from "@/lib/api-response";
import { isAdmin } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) return error("未登录", 401);
    if (!isAdmin(currentUser)) return error("无权限", 403);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));
    const action = searchParams.get("action") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const resource = searchParams.get("resource") || undefined;
    const traceId = searchParams.get("traceId") || undefined;

    const where = {
      ...(action ? { action } : {}),
      ...(userId ? { userId } : {}),
      ...(resource ? { resource } : {}),
      ...(traceId ? { traceId } : {}),
    };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, username: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return success({
      items: logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("List audit logs error:", err);
    return error("获取操作日志失败", 500);
  }
}
