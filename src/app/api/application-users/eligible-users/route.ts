import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { success, error, getClientIp } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { canManageApplicationMembers } from "@/lib/application-access";
import { getTraceId } from "@/lib/trace";

export async function GET(request: NextRequest) {
  const traceId = getTraceId(request);
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) return error("未登录", 401);

    const { searchParams } = new URL(request.url);
    const appId = searchParams.get("appId") || "";
    const search = (searchParams.get("search") || "").trim();
    const pageSize = Math.min(
      20,
      Math.max(1, parseInt(searchParams.get("pageSize") || "10"))
    );

    if (!appId) return error("请选择应用", 400);
    if (search.length < 1) return error("请输入搜索关键词", 400);

    if (!(await canManageApplicationMembers(currentUser, appId))) {
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

    const users = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { username: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        status: true,
        applicationUsers: {
          where: { appId },
          select: { id: true, status: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: pageSize,
    });

    return success(
      users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        status: user.status,
        membershipStatus: user.applicationUsers[0]?.status ?? null,
      }))
    );
  } catch (err) {
    console.error("Search eligible application users error:", err);
    return error("搜索可关联用户失败", 500);
  }
}
