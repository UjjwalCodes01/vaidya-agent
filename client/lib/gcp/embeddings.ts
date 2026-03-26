/**
 * Vertex AI Embeddings for RAG Pipeline
 * Generates embeddings for clinical guidelines retrieval
 * Uses the Vertex AI Prediction API for text embeddings
 */

import { getGCPCredentials, getGCPConfig } from './config';
import { getEnv } from '@/lib/env';

// Google Auth for making authenticated requests
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Get access token for API calls
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 300000) {
    return cachedAccessToken.token;
  }

  const credentials = getGCPCredentials();
  const { GoogleAuth } = await import('google-auth-library');

  const auth = new GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();

  if (!tokenResponse.token) {
    throw new Error('Failed to get access token');
  }

  cachedAccessToken = {
    token: tokenResponse.token,
    expiresAt: Date.now() + 3600000, // 1 hour
  };

  return tokenResponse.token;
}

/**
 * Get API endpoint for embeddings
 */
function getEmbeddingEndpoint(): string {
  const { projectId, region } = getGCPConfig();
  const env = getEnv();
  return `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${env.VERTEX_AI_EMBEDDING_MODEL}:predict`;
}

interface EmbeddingInstance {
  content: string;
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING';
}

interface EmbeddingPrediction {
  embeddings: {
    values: number[];
    statistics: {
      truncated: boolean;
      tokenCount: number;
    };
  };
}

interface EmbeddingResponse {
  predictions: EmbeddingPrediction[];
}

/**
 * Call Vertex AI embeddings API
 */
async function callEmbeddingsAPI(instances: EmbeddingInstance[]): Promise<EmbeddingResponse> {
  const token = await getAccessToken();
  const endpoint = getEmbeddingEndpoint();
  const env = getEnv();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances,
      parameters: {
        outputDimensionality: env.VERTEX_AI_EMBEDDING_DIMENSION,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embeddings API error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<EmbeddingResponse>;
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await callEmbeddingsAPI([
    { content: text, taskType: 'RETRIEVAL_DOCUMENT' },
  ]);

  if (!response.predictions || response.predictions.length === 0) {
    throw new Error('No embedding generated');
  }

  return response.predictions[0].embeddings.values;
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const instances: EmbeddingInstance[] = texts.map((text) => ({
    content: text,
    taskType: 'RETRIEVAL_DOCUMENT' as const,
  }));

  const response = await callEmbeddingsAPI(instances);

  if (!response.predictions || response.predictions.length === 0) {
    throw new Error('No embeddings generated');
  }

  return response.predictions.map((p) => p.embeddings.values);
}

/**
 * Generate embedding for query (uses RETRIEVAL_QUERY task type)
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const response = await callEmbeddingsAPI([
    { content: query, taskType: 'RETRIEVAL_QUERY' },
  ]);

  if (!response.predictions || response.predictions.length === 0) {
    throw new Error('No embedding generated');
  }

  return response.predictions[0].embeddings.values;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function getEmbeddingModel(): string {
  return getEnv().VERTEX_AI_EMBEDDING_MODEL;
}

export function getEmbeddingDimension(): number {
  return getEnv().VERTEX_AI_EMBEDDING_DIMENSION;
}
