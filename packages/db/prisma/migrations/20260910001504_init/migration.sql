-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('kakao', 'apple', 'google');

-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('done', 'skipped', 'modified');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "providerUserIdHash" TEXT NOT NULL,
    "nickname" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "raceSlug" TEXT,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "status" "LogStatus" NOT NULL,
    "actualDistanceKm" DOUBLE PRECISION,
    "actualDurationSec" INTEGER,
    "note" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE INDEX "saved_plans_userId_createdAt_idx" ON "saved_plans"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "session_logs_userId_date_idx" ON "session_logs"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "session_logs_planId_date_key" ON "session_logs"("planId", "date");

-- AddForeignKey
ALTER TABLE "saved_plans" ADD CONSTRAINT "saved_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_planId_fkey" FOREIGN KEY ("planId") REFERENCES "saved_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
