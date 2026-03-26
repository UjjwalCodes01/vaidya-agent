/**
 * Authentication Endpoints
 * Production-ready OAuth login with Google and ABHA support
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { 
  withErrorHandler, 
  successResponse, 
  parseRequestBody,
  ValidationError,
  AuthenticationError,
} from '@/lib/api-middleware';
import { 
  generateTokenPair, 
  refreshAccessToken, 
  verifyToken,
  extractBearerToken,
} from '@/lib/auth/jwt';
import { logAuthentication } from '@/lib/security/audit-logger';
import type { UserClaims, UserRole } from '@/lib/auth/types';
import { 
  getEnabledProviders,
  getAuthorizationUrl,
  exchangeCodeForTokens,
  getOAuthUserInfo,
  validateOAuthState,
  isOAuthAvailable,
} from '@/lib/auth/oauth-manager';

// Demo login schema (when OAuth not available)
const demoLoginSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  abhaAddress: z.string().optional(),
});

// OAuth login schema  
const oauthLoginSchema = z.object({
  provider: z.enum(['google', 'abha']),
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
  redirectUri: z.string().url('Valid redirect URI is required'),
  codeVerifier: z.string().optional(), // Required for ABHA (PKCE)
});

// Refresh schema
const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * GET /api/auth/login
 * Get available auth providers and authorization URLs
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  const redirectUri = searchParams.get('redirectUri') || `${request.nextUrl.origin}/auth/callback`;
  
  const isOAuthEnabled = await isOAuthAvailable();
  const enabledProviders = await getEnabledProviders();
  
  if (!isOAuthEnabled && process.env.NODE_ENV === 'production' && process.env.DEMO_AUTH_ENABLED !== 'true') {
    throw new AuthenticationError('No authentication providers configured');
  }

  const authUrls: Record<string, { url: string; state: string; requiresPKCE?: boolean }> = {};

  // Generate auth URLs for enabled providers
  for (const provider of enabledProviders) {
    try {
      const result = await getAuthorizationUrl(provider.name, redirectUri);
      authUrls[provider.name] = {
        url: result.url,
        state: result.state,
        requiresPKCE: provider.name === 'abha',
      };
    } catch (error) {
      console.warn(`Failed to generate auth URL for ${provider.name}:`, error);
    }
  }

  return successResponse({
    providers: enabledProviders,
    authUrls,
    demoAuthEnabled: process.env.DEMO_AUTH_ENABLED === 'true',
    environment: process.env.NODE_ENV,
  });
});

/**
 * POST /api/auth/login  
 * Authenticate user via OAuth or demo mode
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody<unknown>(request);
  
  // Check if this is a refresh request
  if ('refreshToken' in (body as Record<string, unknown>)) {
    return handleRefresh(request, body);
  }
  
  // Check if OAuth is available
  const isOAuthEnabled = await isOAuthAvailable();
  
  // Try OAuth login first
  if ('provider' in (body as Record<string, unknown>)) {
    return handleOAuthLogin(request, body);
  }
  
  // Fall back to demo login if enabled
  if (process.env.DEMO_AUTH_ENABLED === 'true') {
    return handleDemoLogin(request, body);
  }
  
  // No auth method available
  if (!isOAuthEnabled) {
    throw new AuthenticationError('No authentication providers configured. Set up Google OAuth or ABHA OAuth.');
  }
  
  throw new ValidationError('Invalid login request. Use OAuth provider or enable demo mode.');
});

/**
 * Handle OAuth login
 */
async function handleOAuthLogin(request: NextRequest, body: unknown) {
  const parsed = oauthLoginSchema.safeParse(body);
  
  if (!parsed.success) {
    await logAuthentication(request, undefined, 'failure', 'Invalid OAuth request');
    throw new ValidationError('Invalid OAuth login request', parsed.error.issues);
  }

  const { provider, code, state, redirectUri, codeVerifier } = parsed.data;

  try {
    // Validate state parameter
    const stateData = validateOAuthState(state);
    if (!stateData || stateData.provider !== provider) {
      throw new AuthenticationError('Invalid state parameter');
    }

    // Exchange code for tokens
    const oauthTokens = await exchangeCodeForTokens(provider, code, redirectUri, state, codeVerifier);
    
    // Get user info
    const oauthUser = await getOAuthUserInfo(provider, oauthTokens.accessToken);
    
    // Map to internal user claims
    const roles: UserRole[] = ['user'];
    
    // Check for admin privileges (configure as needed)
    if (provider === 'google' && process.env.ADMIN_EMAILS?.split(',').includes(oauthUser.email)) {
      roles.push('admin');
    }
    
    const claims: UserClaims = {
      userId: `${provider}:${oauthUser.id}`,
      abhaAddress: oauthUser.abhaAddress,
      roles,
      email: oauthUser.email,
      name: oauthUser.name,
      picture: oauthUser.picture,
      provider,
    };

    // Generate JWT tokens
    const tokens = await generateTokenPair(claims);

    await logAuthentication(request, claims.userId, 'success', `OAuth ${provider} login`);

    return successResponse({
      user: claims,
      tokens,
      oauthTokens, // Include OAuth tokens for API calls
    });
  } catch (error: unknown) {
    await logAuthentication(request, undefined, 'failure', `OAuth ${provider} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new AuthenticationError(`OAuth authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Handle demo login (development/hackathon only)
 */
async function handleDemoLogin(request: NextRequest, body: unknown) {
  const parsed = demoLoginSchema.safeParse(body);
  
  if (!parsed.success) {
    await logAuthentication(request, undefined, 'failure', 'Invalid demo login');
    throw new ValidationError('Invalid demo login request', parsed.error.issues);
  }

  const { userId, abhaAddress } = parsed.data;

  // Enhanced security for demo login
  if (process.env.NODE_ENV === 'production') {
    // In production, only allow specific demo users if explicitly configured
    const allowedDemoUsers = process.env.DEMO_ALLOWED_USERS?.split(',').map(u => u.trim()) || [];
    
    if (allowedDemoUsers.length === 0) {
      await logAuthentication(request, userId, 'failure', 'Demo login blocked in production - no allowed users');
      throw new AuthenticationError('Demo authentication not permitted in production without explicit user allowlist');
    }
    
    if (!allowedDemoUsers.includes(userId)) {
      await logAuthentication(request, userId, 'failure', 'Demo login blocked - user not in allowlist');
      throw new AuthenticationError(`Demo user '${userId}' not in production allowlist`);
    }
    
    console.warn(`[Auth] Demo login used in production for user: ${userId}`);
  }

  // Validate userId format for basic safety
  if (!/^[a-zA-Z0-9_.-]+$/.test(userId)) {
    await logAuthentication(request, userId, 'failure', 'Invalid demo userId format');
    throw new ValidationError('Demo userId must contain only alphanumeric characters, dots, dashes, and underscores');
  }

  const claims: UserClaims = {
    userId,
    abhaAddress,
    roles: ['user'],
    provider: 'demo',
  };

  const tokens = await generateTokenPair(claims);

  await logAuthentication(request, userId, 'success', 'Demo login');

  return successResponse({
    user: claims,
    tokens,
  });
}

/**
 * Handle token refresh
 */
async function handleRefresh(request: NextRequest, body: unknown) {
  const parsed = refreshSchema.safeParse(body);
  
  if (!parsed.success) {
    throw new ValidationError('Invalid refresh request', parsed.error.issues);
  }

  const { refreshToken } = parsed.data;

  const newTokens = await refreshAccessToken(refreshToken);

  if (!newTokens) {
    await logAuthentication(request, undefined, 'failure', 'Invalid refresh token');
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  // Get user info from new tokens
  const verification = await verifyToken(newTokens.accessToken);
  
  return successResponse({
    user: verification.claims,
    tokens: newTokens,
  });
}

/**
 * DELETE /api/auth/login (logout)
 */
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  const token = extractBearerToken(authHeader);

  if (token) {
    const verification = await verifyToken(token);
    
    if (verification.valid && verification.claims) {
      await logAuthentication(request, verification.claims.userId, 'success', 'Logout');
    }
  }

  return successResponse({ message: 'Logged out successfully' });
});
