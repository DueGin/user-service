import { z } from "zod";

export const applicationAccessModes = ["OPEN", "MEMBERS_ONLY", "ADMINS_ONLY"] as const;

const adminUserIdsSchema = z
  .array(z.string().min(1))
  .min(1, "请选择至少一个应用管理员");

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "用户名至少3个字符")
    .max(32, "用户名最多32个字符")
    .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
  password: z.string().min(6, "密码至少6个字符").max(128),
  email: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  appId: z.string().optional(),
});

export const loginSchema = z.object({
  account: z.string().min(1, "请输入用户名/邮箱/手机号"),
  password: z.string().min(1, "请输入密码"),
  appId: z.string().optional(),
});

export const updateUserSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  avatar: z.string().url().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DISABLED", "DELETED"]).optional(),
  password: z.string().min(6, "密码至少6个字符").max(128).optional(),
});

export const createRoleSchema = z.object({
  name: z.string().min(1, "角色名不能为空").max(50),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export const createAppSchema = z.object({
  name: z.string().min(1, "应用名不能为空").max(100),
  description: z.string().optional(),
  callbackUrl: z.string().url("回调URL格式不正确").optional().or(z.literal("")),
  allowedOrigins: z.array(z.string()).default([]),
  accessMode: z.enum(applicationAccessModes).default("OPEN"),
  adminUserIds: adminUserIdsSchema,
});

export const updateAppSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  accessMode: z.enum(applicationAccessModes).optional(),
  callbackUrl: z.string().url().optional().or(z.literal("")),
  allowedOrigins: z.array(z.string()).optional(),
  adminUserIds: adminUserIdsSchema.optional(),
});

export const exchangeCodeSchema = z.object({
  code: z.string().min(1),
  appId: z.string().min(1),
  apiSecret: z.string().min(1),
});
