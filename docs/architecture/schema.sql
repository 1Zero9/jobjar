-- Reference snapshot of the current product model.
-- Prisma remains the source of truth: web/prisma/schema.prisma

CREATE TYPE "MemberRole" AS ENUM ('admin', 'member', 'viewer');
CREATE TYPE "RecurrenceType" AS ENUM ('daily', 'weekly', 'monthly', 'custom');
CREATE TYPE "OccurrenceStatus" AS ENUM ('pending', 'done', 'skipped', 'overdue');
CREATE TYPE "LogAction" AS ENUM (
  'started',
  'completed',
  'skipped',
  'reopened',
  'task_created',
  'task_updated',
  'task_deleted',
  'assignee_changed'
);
CREATE TYPE "ShareScope" AS ENUM ('public_dashboard', 'room_view');
CREATE TYPE "JobKind" AS ENUM ('upkeep', 'issue', 'project', 'clear_out', 'outdoor', 'planning');
CREATE TYPE "CaptureStage" AS ENUM ('captured', 'shaped', 'active', 'done');

CREATE TABLE "User" (
  "id" UUID PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "displayName" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AuthCredential" (
  "userId" UUID PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
  "passwordHash" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Household" (
  "id" UUID PRIMARY KEY,
  "name" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Europe/Dublin',
  "ownerUserId" UUID NOT NULL REFERENCES "User"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "HouseholdMember" (
  "householdId" UUID NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "role" "MemberRole" NOT NULL,
  "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("householdId", "userId")
);

CREATE TABLE "Location" (
  "id" UUID PRIMARY KEY,
  "householdId" UUID NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Room" (
  "id" UUID PRIMARY KEY,
  "householdId" UUID NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "locationId" UUID REFERENCES "Location"("id") ON DELETE SET NULL,
  "name" TEXT NOT NULL,
  "designation" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Task" (
  "id" UUID PRIMARY KEY,
  "roomId" UUID NOT NULL REFERENCES "Room"("id") ON DELETE CASCADE,
  "createdByUserId" UUID REFERENCES "User"("id") ON DELETE SET NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "detailNotes" TEXT,
  "locationDetails" TEXT,
  "jobKind" "JobKind" NOT NULL DEFAULT 'upkeep',
  "captureStage" "CaptureStage" NOT NULL DEFAULT 'captured',
  "projectParentId" UUID REFERENCES "Task"("id") ON DELETE SET NULL,
  "priority" INTEGER NOT NULL DEFAULT 3,
  "estimatedMinutes" INTEGER NOT NULL DEFAULT 15,
  "projectTargetAt" TIMESTAMPTZ,
  "projectBudgetCents" INTEGER,
  "graceHours" INTEGER NOT NULL DEFAULT 12,
  "validationMode" TEXT NOT NULL DEFAULT 'basic',
  "minimumMinutes" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "isPrivate" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "TaskSchedule" (
  "id" UUID PRIMARY KEY,
  "taskId" UUID NOT NULL UNIQUE REFERENCES "Task"("id") ON DELETE CASCADE,
  "recurrenceType" "RecurrenceType" NOT NULL,
  "intervalCount" INTEGER NOT NULL DEFAULT 1,
  "daysOfWeek" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "dayOfMonth" INTEGER,
  "timeOfDay" TEXT,
  "nextDueAt" TIMESTAMPTZ
);

CREATE TABLE "TaskOccurrence" (
  "id" UUID PRIMARY KEY,
  "taskId" UUID NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
  "dueAt" TIMESTAMPTZ NOT NULL,
  "status" "OccurrenceStatus" NOT NULL DEFAULT 'pending',
  "completedAt" TIMESTAMPTZ,
  "completedBy" UUID REFERENCES "User"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "TaskLog" (
  "id" UUID PRIMARY KEY,
  "taskId" UUID NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
  "occurrenceId" UUID REFERENCES "TaskOccurrence"("id") ON DELETE SET NULL,
  "actorUserId" UUID,
  "action" "LogAction" NOT NULL,
  "atTime" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "durationSeconds" INTEGER,
  "note" TEXT
);

CREATE TABLE "TaskAssignment" (
  "id" UUID PRIMARY KEY,
  "taskId" UUID NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "assignedFrom" TIMESTAMPTZ NOT NULL,
  "assignedTo" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ProjectCost" (
  "id" UUID PRIMARY KEY,
  "taskId" UUID NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "notedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ProjectMaterial" (
  "id" UUID PRIMARY KEY,
  "taskId" UUID NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "quantityLabel" TEXT,
  "source" TEXT,
  "estimatedCostCents" INTEGER,
  "actualCostCents" INTEGER,
  "purchasedAt" TIMESTAMPTZ,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ProjectMilestone" (
  "id" UUID PRIMARY KEY,
  "taskId" UUID NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "targetAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ShareLink" (
  "id" UUID PRIMARY KEY,
  "householdId" UUID NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "slug" TEXT NOT NULL UNIQUE,
  "scope" "ShareScope" NOT NULL,
  "expiresAt" TIMESTAMPTZ,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
