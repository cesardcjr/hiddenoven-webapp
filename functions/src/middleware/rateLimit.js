const buckets = new Map();

function clientKey(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  return forwarded || req.ip || req.socket?.remoteAddress || "unknown";
}

function createRateLimit({ windowMs, max, keyPrefix }) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${keyPrefix}:${clientKey(req)}`;
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;

    bucket.count += 1;
    buckets.set(key, bucket);

    if (buckets.size > 5000) {
      for (const [storedKey, stored] of buckets) {
        if (stored.resetAt <= now) buckets.delete(storedKey);
      }
    }

    res.set("RateLimit-Limit", String(max));
    res.set("RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    res.set("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.set("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({
        error: "Too many requests. Please wait a moment and try again.",
      });
    }

    return next();
  };
}

module.exports = { createRateLimit };
