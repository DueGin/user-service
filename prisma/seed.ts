import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import {
  DEMO_APP_ID_FALLBACK,
  DEMO_APP_NAME,
  DEMO_APP_SECRET_FALLBACK,
} from "../src/lib/demo-app";

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  // Create admin role
  const adminRole = await prisma.role.upsert({
    where: { name: "超级管理员" },
    update: {},
    create: {
      name: "超级管理员",
      description: "拥有所有权限",
      permissions: [
        "user:read",
        "user:write",
        "role:manage",
        "app:manage",
        "audit:read",
      ],
    },
  });
  console.log("角色:", adminRole.name, adminRole.id);

  // Create admin user
  const passwordHash = await bcrypt.hash("admin123", 10);
  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@user-service.local",
      passwordHash,
    },
  });
  console.log("用户:", adminUser.username, adminUser.id);

  // Assign admin role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });
  console.log("已分配角色: admin -> 超级管理员");

  // Create demo third-party application
  const demoApp = await prisma.application.upsert({
    where: { id: DEMO_APP_ID_FALLBACK },
    update: {
      name: DEMO_APP_NAME,
      description: "用于演示第三方业务系统如何接入 User Service 默认登录页",
      apiKey: "ak_demo_business_app",
      apiSecret: DEMO_APP_SECRET_FALLBACK,
      callbackUrl: "http://localhost:3000/api/demo/auth/callback",
      allowedOrigins: ["http://localhost:3000"],
      status: "ACTIVE",
    },
    create: {
      id: DEMO_APP_ID_FALLBACK,
      name: DEMO_APP_NAME,
      description: "用于演示第三方业务系统如何接入 User Service 默认登录页",
      apiKey: "ak_demo_business_app",
      apiSecret: DEMO_APP_SECRET_FALLBACK,
      callbackUrl: "http://localhost:3000/api/demo/auth/callback",
      allowedOrigins: ["http://localhost:3000"],
      status: "ACTIVE",
    },
  });
  console.log("示例应用:", demoApp.name, demoApp.id);

  console.log("\n初始化完成！");
  console.log("管理员账号: admin");
  console.log("管理员密码: admin123");
  console.log("Demo 页面: http://localhost:3000/demo");
  console.log("Demo appId:", DEMO_APP_ID_FALLBACK);
  console.log("请登录后立即修改密码！");
}

main().catch(console.error);
