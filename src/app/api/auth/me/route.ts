import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getTokenFromRequest } from "@/lib/session";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return error("未登录", 401);
    }

    // Verify session still exists (handles logout invalidation)
    const token = getTokenFromRequest(request);
    if (!token) {
      return error("未登录", 401);
    }

    const session = await prisma.session.findFirst({
      where: { userId: currentUser.userId, token },
    });
    if (!session) {
      return error("会话已失效，请重新登录", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
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
          include: {
            role: {
              select: { id: true, name: true, description: true, permissions: true },
            },
          },
        },
      },
    });

    if (!user) {
      return error("用户不存在", 404);
    }

    return success({
      ...user,
      roles: user.userRoles.map((ur: { role: { id: string; name: string; description: string | null; permissions: unknown } }) => ur.role),
    });
  } catch (err) {
    console.error("Get me error:", err);
    return error("获取用户信息失败", 500);
  }
}
