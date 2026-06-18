-- CreateEnum
CREATE TYPE "ApplicationUserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateTable
CREATE TABLE "application_managers" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_managers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_users" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ApplicationUserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "application_managers_appId_userId_key" ON "application_managers"("appId", "userId");

-- CreateIndex
CREATE INDEX "application_managers_userId_idx" ON "application_managers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "application_users_appId_userId_key" ON "application_users"("appId", "userId");

-- CreateIndex
CREATE INDEX "application_users_userId_idx" ON "application_users"("userId");

-- CreateIndex
CREATE INDEX "application_users_status_idx" ON "application_users"("status");

-- AddForeignKey
ALTER TABLE "application_managers" ADD CONSTRAINT "application_managers_appId_fkey" FOREIGN KEY ("appId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_managers" ADD CONSTRAINT "application_managers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_users" ADD CONSTRAINT "application_users_appId_fkey" FOREIGN KEY ("appId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_users" ADD CONSTRAINT "application_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
