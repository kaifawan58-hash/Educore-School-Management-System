// Simple in-memory sliding-window rate limiter.
// Good enough for a single-instance deployment; swap for a Redis-backed
// limiter (e.g. Upstash) if you ever run multiple server instances.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterMs: number; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now, remaining: 0 };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0, remaining: limit - bucket.count };
}

// Periodic cleanup so the map doesn't grow forever on a long-running server.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000).unref?.();
