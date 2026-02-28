/*
  Migration: add_user_auth_and_project_ownership
  ─────────────────────────────────────────────────────────────────────────────
  1. Creates the `User` table (id = Supabase auth.users UUID).
  2. Adds `userId` to `Tree` as nullable first, then purges orphan rows
     (trees with no owner cannot be linked to an auth identity), then
     enforces NOT NULL + FK constraint.
  3. Adds `Tree_userId_idx` index for query performance.
  ─────────────────────────────────────────────────────────────────────────────
  ⚠  WARNING: All existing `Tree` records without a valid userId will be
     DELETED by the DELETE below.  Back up production data before running.
*/

-- AlterTable: Person (add updatedAt if missing from prior migration)
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable: User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: User.email
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AlterTable: add userId as nullable first so existing rows don't fail
ALTER TABLE "Tree" ADD COLUMN "userId" TEXT;

-- Delete any orphan Tree rows that cannot be attributed to a user
-- (avoids NOT NULL constraint failure — in a fresh dev DB this is a no-op)
DELETE FROM "Tree" WHERE "userId" IS NULL;

-- Enforce NOT NULL now that no NULL rows remain
ALTER TABLE "Tree" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex: Tree.userId for join/filter performance
CREATE INDEX "Tree_userId_idx" ON "Tree"("userId");

-- AddForeignKey: Tree → User (cascade delete)
ALTER TABLE "Tree" ADD CONSTRAINT "Tree_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

