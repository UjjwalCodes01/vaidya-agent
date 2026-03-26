/**
 * GCP Configuration and Service Account Management
 * Handles Base64-encoded service account keys for Vercel deployment
 */

import { getEnv } from '../env';

interface GCPCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

/**
 * Decodes Base64-encoded GCP service account key
 * @param base64Key - Base64-encoded service account JSON
 * @returns Parsed service account credentials
 */
export function decodeServiceAccountKey(base64Key: string): GCPCredentials {
  try {
    const decoded = Buffer.from(base64Key, 'base64').toString('utf-8');
    const credentials = JSON.parse(decoded) as GCPCredentials;

    // Validate required fields
    const requiredFields = [
      'type',
      'project_id',
      'private_key',
      'client_email',
    ];

    for (const field of requiredFields) {
      if (!credentials[field as keyof GCPCredentials]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return credentials;
  } catch (error) {
    throw new Error(
      `Failed to decode service account key: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Retrieves GCP credentials from environment variables
 * Supports both Base64-encoded and direct JSON
 */
export function getGCPCredentials(): GCPCredentials {
  const base64Key = getEnv().GCP_SERVICE_ACCOUNT_KEY_BASE64;

  if (!base64Key) {
    throw new Error(
      'GCP_SERVICE_ACCOUNT_KEY_BASE64 environment variable is not set. ' +
      'Please set it with: cat service-account.json | base64 -w 0'
    );
  }

  return decodeServiceAccountKey(base64Key);
}

/**
 * Gets GCP project configuration from environment
 */
export function getGCPConfig() {
  const env = getEnv();
  const projectId = env.GCP_PROJECT_ID;
  const region = env.GCP_REGION;

  return {
    projectId,
    region,
  };
}

/**
 * Validates GCP environment configuration
 * Throws an error if configuration is invalid
 */
export function validateGCPConfig(): void {
  getGCPCredentials();
  getGCPConfig();
}
