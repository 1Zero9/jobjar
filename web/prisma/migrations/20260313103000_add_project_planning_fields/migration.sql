-- AlterTable
ALTER TABLE "Task"
ADD COLUMN "projectBudgetCents" INTEGER,
ADD COLUMN "projectTargetAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProjectCost" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "taskId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "notedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectCost_taskId_idx" ON "ProjectCost"("taskId");

-- AddForeignKey
ALTER TABLE "ProjectCost" ADD CONSTRAINT "ProjectCost_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
