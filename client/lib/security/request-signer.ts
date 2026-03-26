/**
 * HMAC Request Signing
 * Signs outgoing requests to ABDM/UHI with HMAC-SHA256
 */

import { createHmac, randomUUID } from 'crypto';
import { getSecret } from './secrets-manager';

/**
 * Signed request headers
 */
export interface SignedHeaders {
  'X-Timestamp': string;
  'X-Request-Id': string;
  'X-Signature': string;
  'X-Client-Id': string;
}

/**
 * Request signing configuration
 */
interface SigningConfig {
  clientId: string;
  secretKey: string;
  algorithm?: 'sha256' | 'sha512';
}

// Cached signing configurations
const signingConfigs: Map<string, SigningConfig | null> = new Map();

/**
 * Load signing configuration for a service
 */
async function getSigningConfig(service: 'abdm' | 'uhi'): Promise<SigningConfig | null> {
  const cacheKey = service;
  
  if (signingConfigs.has(cacheKey)) {
    return signingConfigs.get(cacheKey) || null;
  }

  const clientIdEnv = service === 'abdm' ? 'ABDM_CLIENT_ID' : 'UHI_SUBSCRIBER_ID';
  const secretName = service === 'abdm' ? 'abdm-client-secret' : 'uhi-api-key';

  const clientId = process.env[clientIdEnv];
  const secretKey = await getSecret(secretName);

  if (!clientId || !secretKey) {
    signingConfigs.set(cacheKey, null);
    return null;
  }

  const config: SigningConfig = {
    clientId,
    secretKey,
    algorithm: 'sha256',
  };

  signingConfigs.set(cacheKey, config);
  return config;
}

/**
 * Create HMAC signature for a message
 */
function createSignature(
  message: string,
  secretKey: string,
  algorithm: 'sha256' | 'sha512' = 'sha256'
): string {
  const hmac = createHmac(algorithm, secretKey);
  hmac.update(message);
  return hmac.digest('base64');
}

/**
 * Build the message to sign
 * Format: METHOD\nPATH\nTIMESTAMP\nBODY_HASH
 */
function buildSigningMessage(
  method: string,
  path: string,
  timestamp: string,
  body?: string | object
): string {
  const parts = [
    method.toUpperCase(),
    path,
    timestamp,
  ];

  // Add body hash if present
  if (body) {
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    const bodyHash = createHmac('sha256', 'body')
      .update(bodyString)
      .digest('hex');
    parts.push(bodyHash);
  }

  return parts.join('\n');
}

/**
 * Sign an outgoing request to ABDM
 */
export async function signABDMRequest(
  method: string,
  path: string,
  body?: string | object
): Promise<SignedHeaders | null> {
  const config = await getSigningConfig('abdm');
  
  if (!config) {
    console.warn('[RequestSigner] ABDM signing not configured - missing credentials');
    return null;
  }

  const timestamp = new Date().toISOString();
  const requestId = randomUUID();
  
  const message = buildSigningMessage(method, path, timestamp, body);
  const signature = createSignature(message, config.secretKey, config.algorithm);

  return {
    'X-Timestamp': timestamp,
    'X-Request-Id': requestId,
    'X-Signature': signature,
    'X-Client-Id': config.clientId,
  };
}

/**
 * Sign an outgoing request to UHI
 */
export async function signUHIRequest(
  method: string,
  path: string,
  body?: string | object
): Promise<SignedHeaders | null> {
  const config = await getSigningConfig('uhi');
  
  if (!config) {
    console.warn('[RequestSigner] UHI signing not configured - missing credentials');
    return null;
  }

  const timestamp = new Date().toISOString();
  const requestId = randomUUID();
  
  const message = buildSigningMessage(method, path, timestamp, body);
  const signature = createSignature(message, config.secretKey, config.algorithm);

  return {
    'X-Timestamp': timestamp,
    'X-Request-Id': requestId,
    'X-Signature': signature,
    'X-Client-Id': config.clientId,
  };
}

/**
 * Verify an incoming signed request
 */
export function verifySignedRequest(
  method: string,
  path: string,
  headers: {
    timestamp: string;
    requestId: string;
    signature: string;
    clientId: string;
  },
  secretKey: string,
  body?: string | object,
  options?: {
    maxAgeSeconds?: number;
    algorithm?: 'sha256' | 'sha512';
  }
): { valid: boolean; error?: string } {
  const { maxAgeSeconds = 300, algorithm = 'sha256' } = options || {};

  // Check timestamp freshness
  const requestTime = new Date(headers.timestamp);
  const now = new Date();
  const ageSeconds = (now.getTime() - requestTime.getTime()) / 1000;

  if (isNaN(requestTime.getTime())) {
    return { valid: false, error: 'Invalid timestamp format' };
  }

  if (ageSeconds > maxAgeSeconds) {
    return { valid: false, error: 'Request timestamp too old' };
  }

  if (ageSeconds < -30) {
    return { valid: false, error: 'Request timestamp in future' };
  }

  // Rebuild and verify signature
  const message = buildSigningMessage(method, path, headers.timestamp, body);
  const expectedSignature = createSignature(message, secretKey, algorithm);

  if (headers.signature !== expectedSignature) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true };
}

/**
 * Verify ABDM callback signature
 */
export async function verifyABDMCallback(
  method: string,
  path: string,
  headers: {
    timestamp?: string;
    requestId?: string;
    signature?: string;
    clientId?: string;
  },
  body?: string | object
): Promise<{ valid: boolean; error?: string }> {
  // Extract headers (handle different header name formats)
  const timestamp = headers.timestamp;
  const requestId = headers.requestId;
  const signature = headers.signature;
  const clientId = headers.clientId;

  if (!timestamp || !requestId || !signature || !clientId) {
    return { valid: false, error: 'Missing required signing headers' };
  }

  const config = await getSigningConfig('abdm');
  if (!config) {
    return { valid: false, error: 'ABDM signing not configured' };
  }

  // Verify client ID matches
  if (clientId !== config.clientId) {
    // Client ID mismatch - this is a security violation
    // In production, this should be rejected
    // Real ABDM callbacks would use ABDM's signing keys (not our client secret)
    console.error('[RequestSigner] Client ID mismatch in ABDM callback:', {
      expected: config.clientId,
      received: clientId,
    });
    return {
      valid: false,
      error: 'Client ID mismatch - possible spoofed callback',
    };
  }

  return verifySignedRequest(
    method,
    path,
    { timestamp, requestId, signature, clientId },
    config.secretKey,
    body
  );
}

/**
 * Clear cached signing configurations (for rotation)
 */
export function clearSigningConfigs(): void {
  signingConfigs.clear();
}

/**
 * Security index export
 */
export * from './secrets-manager';
// Removed export * from './rate-limiter' to avoid ambiguity and since rate-limiter-redis is used now.
export * from './audit-logger';
