import { prisma } from "@/lib/prisma";

export async function setUserPasswordHash(userId: string, passwordHash: string) {
  await prisma.authCredential.upsert({
    where: { userId },
    update: {
      passwordHash,
      updatedAt: new Date(),
    },
    create: {
      userId,
      passwordHash,
    },
  });
}

export async function getUserPasswordHash(userId: string) {
  const credential = await prisma.authCredential.findUnique({
    where: { userId },
    select: { passwordHash: true },
  });

  return credential?.passwordHash ?? null;
}
