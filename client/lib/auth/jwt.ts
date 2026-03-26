/**
 * JWT Token Management
 * Handles JWT generation, verification, and refresh using jose library
 * Production-ready with proper error handling and security
 * 
 * NOTE: This module is Edge Runtime compatible - uses Web Crypto API
 */

import * as jose from 'jose';
import type { JWTPayload, UserClaims, TokenPair, AuthConfig } from './types';

/**
 * Generate a UUID compatible with Edge Runtime
 * Uses Web Crypto API which is available in both Node.js and Edge
 */
function generateUUID(): string {
  // Use Web Crypto API (works in Edge Runtime)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older environments
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Last resort fallback
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  
  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Default configuration
const DEFAULT_CONFIG: AuthConfig = {
  jwtSecret: process.env.JWT_SECRET || 'development-secret-change-in-production',
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '24h',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  issuer: 'vaidya-agent',
  audience: 'vaidya-client',
};

let config: AuthConfig = DEFAULT_CONFIG;
let secretKey: Uint8Array | null = null;

/**
 * Initialize JWT configuration
 * Call this once at startup, after secrets are loaded
 */
export function initializeJWT(customConfig?: Partial<AuthConfig>): void {
  config = { ...DEFAULT_CONFIG, ...customConfig };
  secretKey = new TextEncoder().encode(config.jwtSecret);
}

/**
 * Get the secret key, initializing if needed
 */
function getSecretKey(): Uint8Array {
  if (!secretKey) {
    secretKey = new TextEncoder().encode(config.jwtSecret);
  }
  return secretKey;
}

/**
 * Parse time string (e.g., '24h', '7d') to seconds
 */
function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiry format: ${expiry}. Use format like '24h' or '7d'`);
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  const multipliers: Record<string, number> = {
    's': 1,
    'm': 60,
    'h': 3600,
    'd': 86400,
  };
  
  return value * multipliers[unit];
}

/**
 * Generate a JWT token
 */
async function generateToken(
  claims: UserClaims,
  type: 'access' | 'refresh',
  expiry: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expirySeconds = parseExpiry(expiry);
  
  const payload: JWTPayload = {
    sub: claims.userId,
    iss: config.issuer,
    aud: config.audience,
    iat: now,
    exp: now + expirySeconds,
    jti: generateUUID(),
    type,
  };

  const token = await new jose.SignJWT({
    ...payload,
    claims: {
      userId: claims.userId,
      abhaAddress: claims.abhaAddress,
      roles: claims.roles,
      sessionId: claims.sessionId,
    },
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(payload.iat)
    .setExpirationTime(payload.exp)
    .setJti(payload.jti)
    .setIssuer(payload.iss)
    .setAudience(payload.aud)
    .sign(getSecretKey());

  return token;
}

/**
 * Generate access and refresh token pair
 */
export async function generateTokenPair(claims: UserClaims): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    generateToken(claims, 'access', config.accessTokenExpiry),
    generateToken(claims, 'refresh', config.refreshTokenExpiry),
  ]);

  const expirySeconds = parseExpiry(config.accessTokenExpiry);
  const expiresAt = Math.floor(Date.now() / 1000) + expirySeconds;

  return {
    accessToken,
    refreshToken,
    expiresAt,
  };
}

/**
 * Verification result
 */
export interface VerificationResult {
  valid: boolean;
  claims?: UserClaims;
  payload?: JWTPayload;
  error?: string;
}

/**
 * Verify a JWT token
 */
export async function verifyToken(token: string): Promise<VerificationResult> {
  try {
    const { payload } = await jose.jwtVerify(token, getSecretKey(), {
      issuer: config.issuer,
      audience: config.audience,
    });

    // Extract user claims from payload
    const tokenClaims = payload.claims as UserClaims | undefined;
    if (!tokenClaims) {
      return { valid: false, error: 'Missing user claims in token' };
    }

    const jwtPayload: JWTPayload = {
      sub: payload.sub || '',
      iss: payload.iss || '',
      aud: (Array.isArray(payload.aud) ? payload.aud[0] : payload.aud) || '',
      iat: payload.iat || 0,
      exp: payload.exp || 0,
      jti: payload.jti || '',
      type: (payload as { type?: 'access' | 'refresh' }).type || 'access',
    };

    return {
      valid: true,
      claims: tokenClaims,
      payload: jwtPayload,
    };
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      return { valid: false, error: 'Token expired' };
    }
    if (error instanceof jose.errors.JWTClaimValidationFailed) {
      return { valid: false, error: 'Token validation failed' };
    }
    if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
      return { valid: false, error: 'Invalid token signature' };
    }
    return { valid: false, error: 'Token verification failed' };
  }
}

/**
 * Refresh an access token using a valid refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
  const result = await verifyToken(refreshToken);
  
  if (!result.valid || !result.claims || !result.payload) {
    return null;
  }

  // Ensure it's a refresh token
  if (result.payload.type !== 'refresh') {
    return null;
  }

  // Generate new token pair
  return generateTokenPair(result.claims);
}

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Check if a token is close to expiry (within 5 minutes)
 */
export function isTokenExpiringSoon(expiresAt: number, thresholdSeconds: number = 300): boolean {
  const now = Math.floor(Date.now() / 1000);
  return expiresAt - now <= thresholdSeconds;
}

/**
 * Get token expiration as Date
 */
export function getTokenExpirationDate(token: string): Date | null {
  try {
    const decoded = jose.decodeJwt(token);
    if (decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch {
    return null;
  }
}
