import type { MiddlewareHandler } from 'hono';
import type { Context } from 'hono';

type RateLimitOptions = {
  windowMs: number;
  max: number;
};

type Bucket = {
  resetAt: number;
  count: number;
};

function getClientKey(c: Context): string {
  const xf = c.req.header('x-forwarded-for');
  const ip = xf ? xf.split(',')[0].trim() : c.req.header('x-real-ip') || c.req.header('cf-connecting-ip') || 'unknown';
  return ip;
}

export function rateLimit(options?: Partial<RateLimitOptions>): MiddlewareHandler {
  const windowMs = options?.windowMs ?? Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
  const max = options?.max ?? Number(process.env.RATE_LIMIT_MAX || 300);

  const buckets = new Map<string, Bucket>();

  return async (c, next) => {
    const now = Date.now();
    const key = `${getClientKey(c)}:${c.req.method}:${new URL(c.req.url).pathname}`;

    const bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      buckets.set(key, { resetAt: now + windowMs, count: 1 });
    } else {
      bucket.count += 1;
    }

    const current = buckets.get(key)!;
    const remaining = Math.max(0, max - current.count);

    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(Math.ceil(current.resetAt / 1000)));

    if (current.count > max) {
      return c.json({ success: false, error: 'Rate limit exceeded' }, 429);
    }

    // Opportunistic cleanup (keep map bounded)
    if (buckets.size > 5000 && Math.random() < 0.01) {
      for (const [k, b] of buckets) {
        if (now >= b.resetAt) buckets.delete(k);
      }
    }

    await next();
  };
}
