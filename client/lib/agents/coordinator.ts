/**
 * Healthcare Coordinator Agent
 * Main orchestration agent for Vaidya-Agent Phase 3
 * Implements Coordinator Pattern with specialized subagents for ABDM and UHI
 */

import { GeminiChatWithTools, type FunctionCallResult, type ToolImplementation } from '../gcp/vertex-ai';
import { getToolRegistry, type ToolRegistry } from '../tools/registry';
import { ALL_HEALTHCARE_TOOLS } from '../tools/definitions';
import { getSession, updateSession } from '../gcp/firestore';
import type { SessionContext } from '../../types';
import { getEnv } from '../env';
import { isRecordObject } from '../tools/validators';

export interface CoordinatorConfig {
  sessionId: string;
  enableEmergencyEscalation?: boolean;
  maxToolCallsPerMessage?: number;
  reasoningMode?: 'transparent' | 'concise' | 'detailed';
}

export interface HealthcareWorkflowAnalysis {
  emergencyDetected: boolean;
  appointmentBooked: boolean;
  consentRequired: boolean;
  suggestedNextSteps: string[];
}

export interface HealthcareWorkflowResult {
  response: string;
  toolsExecuted: string[];
  emergencyDetected?: boolean;
  appointmentBooked?: boolean;
  consentRequired?: boolean;
  reasoning?: string;
  nextSteps?: string[];
}

/**
 * Main Healthcare Coordinator Agent
 * Orchestrates patient care journey using tool-calling and specialized subagents
 */
export class HealthCoordinator {
  private geminiChat: GeminiChatWithTools;
  private toolRegistry: ToolRegistry;
  private sessionId: string;
  private config: Required<CoordinatorConfig>;

  constructor(config: CoordinatorConfig) {
    this.sessionId = config.sessionId;
    this.config = {
      enableEmergencyEscalation: true,
      maxToolCallsPerMessage: 5,
      reasoningMode: 'transparent',
      ...config
    };

    // Initialize Gemini chat with healthcare-optimized settings
    this.geminiChat = new GeminiChatWithTools({
      model: getEnv().VERTEX_AI_MODEL,
      temperature: 0.3, // Lower temperature for consistent medical reasoning
      maxOutputTokens: 4096,
      topP: 0.95,
      topK: 40
    });

    this.toolRegistry = getToolRegistry();
    this.initializeTools();
  }

  /**
   * Initializes and registers all healthcare tools
   */
  private initializeTools(): void {
    // Register all healthcare tools with their implementations
    // Tool implementations will be created by specialized agents
    for (const tool of ALL_HEALTHCARE_TOOLS) {
      let category: 'abdm' | 'uhi' | 'location' | 'session' | 'emergency';

      if (tool.name.includes('abdm') || tool.name.includes('consent')) {
        category = 'abdm';
      } else if (tool.name.includes('provider') || tool.name.includes('appointment')) {
        category = 'uhi';
      } else if (tool.name.includes('phc') || tool.name.includes('directions')) {
        category = 'location';
      } else if (tool.name.includes('emergency') || tool.name.includes('escalate')) {
        category = 'emergency';
      } else {
        category = 'session';
      }

      // Register tool with placeholder implementation
      // Real implementations will be provided by specialized agents
      const implementation: ToolImplementation = {
        execute: async (parameters) => {
          return await this.routeToolExecution(tool.name, parameters);
        },
        timeout: 30000
      };

      this.toolRegistry.registerTool(tool, implementation, category);
      this.geminiChat.registerTool(tool, implementation);
    }
  }

  /**
   * Routes tool execution to registered tool implementations
   */
  private async routeToolExecution(toolName: string, parameters: Record<string, unknown>) {
    try {
      // Create a tool call object for the registry
      const toolCall = {
        toolName,
        parameters
      };

      // Use the registry to execute the tool with proper validation and error handling
      const result = await this.toolRegistry.executeTool(toolCall);

      // If tool not found in registry, check for built-in coordinator tools
      if (!result.success && result.error?.includes('not found in registry')) {
        if (toolName.includes('emergency') || toolName.includes('escalate')) {
          return await this.handleEmergencyTool(toolName, parameters);
        } else if (toolName.includes('session') || toolName.includes('context')) {
          return await this.handleSessionTool(toolName, parameters);
        }
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown routing error'
      };
    }
  }

  /**
   * Handles emergency escalation tools
   */
  private async handleEmergencyTool(toolName: string, parameters: Record<string, unknown>) {
    if (toolName === 'escalate_emergency') {
      // Mark emergency in session context
      const session = await getSession(this.sessionId);
      if (session) {
        const updatedContext = {
          ...session.context,
          emergencyEscalated: true,
          emergencyType: parameters.emergencyType,
          emergencySymptoms: parameters.symptoms,
          lastActivity: new Date()
        };

        await updateSession(this.sessionId, updatedContext);
      }

      return {
        success: true,
        data: {
          emergencyId: `EMG_${Date.now()}`,
          status: 'escalated',
          message: `Emergency escalation initiated for ${parameters.emergencyType}`,
          nextSteps: [
            'Contacting nearest emergency services',
            'Dispatching ambulance if location provided',
            'Notifying emergency contact',
            'Preparing medical history for first responders'
          ]
        }
      };
    }

    return {
      success: false,
      error: `Emergency tool ${toolName} not implemented`
    };
  }

  /**
   * Handles session management tools
   */
  private async handleSessionTool(toolName: string, parameters: Record<string, unknown>) {
    if (toolName === 'update_patient_context') {
      const { sessionId, updates } = parameters;

      // Type guards
      if (typeof sessionId !== 'string') {
        return {
          success: false,
          error: 'Invalid sessionId: must be a string'
        };
      }

      if (!updates || !isRecordObject(updates)) {
        return {
          success: false,
          error: 'Invalid updates: must be an object'
        };
      }

      try {
        const session = await getSession(sessionId);
        if (!session) {
          return {
            success: false,
            error: 'Session not found'
          };
        }

        const updatedContext = {
          ...session.context,
          ...updates,
          lastActivity: new Date()
        };

        await updateSession(sessionId, updatedContext);

        return {
          success: true,
          data: {
            sessionId,
            updatedFields: Object.keys(updates),
            message: 'Patient context updated successfully'
          }
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to update session: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }

    return {
      success: false,
      error: `Session tool ${toolName} not implemented`
    };
  }

  /**
   * Processes a healthcare message with coordinated tool calling
   */
  async processHealthcareMessage(
    message: string,
    patientContext?: Record<string, unknown>
  ): Promise<HealthcareWorkflowResult> {
    try {
      // Load session context
      const session = await getSession(this.sessionId);
      const context = session?.context || {};

      // Enhance the prompt with healthcare-specific context and reasoning instructions
      const enhancedPrompt = this.buildHealthcarePrompt(message, context, patientContext);

      // Execute with tool calling
      const result = await this.geminiChat.sendMessageWithTools(enhancedPrompt);

      // Analyze results for healthcare-specific workflow indicators
      const workflowAnalysis = this.analyzeHealthcareWorkflow(result);

      // Update session with conversation and results
      await this.updateSessionWithResults(result, workflowAnalysis);

      return {
        response: result.text,
        toolsExecuted: result.toolCalls?.map(tc => tc.toolName) || [],
        emergencyDetected: workflowAnalysis.emergencyDetected,
        appointmentBooked: workflowAnalysis.appointmentBooked,
        consentRequired: workflowAnalysis.consentRequired,
        reasoning: result.reasoning,
        nextSteps: workflowAnalysis.suggestedNextSteps
      };
    } catch (error) {
      throw new Error(
        `Healthcare workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Builds healthcare-optimized prompt with context and reasoning instructions
   */
  private buildHealthcarePrompt(
    message: string,
    sessionContext: Record<string, unknown> | undefined,
    patientContext?: Record<string, unknown>
  ): string {
    const contextString = sessionContext ? `\n\nSession Context:\n${JSON.stringify(sessionContext, null, 2)}` : '';
    const patientString = patientContext ? `\n\nPatient Information:\n${JSON.stringify(patientContext, null, 2)}` : '';

    return `
<thinking>
You are Vaidya-Agent, a comprehensive healthcare coordination AI for the Northern India corridor.

Analyze this healthcare interaction step by step:
1. Identify the medical concern, symptoms, and urgency level
2. Determine what information is needed (patient demographics, location, medical history)
3. Plan which tools to use and in what sequence:
   - ABDM tools for patient/facility discovery and consent management
   - UHI tools for provider discovery and appointment booking
   - Location tools for finding nearby Primary Health Centers (PHCs)
   - Session tools for context management
   - Emergency tools if critical symptoms are detected

4. Consider Indian healthcare context:
   - Common conditions: dengue, TB, malaria, typhoid, diabetes, hypertension
   - Resource constraints: limited access to specialists, diagnostic facilities
   - Language preferences: Hindi, English, regional languages
   - Cultural factors: family involvement in healthcare decisions

5. Assess ABDM compliance needs:
   - M1: Patient identification and registry lookup
   - M2: Healthcare facility and provider discovery
   - M3: Consent management for health data access

6. Provide transparent reasoning for all recommendations
7. If emergency symptoms detected, prioritize immediate escalation
</thinking>

IMPORTANT CONTEXT:
- You have access to ABDM (Ayushman Bharat Digital Mission) registry for patient and facility lookup
- UHI (Unified Health Interface) network for appointment booking
- Google Maps integration for Primary Health Center discovery
- All data exchange must be FHIR-compliant and require proper consent
- Emergency cases bypass normal triage for immediate attention

AVAILABLE TOOLS: Use the function calling capabilities to:
- Search patients and facilities through ABDM registry
- Discover healthcare providers through UHI network
- Find nearest PHCs and get directions
- Manage patient context and emergency escalation
- Handle consent management for data access

Patient Message: ${message}${contextString}${patientString}

Provide a comprehensive healthcare response that:
1. Addresses the patient's immediate concern
2. Uses appropriate tools for information gathering and service coordination
3. Follows Indian healthcare protocols and cultural norms
4. Ensures ABDM compliance for all data exchanges
5. Provides clear next steps and actionable recommendations

Remember: If you detect ANY emergency symptoms (severe chest pain, difficulty breathing, severe bleeding, loss of consciousness, etc.), immediately use the escalate_emergency tool and provide urgent care instructions.
`;
  }

  /**
   * Analyzes the workflow results for healthcare-specific indicators
   */
  private analyzeHealthcareWorkflow(result: FunctionCallResult): HealthcareWorkflowAnalysis {
    const toolsExecuted = result.toolCalls?.map(tc => tc.toolName) || [];

    return {
      emergencyDetected: toolsExecuted.includes('escalate_emergency'),
      appointmentBooked: toolsExecuted.includes('book_healthcare_appointment'),
      consentRequired: toolsExecuted.includes('manage_health_consent'),
      suggestedNextSteps: this.generateNextSteps(toolsExecuted, result.text)
    };
  }

  /**
   * Generates contextual next steps based on workflow execution
   */
  private generateNextSteps(toolsExecuted: string[], response: string): string[] {
    const steps: string[] = [];

    if (toolsExecuted.includes('search_abdm_facilities')) {
      steps.push('Review recommended healthcare facilities');
    }
    if (toolsExecuted.includes('discover_healthcare_providers')) {
      steps.push('Select preferred healthcare provider');
    }
    if (toolsExecuted.includes('manage_health_consent')) {
      steps.push('Complete consent verification via ABHA OTP');
    }
    if (toolsExecuted.includes('book_healthcare_appointment')) {
      steps.push('Confirm appointment details and payment method');
    }
    if (toolsExecuted.includes('find_nearest_phc')) {
      steps.push('Get directions to selected healthcare facility');
    }

    // Add default steps if no specific tools were executed
    if (steps.length === 0) {
      if (response.toLowerCase().includes('symptom')) {
        steps.push('Complete symptom assessment');
        steps.push('Find nearby healthcare facilities');
      }
      steps.push('Continue healthcare conversation for more assistance');
    }

    return steps;
  }

  /**
   * Updates session with workflow results
   */
  private async updateSessionWithResults(
    result: FunctionCallResult,
    analysis: HealthcareWorkflowAnalysis
  ): Promise<void> {
    try {
      const session = await getSession(this.sessionId);
      if (!session) return;

      const updatedContext = {
        ...session.context,
        lastToolsExecuted: result.toolCalls?.map(tc => tc.toolName) || [],
        emergencyStatus: analysis.emergencyDetected,
        appointmentStatus: analysis.appointmentBooked,
        consentStatus: analysis.consentRequired,
        lastReasoning: result.reasoning,
        lastActivity: new Date()
      };

      await updateSession(this.sessionId, updatedContext);
    } catch (error) {
      console.error('Failed to update session with workflow results:', error);
    }
  }

  /**
   * Gets current session context
   */
  async getSessionContext(): Promise<SessionContext | null> {
    const session = await getSession(this.sessionId);
    return session?.context || null;
  }

  /**
   * Gets tool execution statistics
   */
  getToolStats() {
    return this.toolRegistry.getExecutionStats();
  }

  /**
   * Clears conversation history (for testing)
   */
  clearHistory(): void {
    this.geminiChat.clearHistory();
  }
}