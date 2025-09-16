export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export class InMemoryRateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.startCleanupTimer();
  }

  check(identifier: string): RateLimitResult {
    const now = Date.now();

    let entry = this.requests.get(identifier);

    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs
      };
    }

    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }

    entry.count++;
    this.requests.set(identifier, entry);

    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  private startCleanupTimer() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.requests.entries()) {
        if (entry.resetTime <= now) {
          this.requests.delete(key);
        }
      }
    }, this.config.windowMs);
  }
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('remote-addr');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return realIp || remoteAddr || 'unknown';
}