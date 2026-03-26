/**
 * Next.js Global Middleware
 * Enforces authentication, rate limiting, and security headers across all API routes
 * 
 * Phase 4: Full security enforcement
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateAuth } from './lib/auth/middleware';
import { 
  checkRateLimitEnhanced, 
  getRateLimitHeaders,
  getClientIP,
} from './lib/security/rate-limiter-redis';
import type { AuthContext } from './lib/auth/types';

/**
 * Security headers to add to all responses (OWASP recommended)
 */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
  'X-DNS-Prefetch-Control': 'off',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

/**
 * Extract request ID for tracing
 */
function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || 
         `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get CORS headers based on origin
 */
function getCORSHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || ['*'];
  const isAllowed = allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin));
  
  return {
    'Access-Control-Allow-Origin': isAllowed && origin ? origin : (allowedOrigins[0] || '*'),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID, X-Admin-Key',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Expose-Headers': 'X-Request-ID, X-RateLimit-Remaining, X-RateLimit-Reset',
  };
}

/**
 * Middleware function
 * Applies: CORS, Security Headers, Rate Limiting, Authentication
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const requestId = getRequestId(request);
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  // Skip middleware for non-API routes (handled by Next.js)
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Handle OPTIONS (CORS preflight) - no auth needed
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        ...SECURITY_HEADERS,
      },
    });
  }

  // 1. Validate authentication
  const authResult = await validateAuth(request);
  
  if (!authResult.success) {
    // Authentication failed - return the error response with headers
    const errorResponse = authResult.response;
    Object.entries({ ...corsHeaders, ...SECURITY_HEADERS }).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    errorResponse.headers.set('X-Request-ID', requestId);
    return errorResponse;
  }

  const authContext: AuthContext = authResult.context;

  // 2. Check rate limit (with auth context for tiered limits)
  const rateLimitResult = await checkRateLimitEnhanced(request, authContext);
  
  if (!rateLimitResult.allowed) {
    const ip = getClientIP(request);
    console.warn(`[RateLimit] Exceeded for ${authContext.user?.userId || ip} on ${pathname}`);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfterSeconds} seconds.`,
        },
        requestId,
        timestamp: new Date().toISOString(),
      },
      {
        status: 429,
        headers: {
          ...corsHeaders,
          ...SECURITY_HEADERS,
          ...getRateLimitHeaders(rateLimitResult),
          'X-Request-ID': requestId,
        },
      }
    );
  }

  // 3. Create response and add all headers
  const response = NextResponse.next();
  
  // Add security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add rate limit headers
  Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add request tracking
  response.headers.set('X-Request-ID', requestId);
  response.headers.set('X-Request-Start', Date.now().toString());

  // Add auth context indicator (for debugging - no sensitive data)
  if (authContext.isAuthenticated) {
    response.headers.set('X-Auth-Status', 'authenticated');
  }

  return response;
}

/**
 * Configure which paths the middleware runs on
 */
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
  ],
};
