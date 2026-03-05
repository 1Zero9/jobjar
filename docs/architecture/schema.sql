-- Reference snapshot of the current Prisma schema in web/prisma/schema.prisma.
-- Prisma remains the source of truth for application schema changes.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "MemberRole" AS ENUM ('admin', 'member', 'viewer');
CREATE TYPE "RecurrenceType" AS ENUM ('daily', 'weekly', 'monthly', 'custom');
CREATE TYPE "OccurrenceStatus" AS ENUM ('pending', 'done', 'skipped', 'overdue');
CREATE TYPE "LogAction" AS ENUM ('started', 'completed', 'skipped', 'reopened');
CREATE TYPE "ShareScope" AS ENUM ('public_dashboard', 'room_view');

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "AuthCredential" (
  "userId" UUID NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthCredential_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "AuthCredential_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Household" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Europe/Dublin',
  "ownerUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Household_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Household_ownerUserId_fkey"
    FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "HouseholdMember" (
  "householdId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "role" "MemberRole" NOT NULL,
  "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("householdId", "userId"),
  CONSTRAINT "HouseholdMember_householdId_fkey"
    FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HouseholdMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Room" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "householdId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "designation" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Room_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Room_householdId_fkey"
    FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Room_householdId_idx" ON "Room"("householdId");

CREATE TABLE "Task" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "roomId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 3,
  "estimatedMinutes" INTEGER NOT NULL DEFAULT 15,
  "graceHours" INTEGER NOT NULL DEFAULT 12,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Task_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Task_roomId_idx" ON "Task"("roomId");

CREATE TABLE "TaskSchedule" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "taskId" UUID NOT NULL,
  "recurrenceType" "RecurrenceType" NOT NULL,
  "intervalCount" INTEGER NOT NULL DEFAULT 1,
  "daysOfWeek" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "dayOfMonth" INTEGER,
  "timeOfDay" TEXT,
  "nextDueAt" TIMESTAMPTZ,
  CONSTRAINT "TaskSchedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaskSchedule_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TaskSchedule_taskId_key" ON "TaskSchedule"("taskId");

CREATE TABLE "TaskOccurrence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "taskId" UUID NOT NULL,
  "dueAt" TIMESTAMPTZ NOT NULL,
  "status" "OccurrenceStatus" NOT NULL DEFAULT 'pending',
  "completedAt" TIMESTAMPTZ,
  "completedBy" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskOccurrence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaskOccurrence_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TaskOccurrence_completedBy_fkey"
    FOREIGN KEY ("completedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "TaskOccurrence_dueAt_idx" ON "TaskOccurrence"("dueAt");
CREATE INDEX "TaskOccurrence_taskId_idx" ON "TaskOccurrence"("taskId");

CREATE TABLE "TaskLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "taskId" UUID NOT NULL,
  "occurrenceId" UUID,
  "action" "LogAction" NOT NULL,
  "atTime" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "durationSeconds" INTEGER,
  "note" TEXT,
  CONSTRAINT "TaskLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaskLog_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TaskLog_occurrenceId_fkey"
    FOREIGN KEY ("occurrenceId") REFERENCES "TaskOccurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "TaskAssignment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "taskId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "assignedFrom" TIMESTAMPTZ NOT NULL,
  "assignedTo" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaskAssignment_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TaskAssignment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ShareLink" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "householdId" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "scope" "ShareScope" NOT NULL,
  "expiresAt" TIMESTAMPTZ,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShareLink_householdId_fkey"
    FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ShareLink_slug_key" ON "ShareLink"("slug");
