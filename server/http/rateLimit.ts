const buckets = new Map<string, number[]>()

export interface RateLimitResult {
  allowed: boolean
  retryAfterMs: number
}

export function recordFailure(key: string, now = Date.now(), windowMs = 15 * 60 * 1000, max = 5): RateLimitResult {
  const recent = (buckets.get(key) ?? []).filter((time) => now - time < windowMs)
  recent.push(now)
  buckets.set(key, recent)
  if (recent.length <= max) return { allowed: true, retryAfterMs: 0 }
  const oldest = recent[0] ?? now
  return { allowed: false, retryAfterMs: windowMs - (now - oldest) }
}

export function resetRateLimits(): void {
  buckets.clear()
}
