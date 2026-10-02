import type { NextFunction, Request, Response } from 'express'
import { HttpError } from './error.js'

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function keyFor(req: Request, scope: string): string {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
  return `${scope}:${ip}`
}

function take(scope: string, key: string, max: number, windowMs: number): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSec: 0 }
  }
  bucket.count += 1
  if (bucket.count > max) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }
  return { allowed: true, retryAfterSec: 0 }
}

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

let lastSweep = 0

function maybeSweep(now: number): void {
  if (now - lastSweep > 60000) {
    lastSweep = now
    sweep(now)
  }
}

export function rateLimit(scope: string, maxName: string, windowName: string, fallbackMax: number, fallbackWindowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'test' || process.env.RATE_LIMIT_DISABLED === 'true') {
      next()
      return
    }
    const max = envInt(maxName, fallbackMax)
    const windowMs = envInt(windowName, fallbackWindowMs)
    maybeSweep(Date.now())
    const result = take(scope, keyFor(req, scope), max, windowMs)
    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfterSec))
      next(new HttpError(429, 'Too many requests, please try again later', 'rate_limited'))
      return
    }
    next()
  }
}

export function resetRateLimitBuckets(): void {
  buckets.clear()
}
