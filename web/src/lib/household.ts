import { prisma } from "@/lib/prisma";

const DEFAULT_OWNER_EMAIL = "owner@jobjar.app";
const DEFAULT_OWNER_NAME = "House Admin";
const DEFAULT_HOUSEHOLD_NAME = "Demo Household";

export async function getOrCreateHouseholdForUser(userId: string) {
  const existingMembership = await prisma.householdMember.findFirst({
    where: { userId },
    orderBy: { joinedAt: "asc" },
    select: { householdId: true },
  });
  if (existingMembership) {
    return existingMembership.householdId;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true },
  });
  if (!user) {
    throw new Error("User not found for household bootstrap");
  }

  const household = await prisma.household.create({
    data: {
      name: user.displayName ? `${user.displayName}'s Household` : DEFAULT_HOUSEHOLD_NAME,
      ownerUserId: userId,
      timezone: "Europe/Dublin",
      members: {
        create: {
          userId,
          role: "admin",
        },
      },
    },
    select: { id: true },
  });

  return household.id;
}

export async function getOrCreateDefaultHouseholdId() {
  const owner = await prisma.user.upsert({
    where: { email: DEFAULT_OWNER_EMAIL },
    update: {},
    create: {
      email: DEFAULT_OWNER_EMAIL,
      displayName: DEFAULT_OWNER_NAME,
    },
  });

  return getOrCreateHouseholdForUser(owner.id);
}
