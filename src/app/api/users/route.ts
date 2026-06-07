import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { success, error, getClientIp } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { isAdmin } from "@/lib/permissions";
import { getTraceId } from "@/lib/trace";

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return error("未登录", 401);
    }
    if (!isAdmin(currentUser)) return error("无权限", 403);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || undefined;

    const where = {
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search } },
            ],
          }
        : {}),
      ...(status ? { status: status as "ACTIVE" | "DISABLED" | "DELETED" } : {}),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
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
            include: { role: { select: { id: true, name: true } } },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return success({
      items: users.map((u: typeof users[number]) => ({
        ...u,
        roles: u.userRoles.map((ur: typeof u.userRoles[number]) => ur.role),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("List users error:", err);
    return error("获取用户列表失败", 500);
  }
}

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request);
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) return error("未登录", 401);
    if (!isAdmin(currentUser)) return error("无权限，仅管理员可创建用户", 403);

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return error(parsed.error.issues[0].message);
    }

    const { username, password, email, phone } = parsed.data;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existing) {
      if (existing.username === username) return error("用户名已存在");
      if (email && existing.email === email) return error("邮箱已被使用");
      if (phone && existing.phone === phone) return error("手机号已被使用");
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        email: email || null,
        phone: phone || null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    await createAuditLog({
      userId: currentUser.userId,
      action: "CREATE_USER",
      resource: "user",
      detail: { targetUserId: user.id, username: user.username },
      ip: getClientIp(request),
      traceId,
    });

    return success(user, 201);
  } catch (err) {
    console.error("Create user error:", err);
    return error("创建用户失败", 500);
  }
}
