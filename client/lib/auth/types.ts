/**
 * Authentication Types
 * Defines JWT token structure and authentication context
 */

export interface JWTPayload {
  /** Subject - user identifier (userId or ABHA address) */
  sub: string;
  /** Issuer */
  iss: string;
  /** Audience */
  aud: string;
  /** Issued at (Unix timestamp) */
  iat: number;
  /** Expiration (Unix timestamp) */
  exp: number;
  /** JWT ID - unique token identifier */
  jti: string;
  /** Token type */
  type: 'access' | 'refresh';
}

export interface UserClaims {
  /** User ID (system-generated or external) */
  userId: string;
  /** ABHA address if linked */
  abhaAddress?: string;
  /** User roles */
  roles: UserRole[];
  /** Active session ID */
  sessionId?: string;
  
  // OAuth fields
  /** User email from OAuth provider */
  email?: string;
  /** Display name from OAuth provider */
  name?: string;
  /** Profile picture URL */
  picture?: string;
  /** OAuth provider used for authentication */
  provider?: 'demo' | 'google' | 'abha';
}

export type UserRole = 'user' | 'admin' | 'healthcare_provider';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthContext {
  /** Whether request is authenticated */
  isAuthenticated: boolean;
  /** User claims from JWT */
  user?: UserClaims;
  /** Original JWT token */
  token?: string;
  /** Token expiration timestamp */
  expiresAt?: number;
}

export interface AuthConfig {
  /** JWT secret key (from Secret Manager in production) */
  jwtSecret: string;
  /** Access token expiry (e.g., '24h', '1d') */
  accessTokenExpiry: string;
  /** Refresh token expiry (e.g., '7d', '30d') */
  refreshTokenExpiry: string;
  /** Token issuer */
  issuer: string;
  /** Token audience */
  audience: string;
}

/** Routes that require authentication */
export const PROTECTED_ROUTES = [
  '/api/agent/session',
  '/api/agent/triage',
  '/api/agent/chat',
  '/api/abdm/',
  '/api/uhi/',
] as const;

/** Routes that are always public */
export const PUBLIC_ROUTES = [
  '/api/health',
  '/api/auth/login',
  '/api/auth/callback',
  '/api/rag/search',
  '/api/voice/stt',
  '/api/voice/tts',
] as const;

/** Admin-only routes */
export const ADMIN_ROUTES = [
  '/api/rag/seed',
  '/api/rag/guidelines', // POST only
] as const;
