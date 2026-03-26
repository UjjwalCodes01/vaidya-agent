/**
 * Authentication Middleware
 * Provides JWT-based authentication for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractBearerToken } from './jwt';
import { 
  type AuthContext, 
  type UserClaims,
  PROTECTED_ROUTES, 
  PUBLIC_ROUTES, 
  ADMIN_ROUTES 
} from './types';
import { AuthenticationError, AuthorizationError, errorResponse } from '../api-middleware';

/**
 * Check if a path matches a route pattern
 */
function matchesRoute(path: string, routes: readonly string[]): boolean {
  return routes.some(route => {
    if (route.endsWith('/')) {
      return path.startsWith(route);
    }
    return path === route || path.startsWith(route + '/');
  });
}

/**
 * Determine if a route requires authentication
 */
export function isProtectedRoute(path: string): boolean {
  // Public routes never require auth
  if (matchesRoute(path, PUBLIC_ROUTES)) {
    return false;
  }
  
  // Protected routes always require auth
  if (matchesRoute(path, PROTECTED_ROUTES)) {
    return true;
  }
  
  // Default to protected for unknown routes
  return true;
}

/**
 * Check if a route requires admin access
 */
export function isAdminRoute(path: string, method: string): boolean {
  // RAG guidelines POST requires admin
  if (path === '/api/rag/guidelines' && method === 'POST') {
    return true;
  }
  
  return matchesRoute(path, ADMIN_ROUTES);
}

/**
 * Extract authentication context from request
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  const authHeader = request.headers.get('authorization');
  const token = extractBearerToken(authHeader);

  if (!token) {
    return { isAuthenticated: false };
  }

  const result = await verifyToken(token);
  
  if (!result.valid || !result.claims) {
    return { isAuthenticated: false };
  }

  return {
    isAuthenticated: true,
    user: result.claims,
    token,
    expiresAt: result.payload?.exp,
  };
}

/**
 * Validate authentication and authorization for a request
 */
export async function validateAuth(
  request: NextRequest
): Promise<{ success: true; context: AuthContext } | { success: false; response: NextResponse }> {
  const path = request.nextUrl.pathname;
  const method = request.method;

  // Check if route needs protection
  if (!isProtectedRoute(path)) {
    return { success: true, context: { isAuthenticated: false } };
  }

  // Get auth context
  const authContext = await getAuthContext(request);

  // Check authentication
  if (!authContext.isAuthenticated) {
    return {
      success: false,
      response: errorResponse(new AuthenticationError('Authentication required')),
    };
  }

  // Check admin authorization for admin routes
  if (isAdminRoute(path, method)) {
    if (!authContext.user?.roles.includes('admin')) {
      return {
        success: false,
        response: errorResponse(new AuthorizationError('Admin access required')),
      };
    }
  }

  return { success: true, context: authContext };
}

/**
 * Route handler type with auth context
 */
type RouteHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

type AuthenticatedRouteHandler = (
  request: NextRequest,
  auth: AuthContext,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Middleware wrapper that adds authentication
 */
export function withAuth(handler: AuthenticatedRouteHandler): RouteHandler {
  return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const authResult = await validateAuth(request);
    
    if (!authResult.success) {
      return authResult.response;
    }

    return handler(request, authResult.context, context);
  };
}

/**
 * Middleware wrapper that requires authentication
 */
export function requireAuth(handler: AuthenticatedRouteHandler): RouteHandler {
  return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const authContext = await getAuthContext(request);
    
    if (!authContext.isAuthenticated || !authContext.user) {
      return errorResponse(new AuthenticationError('Authentication required'));
    }

    return handler(request, authContext, context);
  };
}

/**
 * Middleware wrapper that requires specific role
 */
export function requireRole(
  role: UserClaims['roles'][number],
  handler: AuthenticatedRouteHandler
): RouteHandler {
  return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const authContext = await getAuthContext(request);
    
    if (!authContext.isAuthenticated || !authContext.user) {
      return errorResponse(new AuthenticationError('Authentication required'));
    }

    if (!authContext.user.roles.includes(role)) {
      return errorResponse(new AuthorizationError(`Role '${role}' required`));
    }

    return handler(request, authContext, context);
  };
}

/**
 * Get user claims from request (returns null if not authenticated)
 */
export async function getUserFromRequest(request: NextRequest): Promise<UserClaims | null> {
  const authContext = await getAuthContext(request);
  return authContext.user || null;
}

/**
 * Verify session ownership
 * Ensures the authenticated user owns the requested session
 */
export function verifySessionOwnership(
  authContext: AuthContext,
  sessionId: string
): boolean {
  if (!authContext.isAuthenticated || !authContext.user) {
    return false;
  }

  // Allow if session ID matches user's active session
  if (authContext.user.sessionId === sessionId) {
    return true;
  }

  // Admins can access any session
  if (authContext.user.roles.includes('admin')) {
    return true;
  }

  return false;
}
