CREATE TYPE "MemberProfileTheme" AS ENUM ('default_theme', 'boy_blue', 'girl_pink');

ALTER TABLE "HouseholdMember"
ADD COLUMN "profileTheme" "MemberProfileTheme" NOT NULL DEFAULT 'default_theme';
