/**
 * ABDM (Ayushman Bharat Digital Mission) Client
 * Handles authentication and basic API interactions with ABDM services
 */

interface ABDMConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

interface ABDMTokenResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
  tokenType: string;
}

let cachedToken: {
  accessToken: string;
  expiresAt: number;
} | null = null;

/**
 * Gets ABDM configuration from environment
 */
export function getABDMConfig(): ABDMConfig {
  const baseUrl = process.env.ABDM_BASE_URL || 'https://dev.abdm.gov.in';
  const clientId = process.env.ABDM_CLIENT_ID;
  const clientSecret = process.env.ABDM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'ABDM credentials not configured. Set ABDM_CLIENT_ID and ABDM_CLIENT_SECRET environment variables'
    );
  }

  return {
    baseUrl,
    clientId,
    clientSecret,
  };
}

/**
 * Authenticates with ABDM and retrieves access token
 */
export async function getABDMToken(forceRefresh: boolean = false): Promise<string> {
  // Return cached token if valid
  if (!forceRefresh && cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }

  const config = getABDMConfig();

  const response = await fetch(`${config.baseUrl}/gateway/v0.5/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ABDM authentication failed: ${error}`);
  }

  const data = (await response.json()) as ABDMTokenResponse;

  // Cache token with 5-minute buffer before expiry
  cachedToken = {
    accessToken: data.accessToken,
    expiresAt: Date.now() + (data.expiresIn - 300) * 1000,
  };

  return data.accessToken;
}

/**
 * Makes an authenticated request to ABDM API
 */
export async function abdmRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config = getABDMConfig();
  const token = await getABDMToken();

  const response = await fetch(`${config.baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    // Try token refresh on 401
    if (response.status === 401) {
      const newToken = await getABDMToken(true);
      const retryResponse = await fetch(`${config.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
          ...options.headers,
        },
      });

      if (!retryResponse.ok) {
        const error = await retryResponse.text();
        throw new Error(`ABDM API error: ${error}`);
      }

      return retryResponse.json();
    }

    const error = await response.text();
    throw new Error(`ABDM API error: ${error}`);
  }

  return response.json();
}

/**
 * Validates ABDM environment configuration
 */
export function validateABDMConfig(): void {
  getABDMConfig();
}
