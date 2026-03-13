CREATE TYPE "MemberAudience" AS ENUM ('adult', 'teen_12_18', 'under_12');

ALTER TABLE "HouseholdMember"
ADD COLUMN "audienceBand" "MemberAudience" NOT NULL DEFAULT 'adult';
