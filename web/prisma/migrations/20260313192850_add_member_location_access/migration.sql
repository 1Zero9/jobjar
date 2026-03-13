-- AlterTable
ALTER TABLE "Location" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProjectCost" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProjectMaterial" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProjectMilestone" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "HouseholdMemberLocationAccess" (
    "householdId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseholdMemberLocationAccess_pkey" PRIMARY KEY ("householdId","userId","locationId")
);

-- CreateIndex
CREATE INDEX "HouseholdMemberLocationAccess_locationId_idx" ON "HouseholdMemberLocationAccess"("locationId");

-- AddForeignKey
ALTER TABLE "HouseholdMemberLocationAccess" ADD CONSTRAINT "HouseholdMemberLocationAccess_householdId_userId_fkey" FOREIGN KEY ("householdId", "userId") REFERENCES "HouseholdMember"("householdId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdMemberLocationAccess" ADD CONSTRAINT "HouseholdMemberLocationAccess_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
