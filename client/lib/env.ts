/**
 * Environment Variable Validation
 * Validates all required environment variables at startup
 * Fails fast with clear error messages for invalid config
 */

import { z } from 'zod';

const envSchema = z.object({
  // Core GCP
  GCP_PROJECT_ID: z.string().min(1, 'GCP_PROJECT_ID is required'),
  GCP_REGION: z.string().default('us-central1'),
  GCP_SERVICE_ACCOUNT_KEY_BASE64: z.string().min(1, 'GCP_SERVICE_ACCOUNT_KEY_BASE64 is required'),

  // Vertex AI
  VERTEX_AI_MODEL: z.string().default('gemini-2.0-flash-exp'),

  // Phase 2: Embeddings
  VERTEX_AI_EMBEDDING_MODEL: z.string().default('text-embedding-004'),
  VERTEX_AI_EMBEDDING_DIMENSION: z
    .string()
    .default('256')
    .transform((val) => parseInt(val, 10))
    .refine((val) => [256, 512, 768].includes(val), {
      message: 'VERTEX_AI_EMBEDDING_DIMENSION must be 256, 512, or 768',
    }),

  // Phase 2: RAG
  RAG_TOP_K: z
    .string()
    .default('5')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 1 && val <= 20, {
      message: 'RAG_TOP_K must be between 1 and 20',
    }),
  RAG_MIN_SIMILARITY: z
    .string()
    .default('0.5')
    .transform((val) => parseFloat(val))
    .refine((val) => val >= 0 && val <= 1, {
      message: 'RAG_MIN_SIMILARITY must be between 0 and 1',
    }),
  RAG_BATCH_SIZE: z
    .string()
    .default('5')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 1 && val <= 10, {
      message: 'RAG_BATCH_SIZE must be between 1 and 10',
    }),
  RAG_ADMIN_KEY: z.string().optional(),

  // Phase 2: Speech
  DEFAULT_SPEECH_LANGUAGE: z
    .string()
    .default('hi-IN')
    .refine((val) => val.match(/^[a-z]{2}-[A-Z]{2}$/), {
      message: 'DEFAULT_SPEECH_LANGUAGE must be in format "xx-XX" (e.g., "hi-IN")',
    }),
  TTS_VOICE_NAME: z.string().default('hi-IN-Wavenet-A'),
  TTS_SPEAKING_RATE: z
    .string()
    .default('1.0')
    .transform((val) => parseFloat(val))
    .refine((val) => val >= 0.25 && val <= 4.0, {
      message: 'TTS_SPEAKING_RATE must be between 0.25 and 4.0',
    }),
  TTS_PITCH: z
    .string()
    .default('0.0')
    .transform((val) => parseFloat(val))
    .refine((val) => val >= -20 && val <= 20, {
      message: 'TTS_PITCH must be between -20 and 20',
    }),

  // Phase 2: Voice Triage
  VOICE_TRIAGE_ALT_LANGUAGES: z
    .string()
    .default('en-IN')
    .transform((val) => val.split(',').map((lang) => lang.trim()))
    .refine((languages) => languages.every((lang) => lang.match(/^[a-z]{2}-[A-Z]{2}$/)), {
      message: 'VOICE_TRIAGE_ALT_LANGUAGES must be comma-separated language codes (e.g., "en-IN,bn-IN")',
    }),
  VOICE_TRIAGE_RAG_TOP_K: z
    .string()
    .default('3')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 1 && val <= 10, {
      message: 'VOICE_TRIAGE_RAG_TOP_K must be between 1 and 10',
    }),
  VOICE_TRIAGE_RAG_MIN_SIMILARITY: z
    .string()
    .default('0.4')
    .transform((val) => parseFloat(val))
    .refine((val) => val >= 0 && val <= 1, {
      message: 'VOICE_TRIAGE_RAG_MIN_SIMILARITY must be between 0 and 1',
    }),
  VOICE_TRIAGE_AUDIO_ENCODING: z
    .string()
    .default('MP3')
    .refine((val) => ['MP3', 'LINEAR16', 'OGG_OPUS'].includes(val), {
      message: 'VOICE_TRIAGE_AUDIO_ENCODING must be MP3, LINEAR16, or OGG_OPUS',
    }),

  // Rate Limiting
  RATE_LIMIT_MAX: z
    .string()
    .default('100')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 1 && val <= 10000, {
      message: 'RATE_LIMIT_MAX must be between 1 and 10000',
    }),
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default('60000')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 1000 && val <= 3600000, {
      message: 'RATE_LIMIT_WINDOW_MS must be between 1000 (1s) and 3600000 (1h)',
    }),

  // CORS
  ALLOWED_ORIGINS: z.string().optional(),

  // Firestore
  FIRESTORE_DATABASE_ID: z.string().default('(default)'),

  // ABDM (Phase 3)
  ABDM_BASE_URL: z.string().url().optional(),
  ABDM_CLIENT_ID: z.string().optional(),
  ABDM_CLIENT_SECRET: z.string().optional(),

  // UHI (Phase 3)
  UHI_GATEWAY_URL: z.string().url().optional(),
  UHI_SUBSCRIBER_ID: z.string().optional(),
  UHI_SUBSCRIBER_URL: z.string().url().optional(),

  // Phase 3: Tool-calling Configuration
  GEMINI_ENABLE_FUNCTION_CALLING: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  TOOL_CALLING_TIMEOUT_MS: z
    .string()
    .default('30000')
    .transform((val) => parseInt(val, 10)),

  // Mock Mode Configuration (for hackathon reliability)
  MOCK_ABDM_RESPONSES: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  MOCK_UHI_RESPONSES: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),

  // JWT Authentication (Phase 4)
  JWT_SECRET: z.string().optional(),
  JWT_ACCESS_EXPIRY: z.string().default('24h'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  
  // GCP Secret Manager (Phase 4)
  GCP_SECRET_MANAGER_ENABLED: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  GCP_SECRETS_PREFIX: z.string().default('vaidya-'),

  // MCP Server (Phase 4)
  MCP_SERVER_ENABLED: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  MCP_DEBUG_LEVEL: z
    .enum(['debug', 'info', 'warn', 'error'])
    .default('info'),

  // Demo Auth (for hackathon)
  DEMO_AUTH_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  DEMO_ALLOWED_USERS: z.string().optional(),

  // OAuth Providers (Production Auth)
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  ABHA_OAUTH_CLIENT_ID: z.string().optional(),
  ABHA_OAUTH_CLIENT_SECRET: z.string().optional(),
  ABHA_OAUTH_BASE_URL: z.string().url().default('https://dev.abdm.gov.in'),
  ADMIN_EMAILS: z.string().optional(), // Comma-separated list of admin emails

  // Redis for distributed rate limiting
  REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),

  // Optional
  SESSION_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  GOOGLE_MAPS_API_KEY: z.string().min(1, 'Google Maps API key required for PHC grounding'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DEBUG: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

let validatedEnv: ValidatedEnv | null = null;

/**
 * Validate environment variables
 * Should be called once at application startup
 */
export function validateEnv(): ValidatedEnv {
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    validatedEnv = envSchema.parse(process.env);
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.issues.forEach((err: z.ZodIssue) => {
        const path = err.path.join('.');
        console.error(`   ${path}: ${err.message}`);
      });
      console.error('\n💡 Check your .env.local file and ensure all required variables are set correctly.\n');
    } else {
      console.error('❌ Unexpected error during environment validation:', error);
    }
    process.exit(1);
  }
}

/**
 * Get validated environment variables
 * Automatically validates on first call
 */
export function getEnv(): ValidatedEnv {
  if (!validatedEnv) {
    return validateEnv();
  }
  return validatedEnv;
}

/**
 * Validate GCP service account key format
 */
export function validateGCPCredentials(): void {
  const env = getEnv();

  try {
    const decoded = Buffer.from(env.GCP_SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);

    const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email', 'client_id'];
    const missing = requiredFields.filter((field) => !parsed[field]);

    if (missing.length > 0) {
      throw new Error(`Service account JSON missing required fields: ${missing.join(', ')}`);
    }

    if (parsed.type !== 'service_account') {
      throw new Error('GCP credentials must be for a service account');
    }

    console.log(`✅ GCP service account validated: ${parsed.client_email}`);
  } catch (error) {
    console.error('❌ Invalid GCP_SERVICE_ACCOUNT_KEY_BASE64:');
    if (error instanceof SyntaxError) {
      console.error('   JSON parsing failed - ensure the base64 string is valid');
    } else {
      console.error(`   ${(error as Error).message}`);
    }
    console.error('\n💡 To fix:');
    console.error('   1. Download service account JSON from GCP Console');
    console.error('   2. Encode to base64: cat service-account.json | base64 -w 0');
    console.error('   3. Set GCP_SERVICE_ACCOUNT_KEY_BASE64 in .env.local\n');
    process.exit(1);
  }
}