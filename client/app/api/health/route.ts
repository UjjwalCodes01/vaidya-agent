/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Verifies system status and connectivity to all services (Phase 1 + Phase 2)
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api-middleware';
import { getFirestore } from '@/lib/gcp/firestore';
import { getVertexAI } from '@/lib/gcp/vertex-ai';
import { getEnv } from '@/lib/env';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    firestore: boolean;
    vertexAI: boolean;
    embeddings: boolean;
    speechToText: boolean;
    textToSpeech: boolean;
    guidelines: boolean;
    environment: boolean;
  };
  version: string;
}

async function checkFirestore(): Promise<boolean> {
  try {
    const db = getFirestore();
    // Simple connectivity check
    await db.listCollections();
    return true;
  } catch {
    return false;
  }
}

async function checkVertexAI(): Promise<boolean> {
  try {
    const vertexAI = getVertexAI();
    const model = getEnv().VERTEX_AI_MODEL;

    // Actually test API auth with a minimal request
    const generativeModel = vertexAI.getGenerativeModel({
      model,
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 10,
      },
    });

    const result = await generativeModel.generateContent('Hi');

    // Verify we got a valid response
    return !!(result?.response?.candidates && result.response.candidates.length > 0);
  } catch {
    return false;
  }
}

async function checkEmbeddings(): Promise<boolean> {
  try {
    const { generateEmbedding } = await import('@/lib/gcp/embeddings');

    // Test with minimal text
    const embedding = await generateEmbedding('test');

    // Verify we got a valid embedding array
    return Array.isArray(embedding) && embedding.length > 0 && typeof embedding[0] === 'number';
  } catch {
    return false;
  }
}

async function checkSpeechToText(): Promise<boolean> {
  try {
    const { SpeechClient } = await import('@google-cloud/speech');
    const { getGCPCredentials } = await import('@/lib/gcp/config');

    const credentials = getGCPCredentials();
    const client = new SpeechClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
    });

    // Test auth with a minimal recognize call
    // We expect this to fail due to empty content, but auth should work
    try {
      await client.recognize({
        config: {
          encoding: 'WEBM_OPUS' as unknown as number,
          sampleRateHertz: 16000,
          languageCode: 'hi-IN',
        },
        audio: {
          content: '', // Empty content - should cause InvalidArgument error if auth works
        },
      });
      // If we get here without error, something unexpected happened
      // but technically auth worked
      return true;
    } catch (recognizeError: unknown) {
      const error = recognizeError as { code?: number; message?: string };
      const errorCode = error?.code;
      const errorMessage = error?.message?.toLowerCase() || '';

      // Auth-related failures (service should be marked unhealthy)
      if (
        errorCode === 16 || // UNAUTHENTICATED
        errorCode === 7 ||  // PERMISSION_DENIED
        errorMessage.includes('credentials') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('permission denied')
      ) {
        return false; // Auth failed
      }

      // Expected invalid argument error (auth worked, but content was invalid)
      if (
        errorCode === 3 || // INVALID_ARGUMENT
        errorMessage.includes('invalid') ||
        errorMessage.includes('audio') ||
        errorMessage.includes('content')
      ) {
        return true; // Auth worked, got expected content error
      }

      // Other operational errors (quota, unavailable, etc.)
      if (
        errorCode === 8 ||  // RESOURCE_EXHAUSTED (quota)
        errorCode === 14 || // UNAVAILABLE
        errorMessage.includes('quota') ||
        errorMessage.includes('unavailable') ||
        errorMessage.includes('deadline') ||
        errorMessage.includes('timeout')
      ) {
        return false; // Service operational issues
      }

      // Unknown error - be conservative and mark as unhealthy
      console.error('STT health check unknown error:', error);
      return false;
    }
  } catch (error: unknown) {
    // Client creation or other setup errors
    console.error('STT health check setup error:', error);
    return false;
  }
}

async function checkTextToSpeech(): Promise<boolean> {
  try {
    const { TextToSpeechClient } = await import('@google-cloud/text-to-speech');
    const { getGCPCredentials } = await import('@/lib/gcp/config');

    const credentials = getGCPCredentials();
    const client = new TextToSpeechClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
    });

    // Test auth by listing available voices (lightweight operation)
    await client.listVoices({});
    return true;
  } catch {
    return false;
  }
}

async function checkGuidelines(): Promise<boolean> {
  try {
    const { getGuidelinesStats } = await import('@/lib/gcp/guidelines-store');

    // Test Firestore connectivity and collection access
    const stats = await getGuidelinesStats();

    // Should return valid stats object
    return typeof stats === 'object' && typeof stats.total === 'number';
  } catch {
    return false;
  }
}

function checkEnvironment(): boolean {
  try {
    // Attempt to get validated environment
    // If this succeeds, all required environment variables are present and valid
    getEnv();
    return true;
  } catch {
    // Environment validation failed
    return false;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withErrorHandler(async (_request: NextRequest) => {
  const [
    firestoreHealthy,
    vertexAIHealthy,
    embeddingsHealthy,
    speechToTextHealthy,
    textToSpeechHealthy,
    guidelinesHealthy,
    environmentHealthy,
  ] = await Promise.all([
    checkFirestore(),
    checkVertexAI(),
    checkEmbeddings(),
    checkSpeechToText(),
    checkTextToSpeech(),
    checkGuidelines(),
    Promise.resolve(checkEnvironment()),
  ]);

  const services = {
    firestore: firestoreHealthy,
    vertexAI: vertexAIHealthy,
    embeddings: embeddingsHealthy,
    speechToText: speechToTextHealthy,
    textToSpeech: textToSpeechHealthy,
    guidelines: guidelinesHealthy,
    environment: environmentHealthy,
  };

  const healthyCount = Object.values(services).filter(Boolean).length;
  const totalCount = Object.values(services).length;

  const status: HealthStatus = {
    status: healthyCount === totalCount ? 'healthy' : healthyCount > totalCount / 2 ? 'degraded' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services,
    version: process.env.npm_package_version || '0.2.0',
  };

  const responseCode =
    status.status === 'healthy' ? 200 :
    status.status === 'degraded' ? 207 :
    503;

  return successResponse(status, responseCode);
});