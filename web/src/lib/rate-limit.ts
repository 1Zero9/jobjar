// DB-backed rate limiter. Each attempt is recorded in the LoginAttempt table,
// so the limit is enforced globally across all server instances (serverless-safe).

import { prisma } from "@/lib/prisma";

/**
 * Returns true if the request is allowed, false if the limit has been exceeded.
 * @param key      Unique key to rate-limit on (e.g. IP address or user ID)
 * @param limit    Maximum number of attempts allowed in the window
 * @param windowMs Window duration in milliseconds
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMs);

  const count = await prisma.loginAttempt.count({
    where: {
      key,
      attemptedAt: { gte: windowStart },
    },
  });

  if (count >= limit) {
    return false;
  }

  await prisma.loginAttempt.create({ data: { key } });

  // Prune old records for this key to keep the table lean (best-effort, non-blocking)
  prisma.loginAttempt
    .deleteMany({ where: { key, attemptedAt: { lt: windowStart } } })
    .catch(() => {});

  return true;
}
