// Simple in-memory rate limiter
// For production, use Redis or a proper rate limiting service

type RateLimitEntry = {
  count: number;
  resetTime: number;
};

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean every minute

export type RateLimitConfig = {
  maxRequests: number; // Maximum requests allowed
  windowMs: number; // Time window in milliseconds
};

export const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // API endpoints
  "api:chat": { maxRequests: 20, windowMs: 60000 }, // 20 requests per minute
  "api:chat:onboarding": { maxRequests: 30, windowMs: 60000 }, // 30 requests per minute
  "api:workout": { maxRequests: 30, windowMs: 60000 }, // 30 requests per minute
  "api:nutrition": { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute (AI generation)
  "api:progress": { maxRequests: 30, windowMs: 60000 }, // 30 requests per minute
  "api:account": { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute (sensitive)

  // Auth endpoints
  "auth:login": { maxRequests: 5, windowMs: 300000 }, // 5 attempts per 5 minutes
  "auth:signup": { maxRequests: 3, windowMs: 300000 }, // 3 signups per 5 minutes
  "auth:password": { maxRequests: 3, windowMs: 300000 }, // 3 password changes per 5 minutes

  // Default
  default: { maxRequests: 100, windowMs: 60000 }, // 100 requests per minute
};

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetIn: number; // Seconds until reset
};

export function checkRateLimit(
  identifier: string,
  configKey: string = "default"
): RateLimitResult {
  const config = rateLimitConfigs[configKey] || rateLimitConfigs["default"];
  const now = Date.now();
  const key = `${configKey}:${identifier}`;

  let entry = rateLimitMap.get(key);

  // If no entry or entry has expired, create new one
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitMap.set(key, entry);
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetIn: Math.ceil(config.windowMs / 1000),
    };
  }

  // Increment count
  entry.count++;

  // Check if over limit
  if (entry.count > config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetIn: Math.ceil((entry.resetTime - now) / 1000),
  };
}

// Helper to get client IP from request
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

// Rate limit response helper
export function rateLimitResponse(result: RateLimitResult) {
  return new Response(
    JSON.stringify({
      error: "Too Many Requests",
      message: `Rate limit exceeded. Try again in ${result.resetIn} seconds.`,
      retryAfter: result.resetIn,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": result.resetIn.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.resetIn.toString(),
      },
    }
  );
}
