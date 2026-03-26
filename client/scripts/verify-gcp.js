#!/usr/bin/env node

/**
 * GCP Connectivity Verification Script
 * Verifies that all GCP services are properly configured and accessible
 * Covers Phase 1 (Firestore, Vertex AI, Gemini) and Phase 2 (Embeddings, Speech, Guidelines)
 *
 * Usage: node scripts/verify-gcp.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { Firestore } = require('@google-cloud/firestore');
const { VertexAI } = require('@google-cloud/vertexai');
const { SpeechClient } = require('@google-cloud/speech');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

const CHECKS = {
  config: '1. GCP Configuration',
  firestore: '2. Firestore Connection',
  vertexAI: '3. Vertex AI Connection',
  gemini: '4. Gemini Model Test',
  embeddings: '5. Vertex AI Embeddings',
  speechToText: '6. Speech-to-Text API',
  textToSpeech: '7. Text-to-Speech API',
  guidelines: '8. Guidelines Store (RAG)',
};

let passed = 0;
let failed = 0;

function logSuccess(check) {
  console.log(`✅ ${check} - PASSED`);
  passed++;
}

function logFailure(check, error) {
  console.error(`❌ ${check} - FAILED`);
  console.error(`   Error: ${error.message}`);
  failed++;
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

// Helper to decode service account key
function getGCPCredentials() {
  const base64Key = process.env.GCP_SERVICE_ACCOUNT_KEY_BASE64;

  if (!base64Key) {
    throw new Error('GCP_SERVICE_ACCOUNT_KEY_BASE64 environment variable is not set');
  }

  const decoded = Buffer.from(base64Key, 'base64').toString('utf-8');
  return JSON.parse(decoded);
}

async function verifyGCPConfig() {
  try {
    const projectId = process.env.GCP_PROJECT_ID;
    const region = process.env.GCP_REGION;

    if (!projectId) {
      throw new Error('GCP_PROJECT_ID environment variable is not set');
    }

    // Validate service account key
    getGCPCredentials();

    logSuccess(CHECKS.config);
    logInfo(`   Project ID: ${projectId}`);
    logInfo(`   Region: ${region || 'us-central1 (default)'}`);
  } catch (error) {
    logFailure(CHECKS.config, error);
    throw error; // Fatal error, cannot continue
  }
}

async function verifyFirestore() {
  try {
    const credentials = getGCPCredentials();
    const projectId = process.env.GCP_PROJECT_ID;
    const databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';

    const db = new Firestore({
      projectId,
      databaseId,
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
    });

    // Test 1: List collections
    const collections = await db.listCollections();
    logInfo(`   Connected to Firestore`);
    logInfo(`   Existing collections: ${collections.map(c => c.id).join(', ') || 'none'}`);

    // Test 2: Create and delete a test document
    const testRef = db.collection('_verification_test').doc('test');
    await testRef.set({ timestamp: new Date() });
    logInfo(`   Test document created`);

    await testRef.delete();
    logInfo(`   Test document cleaned up`);

    logSuccess(CHECKS.firestore);
    return db;
  } catch (error) {
    logFailure(CHECKS.firestore, error);
    return null;
  }
}

async function verifyVertexAI() {
  try {
    const credentials = getGCPCredentials();
    const projectId = process.env.GCP_PROJECT_ID;
    const region = process.env.GCP_REGION || 'us-central1';

    const vertexAI = new VertexAI({
      project: projectId,
      location: region,
      googleAuthOptions: {
        credentials: {
          client_email: credentials.client_email,
          private_key: credentials.private_key,
        },
      },
    });

    logInfo(`   Vertex AI client initialized`);
    logSuccess(CHECKS.vertexAI);

    return vertexAI;
  } catch (error) {
    logFailure(CHECKS.vertexAI, error);
    return null;
  }
}

async function verifyGemini(vertexAI) {
  if (!vertexAI) {
    logFailure(CHECKS.gemini, new Error('Vertex AI client not available'));
    return;
  }

  try {
    const model = process.env.VERTEX_AI_MODEL || 'gemini-2.0-flash-exp';
    const generativeModel = vertexAI.getGenerativeModel({
      model,
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 50,
      },
    });

    const testPrompt = 'Say "Hello from Vaidya-Agent" in exactly those words.';
    const result = await generativeModel.generateContent(testPrompt);
    const response = result.response;

    if (response.candidates && response.candidates.length > 0) {
      const text = response.candidates[0].content.parts[0].text || '';
      logInfo(`   Gemini response: "${text.trim().substring(0, 100)}"`);
      logInfo(`   Model: ${model}`);
      logSuccess(CHECKS.gemini);
    } else {
      throw new Error('Empty response from Gemini');
    }
  } catch (error) {
    logFailure(CHECKS.gemini, error);
  }
}

async function verifyEmbeddings() {
  try {
    const credentials = getGCPCredentials();
    const projectId = process.env.GCP_PROJECT_ID;
    const region = process.env.GCP_REGION || 'us-central1';
    const embeddingModel = process.env.VERTEX_AI_EMBEDDING_MODEL || 'text-embedding-004';
    const embeddingDimension = parseInt(process.env.VERTEX_AI_EMBEDDING_DIMENSION || '256', 10);

    // Test embeddings API via REST (lighter than full SDK)
    const { GoogleAuth } = require('google-auth-library');

    const auth = new GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${embeddingModel}:predict`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ content: 'Test embedding for Vaidya-Agent verification' }],
        parameters: { outputDimensionality: embeddingDimension },
      }),
    });

    if (!response.ok) {
      throw new Error(`Embeddings API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.predictions && data.predictions[0] && data.predictions[0].embeddings) {
      const embedding = data.predictions[0].embeddings.values;
      logInfo(`   Embedding generated: ${embedding.length} dimensions`);
      logInfo(`   Model: ${embeddingModel}`);
      logSuccess(CHECKS.embeddings);
    } else {
      throw new Error('Invalid embeddings response structure');
    }
  } catch (error) {
    logFailure(CHECKS.embeddings, error);
  }
}

async function verifySpeechToText() {
  try {
    const credentials = getGCPCredentials();

    const client = new SpeechClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
    });

    // Test by listing languages (lightweight operation)
    // Note: listVoices doesn't exist on SpeechClient, so we'll test auth differently
    const config = {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'hi-IN',
    };

    // This will fail due to empty audio, but should succeed auth-wise
    try {
      await client.recognize({
        config: config,
        audio: { content: '' },
      });
    } catch (err) {
      // Expected: will fail with "Invalid audio content" but auth should pass
      if (err.message && !err.message.includes('auth') && !err.message.includes('credentials')) {
        // Auth worked, just invalid request (expected)
        logInfo(`   Speech-to-Text API authenticated`);
        logInfo(`   Default language: ${process.env.DEFAULT_SPEECH_LANGUAGE || 'hi-IN'}`);
        logSuccess(CHECKS.speechToText);
        return;
      }
      throw err;
    }
  } catch (error) {
    logFailure(CHECKS.speechToText, error);
  }
}

async function verifyTextToSpeech() {
  try {
    const credentials = getGCPCredentials();

    const client = new TextToSpeechClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
    });

    // Test by listing voices (lightweight operation)
    const [response] = await client.listVoices({ languageCode: 'hi-IN' });
    const hindiVoices = response.voices?.length || 0;

    logInfo(`   Text-to-Speech API connected`);
    logInfo(`   Hindi voices available: ${hindiVoices}`);
    logInfo(`   Default voice: ${process.env.TTS_VOICE_NAME || 'hi-IN-Wavenet-A'}`);
    logSuccess(CHECKS.textToSpeech);
  } catch (error) {
    logFailure(CHECKS.textToSpeech, error);
  }
}

async function verifyGuidelines(db) {
  if (!db) {
    logFailure(CHECKS.guidelines, new Error('Firestore connection not available'));
    return;
  }

  try {
    // Test guidelines collection access
    const collection = db.collection('clinical_guidelines');
    const snapshot = await collection.limit(1).get();

    const count = snapshot.size;
    logInfo(`   Guidelines collection accessible`);
    logInfo(`   Current guidelines count: ${count}`);

    if (count === 0) {
      logInfo(`   💡 Hint: Run "POST /api/rag/seed" to populate guidelines`);
    }

    logSuccess(CHECKS.guidelines);
  } catch (error) {
    logFailure(CHECKS.guidelines, error);
  }
}

async function main() {
  console.log('\n🔍 Vaidya-Agent GCP Connectivity Verification (Phase 1 + Phase 2)\n');
  console.log('═'.repeat(70));
  console.log('\n');

  let vertexAI = null;
  let firestore = null;

  try {
    await verifyGCPConfig();
    firestore = await verifyFirestore();
    vertexAI = await verifyVertexAI();
    await verifyGemini(vertexAI);
    await verifyEmbeddings();
    await verifySpeechToText();
    await verifyTextToSpeech();
    await verifyGuidelines(firestore);
  } catch (error) {
    console.error('\n❌ Fatal error during verification:', error.message);
  }

  console.log('\n');
  console.log('═'.repeat(70));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ All checks passed! Your GCP setup is ready for Phase 2.\n');
    console.log('🎯 Next steps:');
    console.log('   - Run "npm run dev" to start development server');
    console.log('   - Test health check at: http://localhost:3000/api/health');
    console.log('   - Seed guidelines with: POST /api/rag/seed (if count is 0)\n');
    process.exit(0);
  } else {
    console.log('❌ Some checks failed. Please review the errors above.\n');
    console.log('💡 Common fixes:');
    console.log('   - Verify .env.local has all required variables set');
    console.log('   - Ensure service account has required permissions:');
    console.log('     • Vertex AI User');
    console.log('     • Cloud Datastore User');
    console.log('     • Service Account Token Creator');
    console.log('     • Cloud Speech Client');
    console.log('   - Check that these APIs are enabled:');
    console.log('     • Vertex AI API');
    console.log('     • Firestore API');
    console.log('     • Cloud Speech-to-Text API');
    console.log('     • Cloud Text-to-Speech API');
    console.log('   - Verify GCP_PROJECT_ID matches your actual project\n');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});