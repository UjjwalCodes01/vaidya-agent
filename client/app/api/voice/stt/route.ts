/**
 * Speech-to-Text Endpoint
 * POST /api/voice/stt
 *
 * Converts speech audio to text with support for Hindi and regional dialects
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, parseRequestBody } from '@/lib/api-middleware';
import { speechToTextSchema } from '@/lib/validations';
import { speechToText, SUPPORTED_LANGUAGES } from '@/lib/gcp/speech';
import { getEnv } from '@/lib/env';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody(request);
  const validated = speechToTextSchema.parse(body);

  const result = await speechToText(validated.audioContent, {
    languageCode: validated.languageCode,
    alternativeLanguageCodes: validated.alternativeLanguageCodes,
    encoding: validated.encoding,
    sampleRateHertz: validated.sampleRateHertz,
  });

  return successResponse({
    transcript: result.transcript,
    confidence: result.confidence,
    languageCode: result.languageCode,
    languageName: SUPPORTED_LANGUAGES[result.languageCode as keyof typeof SUPPORTED_LANGUAGES] || result.languageCode,
    alternatives: result.alternatives,
  });
});

// GET endpoint to list supported languages
export const GET = withErrorHandler(async () => {
  return successResponse({
    supportedLanguages: SUPPORTED_LANGUAGES,
    defaultLanguage: getEnv().DEFAULT_SPEECH_LANGUAGE,
  });
});
