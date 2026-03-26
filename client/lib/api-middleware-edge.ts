/**
 * Edge Runtime Compatible API Utilities
 * 
 * This module provides error classes and response formatters that work
 * in the Edge Runtime. For full API middleware with environment access,
 * use api-middleware.ts in API routes.
 */

import { NextResponse } from 'next/server';

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

  // Minimal logging in Edge Runtime
  console.error('[API Error]', code, error.message);

  return NextResponse.json(
    {
      success: false,
      error: {
        code: code || 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
        // Don't expose details in Edge Runtime responses for security
      },
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}
