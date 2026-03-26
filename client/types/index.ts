/**
 * Core TypeScript type definitions for Vaidya-Agent
 * These types align with ABDM, UHI, and FHIR standards
 */

// ====================================
// ABDM Types (Milestone M1, M2, M3)
// ====================================

export interface ABDMConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

export interface ABHAAddress {
  healthId: string;
  name: string;
  dayOfBirth: string;
  monthOfBirth: string;
  yearOfBirth: string;
  gender: "M" | "F" | "O";
  mobile?: string;
  email?: string;
  address?: string;
  stateCode?: string;
  districtCode?: string;
}

export interface HealthProfessional {
  hprId: string;
  name: string;
  registrationNumber: string;
  system: string;
  specialization?: string[];
  verified: boolean;
}

export interface HealthFacility {
  hfrId: string;
  facilityName: string;
  facilityType: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  contact?: string;
}

export interface ConsentRequest {
  requestId: string;
  purpose: string;
  patient: {
    id: string;
  };
  hiu: {
    id: string;
  };
  requester: {
    name: string;
    identifier: {
      type: string;
      value: string;
      system: string;
    };
  };
  hiTypes: string[];
  permission: {
    accessMode: string;
    dateRange: {
      from: string;
      to: string;
    };
    dataEraseAt: string;
    frequency: {
      unit: string;
      value: number;
      repeats: number;
    };
  };
}

// ====================================
// UHI Types
// ====================================

export interface UHIProvider {
  id: string;
  descriptor: {
    name: string;
    short_desc?: string;
    long_desc?: string;
  };
  locations?: UHILocation[];
}

export interface UHILocation {
  id: string;
  gps: string;
  address: string;
  city: string;
  state: string;
}

export interface UHIServiceRequest {
  context: {
    domain: string;
    action: string;
    timestamp: string;
    message_id: string;
    transaction_id: string;
  };
  message: {
    intent?: {
      fulfillment?: {
        type: string;
        agent?: {
          name: string;
        };
      };
    };
  };
}

// ====================================
// Agent Types
// ====================================

export interface AgentSession {
  sessionId: string;
  userId?: string;
  abhaAddress?: string;
  createdAt: Date;
  updatedAt: Date;
  context: SessionContext;
}

export interface SessionContext {
  conversationHistory: Message[];
  currentIntent?: string;
  currentSymptoms?: string;
  extractedSymptoms?: string[];
  suspectedConditions?: string[];
  suggestedFacilities?: HealthFacility[];
  lastActivity: Date;
}

export interface Message {
  role: "user" | "agent" | "system";
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface TriageResult {
  severity: "low" | "moderate" | "high" | "critical";
  suspectedConditions: string[];
  recommendedAction: string;
  requiresEmergency: boolean;
  reasoning?: string;
}

// ====================================
// GCP/Vertex AI Types
// ====================================

export interface VertexAIConfig {
  projectId: string;
  region: string;
  model: string;
}

export interface GeminiRequest {
  contents: {
    role: string;
    parts: Array<{
      text: string;
    }>;
  }[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      role: string;
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

// ====================================
// Tool Calling Types
// ====================================

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface ToolCall {
  toolName: string;
  parameters: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  retryAllowed?: boolean;
  attemptsRemaining?: number;
}

// ====================================
// API Response Types
// ====================================

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}
