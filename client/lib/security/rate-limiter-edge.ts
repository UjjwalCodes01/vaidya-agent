/**
 * Edge Runtime Compatible Rate Limiter
 * 
 * This is a simplified in-memory rate limiter for Edge Runtime middleware.
 * For distributed rate limiting, use the Redis-backed rate limiter in API routes.
 * 
 * NOTE: Edge Runtime middleware runs on different instances, so this is
 * best-effort rate limiting. For strict limits, implement in API routes
 * with Redis backing.
 */

import type { NextRequest } from 'next/server';
import type { AuthContext } from '../auth/types';

/**
 * Rate limit tier configuration
 */
interface RateLimitTier {
  maxRequests: number;
  windowMs: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
}

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  default: { maxRequests: 60, windowMs: 60 * 1000 },
  authenticated: { maxRequests: 120, windowMs: 60 * 1000 },
  admin: { maxRequests: 300, windowMs: 60 * 1000 },
  routes: {
    '/api/agent/chat': { maxRequests: 30, windowMs: 60 * 1000 },
    '/api/voice/triage': { maxRequests: 20, windowMs: 60 * 1000 },
    '/api/abdm/': { maxRequests: 30, windowMs: 60 * 1000 },
    '/api/uhi/': { maxRequests: 30, windowMs: 60 * 1000 },
    '/api/health': { maxRequests: 120, windowMs: 60 * 1000 },
    '/api/rag/search': { maxRequests: 60, windowMs: 60 * 1000 },
  } as Record<string, RateLimitTier>,
};

// In-memory store (per-instance, not distributed)
const memoryStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Get client IP from request
 */
export function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

/**
 * Get rate limit tier based on path and auth
 */
function getTier(path: string, auth?: AuthContext): RateLimitTier {
  for (const [pattern, tier] of Object.entries(RATE_LIMIT_CONFIG.routes)) {
    if (path.startsWith(pattern)) {
      return tier;
    }
  }

  if (auth?.isAuthenticated && auth.user) {
    if (auth.user.roles.includes('admin')) {
      return RATE_LIMIT_CONFIG.admin;
    }
    return RATE_LIMIT_CONFIG.authenticated;
  }

  return RATE_LIMIT_CONFIG.default;
}

/**
 * Clean up expired entries (called on each check)
 */
function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (now > record.resetAt) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Check rate limit using in-memory store
 */
function checkMemoryRateLimit(
  identifier: string,
  tier: RateLimitTier
): RateLimitResult {
  const now = Date.now();
  const record = memoryStore.get(identifier);

  if (!record || now > record.resetAt) {
    memoryStore.set(identifier, { count: 1, resetAt: now + tier.windowMs });
    return {
      allowed: true,
      remaining: tier.maxRequests - 1,
      resetAt: now + tier.windowMs,
    };
  }

  if (record.count >= tier.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
      retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: tier.maxRequests - record.count,
    resetAt: record.resetAt,
  };
}

/**
 * Check rate limit (Edge Runtime compatible)
 */
export async function checkRateLimitEnhanced(
  request: NextRequest,
  auth?: AuthContext
): Promise<RateLimitResult> {
  // Cleanup old entries periodically
  if (memoryStore.size > 1000) {
    cleanupExpired();
  }

  const path = request.nextUrl.pathname;
  const tier = getTier(path, auth);
  const ip = getClientIP(request);

  // Build identifier (prefer user ID, fallback to IP)
  const identifier = auth?.user?.userId || `ip:${ip}`;

  return checkMemoryRateLimit(identifier, tier);
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
  };
  
  if (result.retryAfterSeconds) {
    headers['Retry-After'] = result.retryAfterSeconds.toString();
  }
  
  return headers;
}
