-- CreateTable
CREATE TABLE "Location" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "householdId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Location_householdId_idx" ON "Location"("householdId");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddColumn locationId to Room
ALTER TABLE "Room" ADD COLUMN "locationId" UUID;

-- Seed: create a default "Home" location for each existing household
INSERT INTO "Location" ("id", "householdId", "name", "sortOrder")
SELECT gen_random_uuid(), id, 'Home', 1 FROM "Household";

-- Assign all existing rooms to their household's default location
UPDATE "Room" r
SET "locationId" = l.id
FROM "Location" l
WHERE r."householdId" = l."householdId";

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Room_locationId_idx" ON "Room"("locationId");
