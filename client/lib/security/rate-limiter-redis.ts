/**
 * Redis-backed Rate Limiting
 * Distributed rate limiting with fallback to in-memory
 */

import Redis from 'ioredis';
import type { NextRequest } from 'next/server';
import { RateLimitError } from '../api-middleware';
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

// Redis client (lazy initialization)
let redisClient: Redis | null = null;
let redisInitialized = false;
let useRedis = false;

/**
 * Initialize Redis client
 */
function getRedisClient(): Redis | null {
  if (redisInitialized) {
    return redisClient;
  }

  redisInitialized = true;

  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  
  if (!redisUrl) {
    console.log('[RateLimit] Redis not configured, using in-memory fallback');
    useRedis = false;
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redisClient.on('error', (err) => {
      console.error('[RateLimit] Redis error:', err.message);
      useRedis = false;
    });

    redisClient.on('ready', () => {
      console.log('[RateLimit] Redis connected successfully');
      useRedis = true;
    });

    // Connect in background
    redisClient.connect().catch((err) => {
      console.error('[RateLimit] Redis connection failed:', err.message);
      useRedis = false;
    });

    return redisClient;
  } catch (error) {
    console.error('[RateLimit] Failed to initialize Redis:', error);
    useRedis = false;
    return null;
  }
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
  },
};

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
 * Get rate limit tier
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
 * Check rate limit using Redis
 */
async function checkRedisRateLimit(
  identifier: string,
  tier: RateLimitTier
): Promise<RateLimitResult> {
  const client = getRedisClient();
  
  if (!client || !useRedis) {
    throw new Error('Redis not available');
  }

  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - tier.windowMs;

  try {
    // Use Redis sorted set to store timestamps
    const multi = client.multi();
    
    // Remove old entries outside window
    multi.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests in window
    multi.zcard(key);
    
    // Add current request
    multi.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiry on key
    multi.expire(key, Math.ceil(tier.windowMs / 1000));

    const results = await multi.exec();
    
    if (!results) {
      throw new Error('Redis transaction failed');
    }

    const count = (results[1][1] as number) || 0;
    const allowed = count < tier.maxRequests;
    const remaining = Math.max(0, tier.maxRequests - count - 1);
    const resetAt = now + tier.windowMs;

    return {
      allowed,
      remaining,
      resetAt,
      retryAfterSeconds: allowed ? undefined : Math.ceil(tier.windowMs / 1000),
    };
  } catch (error) {
    console.error('[RateLimit] Redis check failed:', error);
    throw error;
  }
}

/**
 * In-memory fallback rate limiting
 */
const memoryStore = new Map<string, { count: number; resetAt: number }>();

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
 * Check rate limit (Redis with in-memory fallback)
 */
export async function checkRateLimitEnhanced(
  request: NextRequest,
  auth?: AuthContext
): Promise<RateLimitResult> {
  const path = request.nextUrl.pathname;
  const tier = getTier(path, auth);
  const ip = getClientIP(request);

  // Build identifier (prefer user ID, fallback to IP)
  const identifier = auth?.user?.userId || `ip:${ip}`;

  try {
    // Try Redis first if available
    if (useRedis) {
      return await checkRedisRateLimit(identifier, tier);
    }
  } catch (error) {
    console.warn('[RateLimit] Redis failed, falling back to in-memory:', error);
    useRedis = false;
  }

  // Fallback to in-memory
  return checkMemoryRateLimit(identifier, tier);
}

/**
 * Enforce rate limit (throws if exceeded)
 */
export function enforceRateLimit(
  request: NextRequest,
  auth?: AuthContext
): Promise<RateLimitResult> {
  return checkRateLimitEnhanced(request, auth).then((result) => {
    if (!result.allowed) {
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${result.retryAfterSeconds} seconds.`
      );
    }
    return result;
  });
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
    ...(result.retryAfterSeconds && {
      'Retry-After': result.retryAfterSeconds.toString(),
    }),
  };
}

/**
 * Reset rate limits (for testing)
 */
export async function resetRateLimits(): Promise<void> {
  memoryStore.clear();
  
  if (useRedis && redisClient) {
    try {
      const keys = await redisClient.keys('ratelimit:*');
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      console.error('[RateLimit] Failed to reset Redis limits:', error);
    }
  }
}

// Cleanup expired memory records periodically
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (now > record.resetAt) {
        memoryStore.delete(key);
      }
    }
  }, 60 * 1000);
}
