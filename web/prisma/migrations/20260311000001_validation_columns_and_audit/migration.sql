-- Add proper columns to Task to replace magic-string encoding in description
ALTER TABLE "Task" ADD COLUMN "validationMode" TEXT NOT NULL DEFAULT 'basic';
ALTER TABLE "Task" ADD COLUMN "minimumMinutes" INTEGER NOT NULL DEFAULT 0;

-- Backfill validationMode from existing description values
UPDATE "Task" SET "validationMode" = 'strict' WHERE description LIKE '%validation=strict%';

-- Backfill minimumMinutes from existing description values (e.g. "validation=basic;min=30")
UPDATE "Task"
SET "minimumMinutes" = CAST((regexp_match(description, 'min=(\d+)'))[1] AS INTEGER)
WHERE description IS NOT NULL AND description ~ 'min=[0-9]+';

-- Add actorUserId to TaskLog for audit attribution
ALTER TABLE "TaskLog" ADD COLUMN "actorUserId" UUID;

-- Extend LogAction enum with admin audit values
ALTER TYPE "LogAction" ADD VALUE 'task_created';
ALTER TYPE "LogAction" ADD VALUE 'task_updated';
ALTER TYPE "LogAction" ADD VALUE 'task_deleted';
ALTER TYPE "LogAction" ADD VALUE 'assignee_changed';
