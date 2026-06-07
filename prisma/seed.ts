import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

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

  console.log("\n初始化完成！");
  console.log("管理员账号: admin");
  console.log("管理员密码: admin123");
  console.log("请登录后立即修改密码！");
}

main().catch(console.error);
