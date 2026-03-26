/**
 * ABHA OAuth Provider
 * Production-ready ABHA (Ayushman Bharat Health Account) OAuth implementation
 */

import axios from 'axios';
import { createHash, randomBytes } from 'crypto';
import type { 
  OAuthProvider, 
  OAuthUser, 
  OAuthTokens, 
  OAuthAuthorizationUrl 
} from '../oauth-types';

export class ABHAOAuthProvider implements OAuthProvider {
  public readonly name = 'abha';
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;

  constructor(clientId: string, clientSecret: string, baseUrl: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.baseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
  }

  async getAuthorizationUrl(redirectUri: string, scopes: string[]): Promise<OAuthAuthorizationUrl> {
    const state = this.generateState();
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const url = `${this.baseUrl}/auth/realms/consent-manager/protocol/openid-connect/auth?${params}`;

    return { url, state, codeVerifier };
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    stateOrCodeVerifier?: string,
    codeVerifier?: string
  ): Promise<OAuthTokens> {
    const actualCodeVerifier = codeVerifier || stateOrCodeVerifier;
    if (!actualCodeVerifier) {
      throw new Error('Code verifier required for ABHA OAuth');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/auth/realms/consent-manager/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: redirectUri,
          code_verifier: actualCodeVerifier,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = response.data;

      if (!data.access_token) {
        throw new Error('No access token received from ABHA');
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
        scope: data.scope,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`ABHA OAuth token exchange failed: ${error.response?.data?.error_description || error.message}`);
      }
      throw new Error(`ABHA OAuth token exchange failed: ${error}`);
    }
  }

  async getUserInfo(accessToken: string): Promise<OAuthUser> {
    try {
      // ABHA userinfo endpoint
      const response = await axios.get(
        `${this.baseUrl}/auth/realms/consent-manager/protocol/openid-connect/userinfo`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = response.data;

      if (!data.sub) {
        throw new Error('Invalid user info response from ABHA');
      }

      // Extract ABHA address from preferred_username or sub
      const abhaAddress = data.preferred_username || data.sub;
      
      return {
        id: data.sub,
        email: data.email || `${abhaAddress}@abha`,
        name: data.name || data.given_name || abhaAddress,
        abhaAddress,
        verified: data.email_verified === true,
        provider: 'abha',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get ABHA user info: ${error.response?.data?.error_description || error.message}`);
      }
      throw new Error(`Failed to get ABHA user info: ${error}`);
    }
  }

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/auth/realms/consent-manager/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = response.data;

      if (!data.access_token) {
        throw new Error('No access token received from ABHA refresh');
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: Date.now() + (data.expires_in * 1000),
        scope: data.scope,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`ABHA token refresh failed: ${error.response?.data?.error_description || error.message}`);
      }
      throw new Error(`ABHA token refresh failed: ${error}`);
    }
  }

  private generateState(): string {
    return Buffer.from(JSON.stringify({
      provider: 'abha',
      timestamp: Date.now(),
      nonce: randomBytes(16).toString('hex'),
    })).toString('base64url');
  }

  private generateCodeVerifier(): string {
    return randomBytes(32).toString('base64url');
  }

  private generateCodeChallenge(codeVerifier: string): string {
    return createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
  }
}