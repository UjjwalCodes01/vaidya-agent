/**
 * Zod Validation Schemas for Vaidya-Agent APIs
 * Ensures type safety and input validation across all endpoints
 */

import { z } from 'zod';

// ====================================
// Common Schemas
// ====================================

export const sessionIdSchema = z.string().min(1, 'Session ID is required');

export const abhaAddressSchema = z.string().refine(
  (val) => {
    // Format: username@abdm or 14-digit health ID
    if (val.includes('@')) {
      const [username, domain] = val.split('@');
      return username.length >= 4 && domain === 'abdm';
    }
    return /^\d{14}$/.test(val);
  },
  { message: 'Invalid ABHA address format' }
);

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ====================================
// Agent/Triage Schemas
// ====================================

export const triageRequestSchema = z.object({
  sessionId: sessionIdSchema.optional(),
  symptoms: z.string().min(3, 'Symptoms description required').max(2000),
  patientContext: z.record(z.string(), z.unknown()).optional(),
  abhaAddress: abhaAddressSchema.optional(),
});

export const chatMessageSchema = z.object({
  sessionId: sessionIdSchema.optional(),
  message: z.string().min(1, 'Message cannot be empty').max(5000),
  role: z.enum(['user', 'agent', 'system']).default('user'),
  userId: z.string().optional(),
  abhaAddress: abhaAddressSchema.optional(),
  patientContext: z.record(z.string(), z.unknown()).optional(),
});

export const sessionCreateSchema = z.object({
  userId: z.string().optional(),
  abhaAddress: abhaAddressSchema.optional(),
  initialContext: z.record(z.string(), z.unknown()).optional(),
});

// ====================================
// ABDM Schemas
// ====================================

export const abdmAuthCallbackSchema = z.object({
  code: z.string(),
  state: z.string().optional(),
});

export const hprSearchSchema = z.object({
  hprId: z.string().optional(),
  name: z.string().optional(),
  registrationNumber: z.string().optional(),
  specialization: z.string().optional(),
}).refine(
  (data) => Object.values(data).some((val) => val !== undefined),
  { message: 'At least one search parameter is required' }
);

export const hfrSearchSchema = z.object({
  hfrId: z.string().optional(),
  facilityName: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode').optional(),
  facilityType: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius: z.number().positive().max(100).optional(), // km
}).refine(
  (data) => Object.values(data).some((val) => val !== undefined),
  { message: 'At least one search parameter is required' }
);

export const consentRequestSchema = z.object({
  patientAbhaAddress: abhaAddressSchema,
  purpose: z.enum(['CAREMGT', 'BTG', 'PUBHLTH', 'HPAYMT', 'DSRCH', 'PATRQT']),
  hiTypes: z.array(z.enum(['DiagnosticReport', 'Prescription', 'OPConsultation', 'DischargeSummary', 'ImmunizationRecord', 'HealthDocumentRecord', 'WellnessRecord'])),
  dateRangeFrom: z.string().datetime(),
  dateRangeTo: z.string().datetime(),
  dataEraseAt: z.string().datetime(),
  requesterName: z.string(),
  requesterIdentifier: z.string(),
});

// ====================================
// UHI Schemas
// ====================================

export const uhiDiscoverySchema = z.object({
  intent: z.object({
    fulfillment: z.object({
      type: z.enum(['Teleconsultation', 'Physical']),
      agent: z.object({
        name: z.string().optional(),
      }).optional(),
    }).optional(),
    category: z.object({
      descriptor: z.object({
        name: z.string(), // e.g., "Consultation"
      }),
    }).optional(),
    location: z.object({
      gps: z.string().regex(/^-?\d+\.\d+,-?\d+\.\d+$/, 'Invalid GPS format').optional(),
      city: z.string().optional(),
    }).optional(),
  }),
  context: z.object({
    domain: z.string().default('nic2004:85111'),
    transaction_id: z.string(),
    message_id: z.string(),
  }),
});

export const uhiSelectSchema = z.object({
  provider: z.object({
    id: z.string(),
  }),
  items: z.array(
    z.object({
      id: z.string(),
    })
  ),
  context: z.object({
    domain: z.string(),
    transaction_id: z.string(),
    message_id: z.string(),
  }),
});

export const uhiConfirmSchema = z.object({
  order: z.object({
    provider: z.object({
      id: z.string(),
    }),
    items: z.array(
      z.object({
        id: z.string(),
        quantity: z.number().int().positive().default(1),
      })
    ),
    fulfillment: z.object({
      end: z.object({
        time: z.object({
          timestamp: z.string().datetime(),
        }),
      }),
    }),
    customer: z.object({
      id: abhaAddressSchema,
      cred: z.string(), // ABHA credentials/token
    }),
  }),
  context: z.object({
    domain: z.string(),
    transaction_id: z.string(),
    message_id: z.string(),
  }),
});

// ====================================
// Type Inference Exports
// ====================================

export type TriageRequest = z.infer<typeof triageRequestSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type SessionCreate = z.infer<typeof sessionCreateSchema>;
export type HPRSearch = z.infer<typeof hprSearchSchema>;
export type HFRSearch = z.infer<typeof hfrSearchSchema>;
export type ConsentRequest = z.infer<typeof consentRequestSchema>;
export type UHIDiscovery = z.infer<typeof uhiDiscoverySchema>;
export type UHISelect = z.infer<typeof uhiSelectSchema>;
export type UHIConfirm = z.infer<typeof uhiConfirmSchema>;

// ====================================
// RAG/Guidelines Schemas
// ====================================

export const guidelineSearchSchema = z.object({
  query: z.string().min(3, 'Search query must be at least 3 characters').max(500),
  category: z.enum(['infectious', 'chronic', 'emergency', 'maternal', 'pediatric', 'general']).optional(),
  condition: z.string().optional(),
  topK: z.number().int().min(1).max(20).default(5),
  minSimilarity: z.number().min(0).max(1).default(0.5),
});

export const guidelineUpsertSchema = z.object({
  condition: z.string().min(1),
  category: z.enum(['infectious', 'chronic', 'emergency', 'maternal', 'pediatric', 'general']),
  title: z.string().min(1),
  content: z.string().min(10),
  source: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  region: z.string().optional(),
  keywords: z.array(z.string()),
  severity: z.enum(['low', 'moderate', 'high', 'critical']).optional(),
});

// ====================================
// Speech/Voice Schemas
// ====================================

export const speechToTextSchema = z.object({
  audioContent: z.string().min(1, 'Audio content is required'), // Base64 encoded
  languageCode: z.enum([
    'en-IN', 'hi-IN', 'bn-IN', 'te-IN', 'mr-IN',
    'ta-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'or-IN',
  ]).default('hi-IN'),
  alternativeLanguageCodes: z.array(z.enum([
    'en-IN', 'hi-IN', 'bn-IN', 'te-IN', 'mr-IN',
    'ta-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'or-IN',
  ])).optional(),
  encoding: z.enum(['LINEAR16', 'FLAC', 'MP3', 'OGG_OPUS', 'WEBM_OPUS']).default('WEBM_OPUS'),
  sampleRateHertz: z.number().int().min(8000).max(48000).default(16000),
});

export const textToSpeechSchema = z.object({
  text: z.string().min(1, 'Text is required').max(5000),
  languageCode: z.enum([
    'en-IN', 'hi-IN', 'bn-IN', 'te-IN', 'mr-IN',
    'ta-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'or-IN',
  ]).default('hi-IN'),
  voiceName: z.string().optional(), // e.g., "hi-IN-Wavenet-A"
  speakingRate: z.number().min(0.25).max(4.0).default(1.0),
  pitch: z.number().min(-20).max(20).default(0),
  audioEncoding: z.enum(['MP3', 'LINEAR16', 'OGG_OPUS']).default('MP3'),
});

export const voiceTriageSchema = z.object({
  sessionId: sessionIdSchema.optional(),
  audioContent: z.string().min(1, 'Audio content is required'),
  languageCode: z.enum([
    'en-IN', 'hi-IN', 'bn-IN', 'te-IN', 'mr-IN',
    'ta-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'or-IN',
  ]).default('hi-IN'),
  patientContext: z.record(z.string(), z.unknown()).optional(),
  abhaAddress: abhaAddressSchema.optional(),
  respondWithAudio: z.boolean().default(true),
});

// ====================================
// Type Inference Exports (Phase 2)
// ====================================

export type GuidelineSearch = z.infer<typeof guidelineSearchSchema>;
export type GuidelineUpsert = z.infer<typeof guidelineUpsertSchema>;
export type SpeechToTextRequest = z.infer<typeof speechToTextSchema>;
export type TextToSpeechRequest = z.infer<typeof textToSpeechSchema>;
export type VoiceTriageRequest = z.infer<typeof voiceTriageSchema>;
