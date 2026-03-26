/**
 * Enhanced Healthcare Chat Endpoint with Tool Calling
 * POST /api/agent/chat
 *
 * Phase 3 implementation with ABDM discovery, UHI booking, and M3 consent flow
 * Uses HealthCoordinator for orchestrated tool-calling workflow
 */

import { NextRequest } from 'next/server';
import { SchemaType } from '@google-cloud/vertexai';
import {
  withErrorHandler,
  successResponse,
  parseRequestBody,
  NotFoundError,
} from '@/lib/api-middleware';
import { HealthCoordinator } from '@/lib/agents/coordinator';
import { ABDMRegistryAgent } from '@/lib/agents/abdm-registry';
import { UHIFulfillmentAgent } from '@/lib/agents/uhi-fulfillment';
import { ConsentManager } from '@/lib/abdm/consent-manager';
import { LocationService } from '@/lib/services/location-service';
import { getToolRegistry } from '@/lib/tools/registry';
import {
  validatePatientSearchParams,
  validateFacilitySearchParams,
  validateConsentRequestParams,
  validateUHIDiscoveryParams,
  validateUHIBookingParams,
  validateLocationParams,
  validateDirectionsParams,
  isRecordObject,
} from '@/lib/tools/validators';
import { addMessageToSession, createSession, getSession } from '@/lib/gcp/firestore';
import { chatMessageSchema } from '@/lib/validations';
import { getEnv } from '@/lib/env';

// Initialize specialized agents and services
let abdmAgent: ABDMRegistryAgent;
let uhiAgent: UHIFulfillmentAgent;
let consentManager: ConsentManager;
let locationService: LocationService;

function initializeAgents() {
  if (!abdmAgent) {
    abdmAgent = new ABDMRegistryAgent();
    uhiAgent = new UHIFulfillmentAgent();
    consentManager = new ConsentManager();
    locationService = new LocationService();
  }
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody(request);
  const validated = chatMessageSchema.parse(body);

  // Initialize agents if needed
  initializeAgents();

  // Create or validate session
  let sessionId = validated.sessionId;
  if (sessionId) {
    const existingSession = await getSession(sessionId);
    if (!existingSession) {
      throw new NotFoundError('Session not found');
    }
  } else {
    // Create new session
    const sessionDoc = await createSession(validated.userId, validated.abhaAddress);
    sessionId = sessionDoc.sessionId;
  }

  try {
    // Create coordinator agent for this session
    const coordinator = new HealthCoordinator({
      sessionId,
      enableEmergencyEscalation: true,
      maxToolCallsPerMessage: 5,
      reasoningMode: 'transparent'
    });

    // Register tool implementations with the coordinator
    await registerToolImplementations();

    // Process message with tool calling
    const result = await coordinator.processHealthcareMessage(
      validated.message,
      validated.patientContext
    );

    // Log the interaction
    await addMessageToSession(sessionId, {
      role: 'user',
      content: validated.message,
      timestamp: new Date(),
      metadata: {
        patientContext: validated.patientContext,
        abhaAddress: validated.abhaAddress
      }
    });

    await addMessageToSession(sessionId, {
      role: 'agent',
      content: result.response,
      timestamp: new Date(),
      metadata: {
        toolsExecuted: result.toolsExecuted,
        emergencyDetected: result.emergencyDetected,
        appointmentBooked: result.appointmentBooked,
        consentRequired: result.consentRequired,
        reasoning: result.reasoning,
        nextSteps: result.nextSteps
      }
    });

    return successResponse({
      sessionId,
      response: result.response,
      toolsExecuted: result.toolsExecuted,
      emergencyDetected: result.emergencyDetected,
      appointmentBooked: result.appointmentBooked,
      consentRequired: result.consentRequired,
      reasoning: result.reasoning,
      nextSteps: result.nextSteps,
      toolStats: coordinator.getToolStats()
    });
  } catch (error) {
    // Log error for debugging
    console.error('Healthcare chat error:', error);

    // Add error message to session
    await addMessageToSession(sessionId, {
      role: 'agent',
      content: 'I apologize, but I encountered an issue processing your request. Please try again or contact support if the problem persists.',
      timestamp: new Date(),
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        phase3Error: true
      }
    });

    throw error;
  }
});

/**
 * Registers tool implementations with the coordinator
 * The coordinator uses the shared tool registry for execution
 */
async function registerToolImplementations() {
  const toolRegistry = getToolRegistry();

  // ABDM Tools Implementation
  toolRegistry.registerTool(
    { name: 'search_abdm_patients', description: 'Search ABDM patient registry', parameters: { type: SchemaType.OBJECT, properties: {}, required: [] } },
    {
      execute: async (params: Record<string, unknown>) => {
        const validated = validatePatientSearchParams(params);
        // If validation returned an error, it's a ToolResult
        if ('success' in validated) {
          return validated;
        }
        // Otherwise it's valid PatientSearchParams
        return await abdmAgent.searchPatients(validated);
      },
      timeout: 10000
    },
    'abdm'
  );

  toolRegistry.registerTool(
    { name: 'search_abdm_facilities', description: 'Search ABDM facility registry', parameters: { type: SchemaType.OBJECT, properties: {}, required: [] } },
    {
      execute: async (params: Record<string, unknown>) => {
        const validated = validateFacilitySearchParams(params);
        if ('success' in validated) {
          return validated;
        }
        return await abdmAgent.searchFacilities(validated);
      },
      timeout: 10000
    },
    'abdm'
  );

  toolRegistry.registerTool(
    { name: 'manage_health_consent', description: 'Manage M3 consent workflow', parameters: { type: SchemaType.OBJECT, properties: {}, required: [] } },
    {
      execute: async (params: Record<string, unknown>) => {
        const validated = validateConsentRequestParams(params);
        if ('success' in validated) {
          return validated;
        }
        return await consentManager.initiateConsentRequest(validated);
      },
      timeout: 15000
    },
    'abdm'
  );

  // UHI Tools Implementation
  toolRegistry.registerTool(
    { name: 'discover_healthcare_providers', description: 'Discover UHI providers', parameters: { type: SchemaType.OBJECT, properties: {}, required: [] } },
    {
      execute: async (params: Record<string, unknown>) => {
        const validated = validateUHIDiscoveryParams(params);
        if ('success' in validated) {
          return validated;
        }
        return await uhiAgent.discoverProviders(validated);
      },
      timeout: 10000
    },
    'uhi'
  );

  toolRegistry.registerTool(
    { name: 'select_healthcare_provider', description: 'Select UHI provider', parameters: { type: SchemaType.OBJECT, properties: {}, required: [] } },
    {
      execute: async (params: Record<string, unknown>) => {
        // Extract and validate parameters with type guards
        const providerId = typeof params.providerId === 'string' ? params.providerId : '';
        const itemId = typeof params.itemId === 'string' ? params.itemId : '';
        const transactionId = typeof params.transactionId === 'string' ? params.transactionId : '';
        const patientDetails = isRecordObject(params.patientDetails) ? params.patientDetails : undefined;

        if (!providerId || !itemId || !transactionId) {
          return {
            success: false,
            error: 'Missing required parameters: providerId, itemId, and transactionId are required'
          };
        }

        return await uhiAgent.selectProvider(providerId, itemId, transactionId, patientDetails);
      },
      timeout: 8000
    },
    'uhi'
  );

  toolRegistry.registerTool(
    { name: 'book_healthcare_appointment', description: 'Book UHI appointment', parameters: { type: SchemaType.OBJECT, properties: {}, required: [] } },
    {
      execute: async (params: Record<string, unknown>) => {
        const validated = validateUHIBookingParams(params);
        if ('success' in validated) {
          return validated;
        }
        return await uhiAgent.bookAppointment(validated);
      },
      timeout: 15000
    },
    'uhi'
  );

  // Location Tools Implementation
  toolRegistry.registerTool(
    { name: 'find_nearest_phc', description: 'Find nearest PHCs', parameters: { type: SchemaType.OBJECT, properties: {}, required: [] } },
    {
      execute: async (params: Record<string, unknown>) => {
        const validated = validateLocationParams(params);
        if ('success' in validated) {
          return validated;
        }
        return await locationService.findNearestPHC(validated);
      },
      timeout: 12000
    },
    'location'
  );

  toolRegistry.registerTool(
    { name: 'get_facility_directions', description: 'Get facility directions', parameters: { type: SchemaType.OBJECT, properties: {}, required: [] } },
    {
      execute: async (params: Record<string, unknown>) => {
        const validated = validateDirectionsParams(params);
        if ('success' in validated) {
          return validated;
        }
        return await locationService.getDirectionsToFacility(validated);
      },
      timeout: 8000
    },
    'location'
  );

  // Emergency and Session Tools are handled directly by the coordinator
}

/**
 * GET endpoint to check tool calling capabilities
 */
export const GET = withErrorHandler(async () => {
  const env = getEnv();

  return successResponse({
    phase3Status: 'active',
    toolCallingEnabled: env.GEMINI_ENABLE_FUNCTION_CALLING,
    mockModeEnabled: {
      abdm: env.MOCK_ABDM_RESPONSES,
      uhi: env.MOCK_UHI_RESPONSES
    },
    availableTools: {
      abdm: ['search_abdm_patients', 'search_abdm_facilities', 'manage_health_consent'],
      uhi: ['discover_healthcare_providers', 'select_healthcare_provider', 'book_healthcare_appointment'],
      location: ['find_nearest_phc', 'get_facility_directions'],
      session: ['update_patient_context', 'escalate_emergency']
    },
    capabilities: [
      'Patient discovery via ABDM M1 registry',
      'Facility discovery via ABDM M2 registry',
      'FHIR-compliant consent management (M3)',
      'Healthcare provider discovery via UHI',
      'Appointment booking through UHI network',
      'PHC discovery with Google Maps grounding',
      'Emergency escalation and routing',
      'Transparent reasoning with Gemini 2.5 Pro'
    ]
  });
});