/**
 * OAuth Provider Types
 * Common interfaces for OAuth 2.0 implementations
 */

export interface OAuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  abhaAddress?: string;
  verified: boolean;
  provider: 'google' | 'abha';
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
}

export interface OAuthAuthorizationUrl {
  url: string;
  state: string;
  codeVerifier?: string;
}

export interface OAuthProvider {
  name: string;
  getAuthorizationUrl(redirectUri: string, scopes: string[]): Promise<OAuthAuthorizationUrl>;
  exchangeCodeForTokens(code: string, redirectUri: string, stateOrCodeVerifier?: string, codeVerifier?: string): Promise<OAuthTokens>;
  getUserInfo(accessToken: string): Promise<OAuthUser>;
  refreshTokens(refreshToken: string): Promise<OAuthTokens>;
}

export interface OAuthConfig {
  google: {
    clientId: string;
    clientSecret: string;
    enabled: boolean;
  };
  abha: {
    clientId: string;
    clientSecret: string;
    baseUrl: string;
    enabled: boolean;
  };
}

export interface OAuthState {
  provider: 'google' | 'abha';
  redirectUri: string;
  timestamp: number;
  nonce: string;
}