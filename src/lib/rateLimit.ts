interface RateLimitBucket {
  requests: number[];
}

const memoryStore = new Map<string, RateLimitBucket>();

// Periodic memory cleanup to prevent leak
if (typeof globalThis !== 'undefined') {
  const interval = 10 * 60 * 1000; // 10 minutes
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of memoryStore.entries()) {
      bucket.requests = bucket.requests.filter(timestamp => now - timestamp < 60 * 60 * 1000);
      if (bucket.requests.length === 0) {
        memoryStore.delete(key);
      }
    }
  }, interval);
  
  if (timer.unref) {
    timer.unref();
  }
}

export function rateLimit(ip: string, limit: number, windowMs: number): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const bucketKey = `${ip}`;
  
  if (!memoryStore.has(bucketKey)) {
    memoryStore.set(bucketKey, { requests: [] });
  }
  
  const bucket = memoryStore.get(bucketKey)!;
  
  // Filter requests that are older than the window
  bucket.requests = bucket.requests.filter(timestamp => now - timestamp < windowMs);
  
  if (bucket.requests.length >= limit) {
    const oldestRequest = bucket.requests[0];
    const resetTime = oldestRequest + windowMs;
    return {
      success: false,
      remaining: 0,
      reset: resetTime
    };
  }
  
  bucket.requests.push(now);
  return {
    success: true,
    remaining: limit - bucket.requests.length,
    reset: now + windowMs
  };
}
