/**
 * GCP Secret Manager Integration
 * Secure runtime secret fetching with caching and rotation support
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { getGCPCredentials, getGCPConfig } from '../gcp/config';

// Secret cache with TTL
interface CachedSecret {
  value: string;
  fetchedAt: number;
  version: string;
}

const secretCache = new Map<string, CachedSecret>();

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL_MS = 5 * 60 * 1000;

// Secret Manager client singleton
let secretManagerClient: SecretManagerServiceClient | null = null;

/**
 * Initialize Secret Manager client
 */
function getSecretManagerClient(): SecretManagerServiceClient {
  if (!secretManagerClient) {
    const credentials = getGCPCredentials();
    secretManagerClient = new SecretManagerServiceClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
    });
  }
  return secretManagerClient;
}

/**
 * Check if Secret Manager is enabled
 */
export function isSecretManagerEnabled(): boolean {
  return process.env.GCP_SECRET_MANAGER_ENABLED === 'true';
}

/**
 * Get the project ID for Secret Manager
 */
function getProjectId(): string {
  return getGCPConfig().projectId;
}

/**
 * Get the secret prefix for namespacing
 */
function getSecretPrefix(): string {
  return process.env.GCP_SECRETS_PREFIX || 'vaidya-';
}

/**
 * Build the full secret name with prefix and project path
 */
function buildSecretPath(secretName: string, version: string = 'latest'): string {
  const projectId = getProjectId();
  const prefix = getSecretPrefix();
  const fullName = `${prefix}${secretName}`;
  return `projects/${projectId}/secrets/${fullName}/versions/${version}`;
}

/**
 * Check if cached secret is still valid
 */
function isCacheValid(cached: CachedSecret | undefined): cached is CachedSecret {
  if (!cached) return false;
  return Date.now() - cached.fetchedAt < CACHE_TTL_MS;
}

/**
 * Fetch a secret from GCP Secret Manager
 * Returns cached value if available and not expired
 */
export async function getSecret(secretName: string, options?: {
  version?: string;
  bypassCache?: boolean;
}): Promise<string | null> {
  const { version = 'latest', bypassCache = false } = options || {};
  const cacheKey = `${secretName}:${version}`;

  // Check cache first (unless bypassed)
  if (!bypassCache) {
    const cached = secretCache.get(cacheKey);
    if (isCacheValid(cached)) {
      return cached.value;
    }
  }

  // If Secret Manager is disabled, fall back to env var
  if (!isSecretManagerEnabled()) {
    const envVar = secretNameToEnvVar(secretName);
    return process.env[envVar] || null;
  }

  try {
    const client = getSecretManagerClient();
    const secretPath = buildSecretPath(secretName, version);

    const [accessResponse] = await client.accessSecretVersion({
      name: secretPath,
    });

    const payload = accessResponse.payload?.data;
    if (!payload) {
      console.warn(`[SecretManager] Secret '${secretName}' has no payload`);
      return null;
    }

    // Convert to string
    const value = typeof payload === 'string' 
      ? payload 
      : Buffer.from(payload).toString('utf-8');

    // Extract version from response
    const versionId = accessResponse.name?.split('/').pop() || version;

    // Cache the result
    secretCache.set(cacheKey, {
      value,
      fetchedAt: Date.now(),
      version: versionId,
    });

    return value;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[SecretManager] Failed to fetch secret '${secretName}':`, errorMessage);
    
    // Fall back to env var if Secret Manager fails
    const envVar = secretNameToEnvVar(secretName);
    const fallback = process.env[envVar];
    if (fallback) {
      console.warn(`[SecretManager] Using env var fallback for '${secretName}'`);
      return fallback;
    }
    
    return null;
  }
}

/**
 * Convert secret name to environment variable name
 * e.g., 'jwt-secret' -> 'JWT_SECRET'
 */
function secretNameToEnvVar(secretName: string): string {
  return secretName.toUpperCase().replace(/-/g, '_');
}

/**
 * Invalidate cached secret
 */
export function invalidateSecret(secretName: string): void {
  // Invalidate all versions
  for (const key of secretCache.keys()) {
    if (key.startsWith(`${secretName}:`)) {
      secretCache.delete(key);
    }
  }
}

/**
 * Clear all cached secrets
 */
export function clearSecretCache(): void {
  secretCache.clear();
}

/**
 * Secret configuration for the application
 */
export interface SecretConfig {
  jwtSecret: string;
  abdmClientSecret: string | null;
  uhiApiKey: string | null;
  ragAdminKey: string | null;
}

/**
 * Load all application secrets
 * Uses Secret Manager in production, env vars in development
 */
export async function loadSecrets(): Promise<SecretConfig> {
  const [jwtSecret, abdmClientSecret, uhiApiKey, ragAdminKey] = await Promise.all([
    getSecret('jwt-secret'),
    getSecret('abdm-client-secret'),
    getSecret('uhi-api-key'),
    getSecret('rag-admin-key'),
  ]);

  return {
    jwtSecret: jwtSecret || process.env.JWT_SECRET || 'development-secret-change-in-production',
    abdmClientSecret: abdmClientSecret || process.env.ABDM_CLIENT_SECRET || null,
    uhiApiKey: uhiApiKey || process.env.UHI_API_KEY || null,
    ragAdminKey: ragAdminKey || process.env.RAG_ADMIN_KEY || null,
  };
}

/**
 * Initialize secrets and JWT
 * Call this at application startup
 */
export async function initializeSecrets(): Promise<void> {
  const secrets = await loadSecrets();
  
  // Initialize JWT with loaded secret
  const { initializeJWT } = await import('../auth/jwt');
  initializeJWT({ jwtSecret: secrets.jwtSecret });
  
  console.log('[SecretManager] Secrets loaded successfully');
  
  if (isSecretManagerEnabled()) {
    console.log('[SecretManager] Using GCP Secret Manager');
  } else {
    console.log('[SecretManager] Using environment variables (development mode)');
  }
}

/**
 * Create a new secret version (for rotation)
 */
export async function createSecretVersion(
  secretName: string,
  secretValue: string
): Promise<string | null> {
  if (!isSecretManagerEnabled()) {
    console.warn('[SecretManager] Cannot create secret version - Secret Manager disabled');
    return null;
  }

  try {
    const client = getSecretManagerClient();
    const projectId = getProjectId();
    const prefix = getSecretPrefix();
    const fullName = `${prefix}${secretName}`;
    const parent = `projects/${projectId}/secrets/${fullName}`;

    const [version] = await client.addSecretVersion({
      parent,
      payload: {
        data: Buffer.from(secretValue, 'utf-8'),
      },
    });

    // Invalidate cache for this secret
    invalidateSecret(secretName);

    const versionId = version.name?.split('/').pop() || 'unknown';
    console.log(`[SecretManager] Created new version '${versionId}' for secret '${secretName}'`);
    
    return versionId;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[SecretManager] Failed to create secret version for '${secretName}':`, errorMessage);
    return null;
  }
}

/**
 * Disable an old secret version (for rotation)
 */
export async function disableSecretVersion(
  secretName: string,
  version: string
): Promise<boolean> {
  if (!isSecretManagerEnabled()) {
    console.warn('[SecretManager] Cannot disable secret version - Secret Manager disabled');
    return false;
  }

  try {
    const client = getSecretManagerClient();
    const secretPath = buildSecretPath(secretName, version);

    await client.disableSecretVersion({
      name: secretPath,
    });

    // Invalidate cache
    invalidateSecret(secretName);

    console.log(`[SecretManager] Disabled version '${version}' for secret '${secretName}'`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[SecretManager] Failed to disable secret version '${version}':`, errorMessage);
    return false;
  }
}
