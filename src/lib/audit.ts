import { prisma } from "./prisma";
import type { Prisma } from "@/generated/prisma/client";

interface AuditLogInput {
  userId?: string;
  action: string;
  resource: string;
  detail?: Record<string, unknown>;
  ip?: string;
  traceId?: string;
}

export async function createAuditLog(input: AuditLogInput) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      resource: input.resource,
      detail: (input.detail as Prisma.InputJsonValue) ?? undefined,
      ip: input.ip,
      traceId: input.traceId,
    },
  });
}
