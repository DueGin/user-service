import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/session";
import { success, error, getClientIp } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { getTraceId } from "@/lib/trace";

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request);
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return error("未登录", 401);
    }

    // Try to find session by exact token first, fallback to userId
    let session = await prisma.session.findUnique({
      where: { token },
    });

    if (!session) {
      // Token may have been rotated by refresh, decode and find by userId
      const { verifyAccessToken } = await import("@/lib/jwt");
      try {
        const payload = verifyAccessToken(token);
        session = await prisma.session.findFirst({
          where: { userId: payload.userId },
          orderBy: { createdAt: "desc" },
        });
      } catch {
        // token invalid
      }
    }

    if (!session) {
      return error("会话不存在", 401);
    }

    // Delete all sessions for this user (clean logout)
    await prisma.session.deleteMany({ where: { userId: session.userId } });

    await createAuditLog({
      userId: session.userId,
      action: "LOGOUT",
      resource: "session",
      detail: { sessionId: session.id },
      ip: getClientIp(request),
      traceId,
    });

    return success({ message: "已登出" });
  } catch (err) {
    console.error("Logout error:", err);
    return error("登出失败", 500);
  }
}
