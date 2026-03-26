/**
 * API Middleware and Utilities
 * Provides error handling, logging, and response formatting for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getErrorMessage } from './utils';
import { getEnv } from './env';

// ====================================
// Error Classes
// ====================================

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends APIError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends APIError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

// ====================================
// Response Formatters
// ====================================

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export function successResponse<T>(data: T, status: number = 200): NextResponse<APIResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function errorResponse(
  error: Error | APIError,
  status?: number
): NextResponse<APIResponse> {
  const statusCode = status || (error instanceof APIError ? error.statusCode : 500);
  const code = error instanceof APIError ? error.code : 'INTERNAL_ERROR';
  const details = error instanceof APIError ? error.details : undefined;

  // Log error for monitoring
  console.error('[API Error]', {
    code,
    message: error.message,
    statusCode,
    details,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });

  return NextResponse.json(
    {
      success: false,
      error: {
        code: code || 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

// ====================================
// Error Handler Wrapper
// ====================================

type RouteHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    try {
      return await handler(request, context);
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        return errorResponse(
          new ValidationError('Validation failed', error.issues),
          400
        );
      }

      // Handle known API errors
      if (error instanceof APIError) {
        return errorResponse(error);
      }

      // Handle unknown errors
      return errorResponse(
        new APIError(getErrorMessage(error), 500, 'INTERNAL_ERROR')
      );
    }
  };
}

// ====================================
// Request Utilities
// ====================================

export async function parseRequestBody<T>(request: NextRequest): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError('Invalid JSON in request body');
  }
}

export function getQueryParam(request: NextRequest, param: string): string | null {
  return request.nextUrl.searchParams.get(param);
}

export function getRequiredQueryParam(request: NextRequest, param: string): string {
  const value = getQueryParam(request, param);
  if (!value) {
    throw new ValidationError(`Missing required query parameter: ${param}`);
  }
  return value;
}

// ====================================
// CORS Headers
// ====================================

export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getEnv().ALLOWED_ORIGINS || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCORS(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }
  return null;
}

// ====================================
// Rate Limiting (Simple in-memory)
// ====================================

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): void {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetAt) {
    requestCounts.set(identifier, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (record.count >= maxRequests) {
    throw new RateLimitError(
      `Rate limit exceeded. Try again in ${Math.ceil((record.resetAt - now) / 1000)} seconds`
    );
  }

  record.count++;
}

// Cleanup old entries periodically
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of requestCounts.entries()) {
      if (now > record.resetAt) {
        requestCounts.delete(key);
      }
    }
  }, 60000); // Cleanup every minute
}
