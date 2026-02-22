import { prisma } from "@/lib/prisma";

const DEFAULT_OWNER_EMAIL = "owner@jobjar.app";
const DEFAULT_OWNER_NAME = "House Admin";
const DEFAULT_HOUSEHOLD_NAME = "Demo Household";

export async function getOrCreateDefaultHouseholdId() {
  const existing = await prisma.household.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const owner = await prisma.user.upsert({
    where: { email: DEFAULT_OWNER_EMAIL },
    update: {},
    create: {
      email: DEFAULT_OWNER_EMAIL,
      displayName: DEFAULT_OWNER_NAME,
    },
  });

  const household = await prisma.household.create({
    data: {
      name: DEFAULT_HOUSEHOLD_NAME,
      ownerUserId: owner.id,
      timezone: "Europe/Dublin",
      members: {
        create: {
          userId: owner.id,
          role: "admin",
        },
      },
    },
    select: { id: true },
  });

  return household.id;
}
