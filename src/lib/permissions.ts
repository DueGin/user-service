import { JwtPayload } from "./jwt";

const ADMIN_ROLES = ["超级管理员", "admin", "管理员"];

export function isAdmin(user: JwtPayload): boolean {
  return user.roles?.some((role: string) => ADMIN_ROLES.includes(role)) ?? false;
}

export function hasPermission(user: JwtPayload, permission: string): boolean {
  void permission;
  // For now, admins have all permissions
  if (isAdmin(user)) return true;
  // Future: check user.permissions array
  return false;
}
