import { timingSafeEqual } from "node:crypto";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

export function hasValidAccessKey(provided: string | null | undefined, expected: string | null | undefined) {
  const trimmedProvided = provided?.trim();
  const trimmedExpected = expected?.trim();

  if (!trimmedProvided || !trimmedExpected) return false;

  const providedBuffer = Buffer.from(trimmedProvided);
  const expectedBuffer = Buffer.from(trimmedExpected);

  if (providedBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function clientIdFromRequest(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const accessKey = request.headers.get("x-plot-goblin-key")?.trim();

  return `${forwardedFor || realIp || "unknown"}:${accessKey ? "keyed" : "anonymous"}`;
}

export function createMemoryRateLimiter(limit: number, windowMs: number) {
  const buckets = new Map<string, Bucket>();

  return function checkRateLimit(id: string, now = Date.now()): RateLimitResult {
    const safeLimit = Math.max(1, limit);
    const existing = buckets.get(id);

    if (!existing || existing.resetAt <= now) {
      buckets.set(id, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: safeLimit - 1, retryAfterSeconds: Math.ceil(windowMs / 1000) };
    }

    if (existing.count >= safeLimit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: Math.max(0, safeLimit - existing.count),
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  };
}
