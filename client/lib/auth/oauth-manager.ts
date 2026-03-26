/**
 * OAuth Manager
 * Centralized OAuth provider management with production-ready implementations
 */

import type { OAuthProvider, OAuthConfig, OAuthUser, OAuthTokens, OAuthState } from './oauth-types';
import { GoogleOAuthProvider } from './providers/google-oauth';
import { ABHAOAuthProvider } from './providers/abha-oauth';
import { getSecret } from '../security/secrets-manager';

// OAuth provider instances (lazy initialized)
let googleProvider: GoogleOAuthProvider | null = null;
let abhaProvider: ABHAOAuthProvider | null = null;
let oauthConfig: OAuthConfig | null = null;

/**
 * Load OAuth configuration from environment/secrets
 */
async function loadOAuthConfig(): Promise<OAuthConfig> {
  if (oauthConfig) {
    return oauthConfig;
  }

  const [googleClientSecret, abhaClientSecret] = await Promise.all([
    getSecret('google-oauth-client-secret'),
    getSecret('abha-oauth-client-secret'),
  ]);

  oauthConfig = {
    google: {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
      clientSecret: googleClientSecret || process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
      enabled: Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && (googleClientSecret || process.env.GOOGLE_OAUTH_CLIENT_SECRET)),
    },
    abha: {
      clientId: process.env.ABHA_OAUTH_CLIENT_ID || '',
      clientSecret: abhaClientSecret || process.env.ABHA_OAUTH_CLIENT_SECRET || '',
      baseUrl: process.env.ABHA_OAUTH_BASE_URL || 'https://dev.abdm.gov.in',
      enabled: Boolean(process.env.ABHA_OAUTH_CLIENT_ID && (abhaClientSecret || process.env.ABHA_OAUTH_CLIENT_SECRET)),
    },
  };

  return oauthConfig;
}

/**
 * Get Google OAuth provider
 */
async function getGoogleProvider(): Promise<GoogleOAuthProvider | null> {
  if (googleProvider) {
    return googleProvider;
  }

  const config = await loadOAuthConfig();
  
  if (!config.google.enabled) {
    return null;
  }

  googleProvider = new GoogleOAuthProvider(
    config.google.clientId,
    config.google.clientSecret
  );

  return googleProvider;
}

/**
 * Get ABHA OAuth provider
 */
async function getABHAProvider(): Promise<ABHAOAuthProvider | null> {
  if (abhaProvider) {
    return abhaProvider;
  }

  const config = await loadOAuthConfig();
  
  if (!config.abha.enabled) {
    return null;
  }

  abhaProvider = new ABHAOAuthProvider(
    config.abha.clientId,
    config.abha.clientSecret,
    config.abha.baseUrl
  );

  return abhaProvider;
}

/**
 * Get OAuth provider by name
 */
export async function getOAuthProvider(provider: 'google' | 'abha'): Promise<OAuthProvider | null> {
  switch (provider) {
    case 'google':
      return getGoogleProvider();
    case 'abha':
      return getABHAProvider();
    default:
      return null;
  }
}

/**
 * Get list of enabled OAuth providers
 */
export async function getEnabledProviders(): Promise<Array<{ name: 'google' | 'abha'; displayName: string }>> {
  const config = await loadOAuthConfig();
  const providers = [];

  if (config.google.enabled) {
    providers.push({ name: 'google' as const, displayName: 'Google' });
  }

  if (config.abha.enabled) {
    providers.push({ name: 'abha' as const, displayName: 'ABHA (Ayushman Bharat)' });
  }

  return providers;
}

/**
 * Generate OAuth authorization URL
 */
export async function getAuthorizationUrl(
  provider: 'google' | 'abha',
  redirectUri: string,
  scopes: string[] = []
): Promise<{ url: string; state: string; codeVerifier?: string }> {
  const oauthProvider = await getOAuthProvider(provider);
  
  if (!oauthProvider) {
    throw new Error(`OAuth provider '${provider}' not configured`);
  }

  // Default scopes by provider
  const defaultScopes = {
    google: ['openid', 'email', 'profile'],
    abha: ['openid', 'email', 'profile', 'abha-enrolment'],
  };

  const finalScopes = scopes.length > 0 ? scopes : defaultScopes[provider];

  return oauthProvider.getAuthorizationUrl(redirectUri, finalScopes);
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  provider: 'google' | 'abha',
  code: string,
  redirectUri: string,
  state: string,
  codeVerifier?: string
): Promise<OAuthTokens> {
  const oauthProvider = await getOAuthProvider(provider);
  
  if (!oauthProvider) {
    throw new Error(`OAuth provider ${provider} not configured`);
  }
  
  return oauthProvider.exchangeCodeForTokens(code, redirectUri, state, codeVerifier);
}

/**
 * Get user info from OAuth provider
 */
export async function getOAuthUserInfo(
  provider: 'google' | 'abha',
  accessToken: string
): Promise<OAuthUser> {
  const oauthProvider = await getOAuthProvider(provider);
  
  if (!oauthProvider) {
    throw new Error(`OAuth provider '${provider}' not configured`);
  }

  return oauthProvider.getUserInfo(accessToken);
}

/**
 * Refresh OAuth tokens
 */
export async function refreshOAuthTokens(
  provider: 'google' | 'abha',
  refreshToken: string
): Promise<OAuthTokens> {
  const oauthProvider = await getOAuthProvider(provider);
  
  if (!oauthProvider) {
    throw new Error(`OAuth provider '${provider}' not configured`);
  }

  return oauthProvider.refreshTokens(refreshToken);
}

/**
 * Validate OAuth state parameter
 */
export function validateOAuthState(state: string): OAuthState | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf-8');
    const stateObj = JSON.parse(decoded) as OAuthState;

    // Validate timestamp (must be within 10 minutes)
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    if (now - stateObj.timestamp > maxAge) {
      return null;
    }

    return stateObj;
  } catch {
    return null;
  }
}

/**
 * Check if OAuth is available (at least one provider configured)
 */
export async function isOAuthAvailable(): Promise<boolean> {
  const providers = await getEnabledProviders();
  return providers.length > 0;
}