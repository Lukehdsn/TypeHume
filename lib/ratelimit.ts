import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiter for API endpoints
 * Limits requests per user to prevent abuse and excessive API costs
 */
let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

function initRatelimit() {
  if (ratelimit) return ratelimit;

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn("⚠️ Rate limiting disabled - Upstash Redis credentials not configured");
    return null;
  }

  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(
      10, // Allow 10 requests
      "1 m" // Per 1 minute
    ),
  });

  return ratelimit;
}

export async function checkRateLimit(userId: string): Promise<{ success: boolean; remaining: number; resetAfter: number }> {
  const limiter = initRatelimit();

  if (!limiter) {
    // Rate limiting disabled, allow all requests
    return { success: true, remaining: 10, resetAfter: 0 };
  }

  try {
    const identifier = `humanize:${userId}`;
    const result = await limiter.limit(identifier);

    return {
      success: result.success,
      remaining: Math.max(0, result.remaining),
      resetAfter: Math.ceil((result.reset - Date.now()) / 1000),
    };
  } catch (error) {
    console.error("Rate limiter error:", error);
    // On error, allow request but log for monitoring
    return { success: true, remaining: 10, resetAfter: 0 };
  }
}
