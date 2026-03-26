/**
 * Voice-Enabled Triage Endpoint
 * POST /api/voice/triage
 *
 * Complete voice-to-voice triage flow:
 * 1. Speech-to-Text (audio -> text)
 * 2. Symptom Triage (text -> assessment)
 * 3. RAG Enhancement (retrieve relevant guidelines)
 * 4. Text-to-Speech (assessment -> audio)
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  parseRequestBody,
  NotFoundError,
} from '@/lib/api-middleware';
import { voiceTriageSchema } from '@/lib/validations';
import { speechToText, textToSpeechSynth, SUPPORTED_LANGUAGES, type SupportedLanguageCode } from '@/lib/gcp/speech';
import { triageSymptoms, generateContent } from '@/lib/gcp/vertex-ai';
import { searchGuidelines } from '@/lib/gcp/guidelines-store';
import {
  createSession,
  getSession,
  updateSession,
  addMessageToSession,
} from '@/lib/gcp/firestore';
import { getEnv } from '@/lib/env';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody(request);
  const validated = voiceTriageSchema.parse(body);

  // Get validated environment configuration
  const env = getEnv();

  // Step 1: Convert speech to text
  const sttResult = await speechToText(validated.audioContent, {
    languageCode: validated.languageCode,
    alternativeLanguageCodes: env.VOICE_TRIAGE_ALT_LANGUAGES as SupportedLanguageCode[],
  });

  if (!sttResult.transcript || sttResult.transcript.trim() === '') {
    return successResponse({
      error: 'NO_SPEECH_DETECTED',
      message: 'Could not detect speech in the audio. Please try again.',
    });
  }

  const symptoms = sttResult.transcript;

  // Step 2: Get or create session
  let sessionId = validated.sessionId;
  if (sessionId) {
    const existing = await getSession(sessionId);
    if (!existing) {
      throw new NotFoundError(`Session ${sessionId}`);
    }
  } else {
    const session = await createSession(undefined, validated.abhaAddress, validated.patientContext);
    sessionId = session.sessionId;
  }

  // Add user message to session
  await addMessageToSession(sessionId, {
    role: 'user',
    content: symptoms,
    timestamp: new Date(),
  });

  // Step 3: Perform triage
  const triageResult = await triageSymptoms(symptoms, validated.patientContext);

  // Step 4: Search for relevant clinical guidelines
  const guidelineResults = await searchGuidelines(symptoms, {
    topK: env.VOICE_TRIAGE_RAG_TOP_K,
    minSimilarity: env.VOICE_TRIAGE_RAG_MIN_SIMILARITY,
  });

  const relevantGuidelines = guidelineResults.map((r) => ({
    title: r.guideline.title,
    condition: r.guideline.condition,
    source: r.guideline.source,
    similarity: r.similarity,
  }));

  // Step 5: Generate enhanced response with guidelines
  const enhancedResponse = await generateEnhancedResponse(
    symptoms,
    triageResult,
    guidelineResults,
    validated.languageCode
  );

  // Step 6: Update session with triage result
  await updateSession(sessionId, {
    lastActivity: new Date(),
    currentSymptoms: symptoms,
  });

  // Add agent response to session
  await addMessageToSession(sessionId, {
    role: 'agent',
    content: enhancedResponse,
    timestamp: new Date(),
    metadata: {
      severity: triageResult.severity,
      suspectedConditions: triageResult.suspectedConditions,
    },
  });

  // Step 7: Convert response to speech if requested
  let audioResponse: { audioContent: string; audioEncoding: string } | null = null;
  if (validated.respondWithAudio) {
    const ttsResult = await textToSpeechSynth(enhancedResponse, {
      languageCode: validated.languageCode,
      audioEncoding: env.VOICE_TRIAGE_AUDIO_ENCODING as 'MP3' | 'LINEAR16' | 'OGG_OPUS',
    });
    audioResponse = {
      audioContent: ttsResult.audioContent,
      audioEncoding: ttsResult.audioEncoding,
    };
  }

  return successResponse({
    sessionId,
    input: {
      transcript: symptoms,
      confidence: sttResult.confidence,
      detectedLanguage: sttResult.languageCode,
      languageName: SUPPORTED_LANGUAGES[sttResult.languageCode as keyof typeof SUPPORTED_LANGUAGES],
    },
    triage: {
      severity: triageResult.severity,
      suspectedConditions: triageResult.suspectedConditions,
      recommendedAction: triageResult.recommendedAction,
      reasoning: triageResult.reasoning,
    },
    guidelines: relevantGuidelines,
    response: {
      text: enhancedResponse,
      audio: audioResponse,
    },
  });
});

/**
 * Generate an enhanced response incorporating guidelines
 */
async function generateEnhancedResponse(
  symptoms: string,
  triageResult: {
    severity: string;
    suspectedConditions: string[];
    recommendedAction: string;
    reasoning: string;
  },
  guidelines: Array<{
    guideline: { title: string; content: string; source: string };
    similarity: number;
  }>,
  languageCode: string
): Promise<string> {
  const guidelineContext = guidelines.length > 0
    ? `\n\nRelevant Clinical Guidelines:\n${guidelines
        .map((g) => `- ${g.guideline.title} (${g.guideline.source}): ${g.guideline.content.slice(0, 500)}...`)
        .join('\n')}`
    : '';

  const languageInstruction = languageCode.startsWith('hi')
    ? 'Respond in simple Hindi using Devanagari script.'
    : languageCode === 'en-IN'
    ? 'Respond in simple English suitable for Indian patients.'
    : `Respond in ${SUPPORTED_LANGUAGES[languageCode as keyof typeof SUPPORTED_LANGUAGES] || 'Hindi'}.`;

  const prompt = `You are a healthcare triage assistant for patients in Northern India.

Patient Symptoms: ${symptoms}

Triage Assessment:
- Severity: ${triageResult.severity}
- Suspected Conditions: ${triageResult.suspectedConditions.join(', ')}
- Recommended Action: ${triageResult.recommendedAction}
- Reasoning: ${triageResult.reasoning}
${guidelineContext}

${languageInstruction}

Generate a brief, empathetic response (2-3 sentences) that:
1. Acknowledges the patient's symptoms
2. Provides the recommended action in simple language
3. Indicates urgency level appropriately (without causing panic)
4. Uses respectful language appropriate for Indian healthcare context

Keep it conversational and easy to understand when spoken aloud.`;

  return generateContent(prompt, { temperature: 0.5, maxOutputTokens: 500 });
}
