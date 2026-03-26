/**
 * Google OAuth 2.0 Provider
 * Production-ready Google OAuth implementation
 */

import { OAuth2Client } from 'google-auth-library';
import type { 
  OAuthProvider, 
  OAuthUser, 
  OAuthTokens, 
  OAuthAuthorizationUrl 
} from '../oauth-types';

export class GoogleOAuthProvider implements OAuthProvider {
  public readonly name = 'google';
  private client: OAuth2Client;
  private clientId: string;
  private clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.client = new OAuth2Client(clientId, clientSecret);
  }

  async getAuthorizationUrl(redirectUri: string, scopes: string[]): Promise<OAuthAuthorizationUrl> {
    const state = this.generateState();
    
    const url = this.client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes.join(' '),
      redirect_uri: redirectUri,
      state,
      prompt: 'consent',
    });

    return { url, state };
  }

  async exchangeCodeForTokens(
    code: string, 
    redirectUri: string
  ): Promise<OAuthTokens> {
    try {
      const { tokens } = await this.client.getToken({
        code,
        redirect_uri: redirectUri,
      });
      
      if (!tokens.access_token) {
        throw new Error('No access token received from Google');
      }

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        expiresAt: tokens.expiry_date || Date.now() + 3600000, // 1 hour fallback
        scope: tokens.scope,
      };
    } catch (error) {
      throw new Error(`Google OAuth token exchange failed: ${error}`);
    }
  }

  async getUserInfo(accessToken: string): Promise<OAuthUser> {
    try {
      this.client.setCredentials({ access_token: accessToken });
      
      const userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
      const response = await this.client.request({ url: userInfoUrl });
      const data = response.data as Record<string, unknown>;

      if (!data.id || !data.email) {
        throw new Error('Invalid user info response from Google');
      }

      return {
        id: data.id as string,
        email: data.email as string,
        name: (data.name as string) || (data.email as string),
        picture: data.picture as string | undefined,
        verified: data.verified_email === true,
        provider: 'google',
      };
    } catch (error) {
      throw new Error(`Failed to get Google user info: ${error}`);
    }
  }

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    try {
      this.client.setCredentials({ refresh_token: refreshToken });
      
      const { credentials } = await this.client.refreshAccessToken();
      
      if (!credentials.access_token) {
        throw new Error('No access token received from Google refresh');
      }

      return {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || refreshToken,
        expiresAt: credentials.expiry_date || Date.now() + 3600000,
        scope: credentials.scope,
      };
    } catch (error) {
      throw new Error(`Google token refresh failed: ${error}`);
    }
  }

  private generateState(): string {
    return Buffer.from(JSON.stringify({
      provider: 'google',
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2),
    })).toString('base64url');
  }
}