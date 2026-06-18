CREATE TYPE "ApplicationAccessMode" AS ENUM ('OPEN', 'MEMBERS_ONLY', 'ADMINS_ONLY');

ALTER TABLE "applications"
ADD COLUMN "accessMode" "ApplicationAccessMode" NOT NULL DEFAULT 'OPEN';
