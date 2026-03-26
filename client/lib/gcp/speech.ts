/**
 * Google Cloud Speech Services
 * Speech-to-Text and Text-to-Speech for voice-enabled triage
 * Supports Hindi and regional Indian dialects
 */

import { SpeechClient, protos as speechProtos } from '@google-cloud/speech';
import { TextToSpeechClient, protos as ttsProtos } from '@google-cloud/text-to-speech';
import { getGCPCredentials } from './config';
import { getEnv } from '../env';

let speechClient: SpeechClient | null = null;
let ttsClient: TextToSpeechClient | null = null;

// Supported languages for Indian healthcare context
export const SUPPORTED_LANGUAGES = {
  'en-IN': 'English (India)',
  'hi-IN': 'Hindi',
  'bn-IN': 'Bengali',
  'te-IN': 'Telugu',
  'mr-IN': 'Marathi',
  'ta-IN': 'Tamil',
  'gu-IN': 'Gujarati',
  'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam',
  'pa-IN': 'Punjabi',
  'or-IN': 'Odia',
} as const;

export type SupportedLanguageCode = keyof typeof SUPPORTED_LANGUAGES;

// Default language from environment
const DEFAULT_LANGUAGE = getEnv().DEFAULT_SPEECH_LANGUAGE as SupportedLanguageCode;

// TTS voice settings from environment
const env = getEnv();
const TTS_VOICE_NAME = env.TTS_VOICE_NAME;
const TTS_SPEAKING_RATE = env.TTS_SPEAKING_RATE;
const TTS_PITCH = env.TTS_PITCH;

// Audio encoding enums
const AudioEncoding = speechProtos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding;
const TTSAudioEncoding = ttsProtos.google.cloud.texttospeech.v1.AudioEncoding;
const SsmlVoiceGender = ttsProtos.google.cloud.texttospeech.v1.SsmlVoiceGender;

/**
 * Returns singleton Speech-to-Text client
 */
function getSpeechClient(): SpeechClient {
  if (!speechClient) {
    const credentials = getGCPCredentials();

    speechClient = new SpeechClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
    });
  }

  return speechClient;
}

/**
 * Returns singleton Text-to-Speech client
 */
function getTTSClient(): TextToSpeechClient {
  if (!ttsClient) {
    const credentials = getGCPCredentials();

    ttsClient = new TextToSpeechClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
    });
  }

  return ttsClient;
}

/**
 * Speech recognition result
 */
export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  languageCode: string;
  alternatives?: Array<{
    transcript: string;
    confidence: number;
  }>;
}

/**
 * Speech-to-Text configuration
 */
export interface STTConfig {
  languageCode?: SupportedLanguageCode;
  alternativeLanguageCodes?: SupportedLanguageCode[];
  enableAutomaticPunctuation?: boolean;
  enableWordTimeOffsets?: boolean;
  model?: string;
  sampleRateHertz?: number;
  encoding?: 'LINEAR16' | 'FLAC' | 'MP3' | 'OGG_OPUS' | 'WEBM_OPUS';
}

/**
 * Map encoding string to enum value
 */
function getAudioEncoding(encoding: string): number {
  const encodingMap: Record<string, number> = {
    'LINEAR16': AudioEncoding.LINEAR16,
    'FLAC': AudioEncoding.FLAC,
    'MP3': AudioEncoding.MP3,
    'OGG_OPUS': AudioEncoding.OGG_OPUS,
    'WEBM_OPUS': AudioEncoding.WEBM_OPUS,
  };
  return encodingMap[encoding] || AudioEncoding.WEBM_OPUS;
}

/**
 * Convert speech audio to text
 * @param audioContent - Base64-encoded audio content
 * @param config - Speech recognition configuration
 */
export async function speechToText(
  audioContent: string,
  config: STTConfig = {}
): Promise<SpeechRecognitionResult> {
  const client = getSpeechClient();

  const {
    languageCode = DEFAULT_LANGUAGE,
    alternativeLanguageCodes = ['en-IN'],
    enableAutomaticPunctuation = true,
    enableWordTimeOffsets = false,
    model = 'latest_long',
    sampleRateHertz = 16000,
    encoding = 'WEBM_OPUS',
  } = config;

  const request: speechProtos.google.cloud.speech.v1.IRecognizeRequest = {
    config: {
      encoding: getAudioEncoding(encoding),
      sampleRateHertz,
      languageCode,
      alternativeLanguageCodes: alternativeLanguageCodes.filter((code) => code !== languageCode),
      enableAutomaticPunctuation,
      enableWordTimeOffsets,
      model,
      useEnhanced: true,
    },
    audio: {
      content: audioContent,
    },
  };

  const [response] = await client.recognize(request);

  if (!response.results || response.results.length === 0) {
    return {
      transcript: '',
      confidence: 0,
      languageCode,
    };
  }

  const result = response.results[0];
  const alternative = result.alternatives?.[0];

  if (!alternative) {
    return {
      transcript: '',
      confidence: 0,
      languageCode,
    };
  }

  return {
    transcript: alternative.transcript || '',
    confidence: alternative.confidence || 0,
    languageCode: result.languageCode || languageCode,
    alternatives: result.alternatives?.slice(1).map((alt: speechProtos.google.cloud.speech.v1.ISpeechRecognitionAlternative) => ({
      transcript: alt.transcript || '',
      confidence: alt.confidence || 0,
    })),
  };
}

/**
 * Text-to-Speech configuration
 */
export interface TTSConfig {
  languageCode?: SupportedLanguageCode;
  voiceName?: string;
  speakingRate?: number;
  pitch?: number;
  audioEncoding?: 'MP3' | 'LINEAR16' | 'OGG_OPUS';
  ssmlGender?: 'NEUTRAL' | 'MALE' | 'FEMALE';
}

/**
 * Text-to-Speech result
 */
export interface TTSResult {
  audioContent: string; // Base64-encoded audio
  audioEncoding: string;
  sampleRateHertz: number;
}

/**
 * Map TTS encoding string to enum value
 */
function getTTSAudioEncoding(encoding: string): number {
  const encodingMap: Record<string, number> = {
    'MP3': TTSAudioEncoding.MP3,
    'LINEAR16': TTSAudioEncoding.LINEAR16,
    'OGG_OPUS': TTSAudioEncoding.OGG_OPUS,
  };
  return encodingMap[encoding] || TTSAudioEncoding.MP3;
}

/**
 * Map gender string to enum value
 */
function getSsmlGender(gender: string): number {
  const genderMap: Record<string, number> = {
    'NEUTRAL': SsmlVoiceGender.NEUTRAL,
    'MALE': SsmlVoiceGender.MALE,
    'FEMALE': SsmlVoiceGender.FEMALE,
  };
  return genderMap[gender] || SsmlVoiceGender.NEUTRAL;
}

/**
 * Convert text to speech audio
 * @param text - Text to synthesize (can be plain text or SSML)
 * @param config - TTS configuration
 */
export async function textToSpeechSynth(
  text: string,
  config: TTSConfig = {}
): Promise<TTSResult> {
  const client = getTTSClient();

  const {
    languageCode = DEFAULT_LANGUAGE,
    voiceName = TTS_VOICE_NAME,
    speakingRate = TTS_SPEAKING_RATE,
    pitch = TTS_PITCH,
    audioEncoding = 'MP3',
    ssmlGender = 'NEUTRAL',
  } = config;

  // Detect if text is SSML
  const isSSML = text.trim().startsWith('<speak');

  const request: ttsProtos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
    input: isSSML ? { ssml: text } : { text },
    voice: {
      languageCode,
      name: voiceName,
      ssmlGender: getSsmlGender(ssmlGender),
    },
    audioConfig: {
      audioEncoding: getTTSAudioEncoding(audioEncoding),
      speakingRate,
      pitch,
    },
  };

  const [response] = await client.synthesizeSpeech(request);

  if (!response.audioContent) {
    throw new Error('No audio content generated');
  }

  // Convert Uint8Array to Base64
  const audioBase64 = Buffer.from(response.audioContent).toString('base64');

  return {
    audioContent: audioBase64,
    audioEncoding,
    sampleRateHertz: 24000,
  };
}

/**
 * List available voices for a language
 */
export async function listVoices(languageCode?: SupportedLanguageCode): Promise<Array<{
  name: string;
  languageCodes: string[];
  ssmlGender: string;
  naturalSampleRateHertz: number;
}>> {
  const client = getTTSClient();

  const [response] = await client.listVoices({
    languageCode: languageCode,
  });

  return (response.voices || [])
    .filter((voice: ttsProtos.google.cloud.texttospeech.v1.IVoice) => {
      // Filter to only Indian languages if no specific language requested
      if (!languageCode) {
        return voice.languageCodes?.some((code: string) => code.endsWith('-IN'));
      }
      return true;
    })
    .map((voice: ttsProtos.google.cloud.texttospeech.v1.IVoice) => ({
      name: voice.name || '',
      languageCodes: voice.languageCodes || [],
      ssmlGender: voice.ssmlGender?.toString() || 'NEUTRAL',
      naturalSampleRateHertz: voice.naturalSampleRateHertz || 24000,
    }));
}

/**
 * Validate if a language code is supported
 */
export function isLanguageSupported(languageCode: string): languageCode is SupportedLanguageCode {
  return languageCode in SUPPORTED_LANGUAGES;
}

export { DEFAULT_LANGUAGE, TTS_VOICE_NAME };
