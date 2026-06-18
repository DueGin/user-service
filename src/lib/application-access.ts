import { prisma } from "@/lib/prisma";
import type { JwtPayload } from "@/lib/jwt";
import { isAdmin } from "@/lib/permissions";
import {
  resolveApplicationAccess,
  type ApplicationAccessMode,
  type ApplicationMembershipStatus,
} from "@/lib/application-access-policy";

export interface ManagedApplicationSummary {
  id: string;
  name: string;
  status: string;
}

export type ApplicationAccessResult =
  | { ok: true }
  | { ok: false; message: string; status: number; reason: string };

export async function getManagedApplications(
  userId: string
): Promise<ManagedApplicationSummary[]> {
  const managers = await prisma.applicationManager.findMany({
    where: {
      userId,
      user: { status: "ACTIVE" },
      application: { status: "ACTIVE" },
    },
    select: {
      application: {
        select: { id: true, name: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return managers.map((manager) => manager.application);
}

export async function getUserAdminContext(user: JwtPayload) {
  const managedApplications = await getManagedApplications(user.userId);
  return {
    isAdmin: isAdmin(user),
    managedApplications,
    canAccessAdmin: isAdmin(user) || managedApplications.length > 0,
  };
}

export async function canManageApplicationMembers(
  user: JwtPayload,
  appId: string
): Promise<boolean> {
  const manager = await prisma.applicationManager.findUnique({
    where: {
      appId_userId: {
        appId,
        userId: user.userId,
      },
    },
    include: {
      application: { select: { status: true } },
      user: { select: { status: true } },
    },
  });

  return manager?.application.status === "ACTIVE" && manager.user.status === "ACTIVE";
}

export async function ensureApplicationAccess(
  appId: string,
  userId: string
): Promise<ApplicationAccessResult> {
  const [application, user, existing, manager] = await Promise.all([
    prisma.application.findUnique({
      where: { id: appId },
      select: { id: true, status: true, accessMode: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    }),
    prisma.applicationUser.findUnique({
      where: {
        appId_userId: {
          appId,
          userId,
        },
      },
      select: { id: true, status: true },
    }),
    prisma.applicationManager.findUnique({
      where: {
        appId_userId: {
          appId,
          userId,
        },
      },
      select: { id: true },
    }),
  ]);

  if (!application || application.status !== "ACTIVE") {
    return {
      ok: false,
      message: "应用不存在或已被禁用",
      status: 400,
      reason: "APPLICATION_NOT_AVAILABLE",
    };
  }

  if (!user || user.status !== "ACTIVE") {
    return {
      ok: false,
      message: "账号不存在或已被禁用",
      status: 403,
      reason: "USER_NOT_AVAILABLE",
    };
  }

  const access = resolveApplicationAccess({
    accessMode: application.accessMode as ApplicationAccessMode,
    existingStatus: existing?.status as ApplicationMembershipStatus | undefined,
    isManager: Boolean(manager),
  });

  if (access.action === "deny") {
    return {
      ok: false,
      message: access.message,
      status: access.status,
      reason: access.reason,
    };
  }

  if (access.action === "touch" && existing) {
    await prisma.applicationUser.update({
      where: { id: existing.id },
      data: { lastLoginAt: new Date() },
    });
    return { ok: true };
  }

  if (access.action === "create") {
    await prisma.applicationUser.create({
      data: {
        appId,
        userId,
        lastLoginAt: new Date(),
      },
    });
  }

  return { ok: true };
}

export async function ensureActiveApplicationUser(
  appId: string,
  userId: string
): Promise<ApplicationAccessResult> {
  return ensureApplicationAccess(appId, userId);
}
