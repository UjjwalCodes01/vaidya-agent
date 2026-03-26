/**
 * OAuth Callback Endpoint
 * Handles OAuth provider callbacks and redirects
 */

import { NextRequest } from 'next/server';
import { redirect } from 'next/navigation';
import { withErrorHandler } from '@/lib/api-middleware';
import { 
  exchangeCodeForTokens,
  getOAuthUserInfo,
  validateOAuthState,
} from '@/lib/auth/oauth-manager';
import { generateTokenPair } from '@/lib/auth/jwt';
import { logAuthentication } from '@/lib/security/audit-logger';
import type { UserClaims, UserRole } from '@/lib/auth/types';

/**
 * GET /api/auth/callback
 * OAuth callback handler
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  
  // Handle OAuth errors
  if (error) {
    console.error('[OAuth] Provider error:', error, errorDescription);
    return redirect(`/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`);
  }
  
  // Validate required parameters
  if (!code || !state) {
    console.error('[OAuth] Missing code or state parameter');
    return redirect('/auth/error?error=invalid_request&description=Missing authorization code or state');
  }
  
  try {
    // Validate and decode state
    const stateData = validateOAuthState(state);
    if (!stateData) {
      throw new Error('Invalid or expired state parameter');
    }
    
    const { provider } = stateData;
    
    // Get stored redirect URI and code verifier from session/cache
    // In production, you'd store these securely (Redis, encrypted session)
    const redirectUri = `${request.nextUrl.origin}/api/auth/callback`;
    
    // For PKCE providers, you'd retrieve the code verifier here
    // This is a simplified example - in production, store these securely
    const codeVerifier = provider === 'abha' ? searchParams.get('code_verifier') : undefined;
    
    // Exchange authorization code for tokens
    const oauthTokens = await exchangeCodeForTokens(provider, code, redirectUri, state, codeVerifier || undefined);
    
    // Get user information
    const oauthUser = await getOAuthUserInfo(provider, oauthTokens.accessToken);
    
    // Map to internal user claims
    const roles: UserRole[] = ['user'];
    
    // Check for admin privileges
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
    
    // Generate internal JWT tokens
    const tokens = await generateTokenPair(claims);
    
    await logAuthentication(request, claims.userId, 'success', `OAuth ${provider} callback`);
    
    // In production, you'd typically:
    // 1. Set secure HTTP-only cookies with tokens
    // 2. Redirect to app with success indicator
    // 3. Store OAuth tokens securely for API access
    
    // For this example, redirect to a success page with tokens in URL (NOT recommended for production)
    const successUrl = new URL('/auth/success', request.nextUrl.origin);
    successUrl.searchParams.set('access_token', tokens.accessToken);
    successUrl.searchParams.set('refresh_token', tokens.refreshToken);
    successUrl.searchParams.set('user', JSON.stringify(claims));
    
    return redirect(successUrl.toString());
    
  } catch (error: unknown) {
    console.error('[OAuth] Callback error:', error);
    await logAuthentication(request, undefined, 'failure', `OAuth callback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    const errorUrl = new URL('/auth/error', request.nextUrl.origin);
    errorUrl.searchParams.set('error', 'callback_failed');
    errorUrl.searchParams.set('description', error instanceof Error ? error.message : 'Unknown error');
    
    return redirect(errorUrl.toString());
  }
});