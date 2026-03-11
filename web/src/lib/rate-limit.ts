// In-memory rate limiter. State is per-server-instance — on serverless platforms
// (e.g. Vercel) each lambda has its own store, so this limits brute-force within
// a single instance rather than globally. It is still effective against naive
// automated attacks and adds no external dependencies.

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

// Clean up expired entries periodically to avoid unbounded memory growth
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  },
  5 * 60 * 1000,
);

/**
 * Returns true if the request is allowed, false if the limit has been exceeded.
 * @param key      Unique key to rate-limit on (e.g. IP address or user ID)
 * @param limit    Maximum number of requests in the window
 * @param windowMs Window duration in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}
