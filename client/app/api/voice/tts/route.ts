/**
 * Text-to-Speech Endpoint
 * POST /api/voice/tts
 *
 * Converts text to speech audio with support for Hindi and regional dialects
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, parseRequestBody } from '@/lib/api-middleware';
import { textToSpeechSchema } from '@/lib/validations';
import { textToSpeechSynth, listVoices, SUPPORTED_LANGUAGES } from '@/lib/gcp/speech';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody(request);
  const validated = textToSpeechSchema.parse(body);

  const result = await textToSpeechSynth(validated.text, {
    languageCode: validated.languageCode,
    voiceName: validated.voiceName,
    speakingRate: validated.speakingRate,
    pitch: validated.pitch,
    audioEncoding: validated.audioEncoding,
  });

  return successResponse({
    audioContent: result.audioContent,
    audioEncoding: result.audioEncoding,
    sampleRateHertz: result.sampleRateHertz,
    mimeType: getMimeType(validated.audioEncoding),
  });
});

// GET endpoint to list available voices
export const GET = withErrorHandler(async (request: NextRequest) => {
  const languageCode = request.nextUrl.searchParams.get('language') as keyof typeof SUPPORTED_LANGUAGES | null;

  const voices = await listVoices(languageCode || undefined);

  return successResponse({
    voices,
    supportedLanguages: SUPPORTED_LANGUAGES,
  });
});

function getMimeType(encoding: string): string {
  switch (encoding) {
    case 'MP3':
      return 'audio/mpeg';
    case 'LINEAR16':
      return 'audio/wav';
    case 'OGG_OPUS':
      return 'audio/ogg';
    default:
      return 'audio/mpeg';
  }
}
