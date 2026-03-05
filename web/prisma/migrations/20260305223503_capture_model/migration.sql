-- CreateEnum
CREATE TYPE "JobKind" AS ENUM ('upkeep', 'issue', 'project', 'clear_out', 'outdoor', 'planning');

-- CreateEnum
CREATE TYPE "CaptureStage" AS ENUM ('captured', 'shaped', 'active', 'done');

-- AlterTable
ALTER TABLE "Task"
ADD COLUMN "detailNotes" TEXT,
ADD COLUMN "locationDetails" TEXT,
ADD COLUMN "jobKind" "JobKind" NOT NULL DEFAULT 'upkeep',
ADD COLUMN "captureStage" "CaptureStage" NOT NULL DEFAULT 'captured',
ADD COLUMN "projectParentId" UUID;

-- CreateIndex
CREATE INDEX "Task_projectParentId_idx" ON "Task"("projectParentId");

-- AddForeignKey
ALTER TABLE "Task"
ADD CONSTRAINT "Task_projectParentId_fkey"
FOREIGN KEY ("projectParentId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
