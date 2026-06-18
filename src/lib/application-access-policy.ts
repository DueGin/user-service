import type { ManagedApplicationSummary } from "@/lib/application-access";

export interface AdminContextLike {
  isAdmin: boolean;
  managedApplications: ManagedApplicationSummary[];
}

export type ApplicationAccessMode = "OPEN" | "MEMBERS_ONLY" | "ADMINS_ONLY";
export type ApplicationMembershipStatus = "ACTIVE" | "DISABLED";

export type ApplicationAccessAction =
  | { action: "allow" }
  | { action: "create" }
  | { action: "touch" }
  | { action: "deny"; message: string; status: number; reason: string };

export function canManageApplicationMembersFromContext(
  context: AdminContextLike,
  appId: string
): boolean {
  return context.managedApplications.some(
    (application) => application.id === appId && application.status === "ACTIVE"
  );
}

export function resolveApplicationAccess({
  accessMode,
  existingStatus,
  isManager,
}: {
  accessMode: ApplicationAccessMode;
  existingStatus?: ApplicationMembershipStatus | null;
  isManager: boolean;
}): ApplicationAccessAction {
  if (existingStatus === "DISABLED") {
    return {
      action: "deny",
      message: "该应用已禁用此用户",
      status: 403,
      reason: "APPLICATION_USER_DISABLED",
    };
  }

  if (accessMode === "ADMINS_ONLY") {
    if (!isManager) {
      return {
        action: "deny",
        message: "该应用仅允许应用管理员登录",
        status: 403,
        reason: "APPLICATION_ADMINS_ONLY",
      };
    }

    return existingStatus === "ACTIVE" ? { action: "touch" } : { action: "allow" };
  }

  if (existingStatus === "ACTIVE") {
    return { action: "touch" };
  }

  if (accessMode === "MEMBERS_ONLY") {
    return {
      action: "deny",
      message: "该应用仅允许已授权用户登录",
      status: 403,
      reason: "APPLICATION_MEMBERS_ONLY",
    };
  }

  return { action: "create" };
}

export function resolveMembershipProvision(
  existingStatus?: ApplicationMembershipStatus | null
): ApplicationAccessAction {
  return resolveApplicationAccess({
    accessMode: "OPEN",
    existingStatus,
    isManager: false,
  });
}
