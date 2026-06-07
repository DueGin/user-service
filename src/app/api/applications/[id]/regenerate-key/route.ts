import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { success, error, getClientIp } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { isAdmin } from "@/lib/permissions";
import { getTraceId } from "@/lib/trace";

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

    const existing = await prisma.application.findUnique({ where: { id } });
    if (!existing) return error("应用不存在", 404);

    const newApiKey = `ak_${uuidv4().replace(/-/g, "")}`;
    const newApiSecret = `sk_${uuidv4().replace(/-/g, "")}${uuidv4().replace(/-/g, "")}`;

    const app = await prisma.application.update({
      where: { id },
      data: { apiKey: newApiKey, apiSecret: newApiSecret },
    });

    await createAuditLog({
      userId: currentUser.userId,
      action: "REGENERATE_API_KEY",
      resource: "application",
      detail: { appId: id, name: existing.name },
      ip: getClientIp(request),
      traceId,
    });

    return success({ apiKey: app.apiKey, apiSecret: app.apiSecret });
  } catch (err) {
    console.error("Regenerate key error:", err);
    return error("重新生成密钥失败", 500);
  }
}
