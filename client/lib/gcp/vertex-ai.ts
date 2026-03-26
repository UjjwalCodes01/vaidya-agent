/**
 * Vertex AI Client Wrapper for Gemini 2.5 Pro
 * Provides a simplified interface for agent reasoning and tool calling
 */

import { VertexAI, SchemaType, type FunctionDeclarationSchemaProperty } from '@google-cloud/vertexai';
import { getGCPCredentials, getGCPConfig } from './config';
import { getEnv } from '../env';
import type { ToolCall, ToolResult } from '../../types';

let vertexAIInstance: VertexAI | null = null;

/**
 * Returns a singleton Vertex AI instance
 */
export function getVertexAI(): VertexAI {
  if (!vertexAIInstance) {
    const credentials = getGCPCredentials();
    const { projectId, region } = getGCPConfig();

    vertexAIInstance = new VertexAI({
      project: projectId,
      location: region,
      googleAuthOptions: {
        credentials: {
          client_email: credentials.client_email,
          private_key: credentials.private_key,
        },
      },
    });
  }

  return vertexAIInstance;
}

/**
 * Configuration for Gemini model
 */
export interface GeminiConfig {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

/**
 * Function calling configuration and types
 */
export interface ToolFunction {
  name: string;
  description: string;
  parameters: {
    type: SchemaType;
    properties: { [k: string]: FunctionDeclarationSchemaProperty };
    required: string[];
  };
}

export interface FunctionCallResult {
  text: string;
  toolCalls?: ToolCall[];
  reasoning?: string;
  finishReason?: string;
}

export interface ToolImplementation {
  execute: (parameters: Record<string, unknown>) => Promise<ToolResult>;
  timeout?: number;
}

const DEFAULT_CONFIG: Required<GeminiConfig> = {
  model: getEnv().VERTEX_AI_MODEL,
  temperature: 0.7,
  maxOutputTokens: 8192,
  topP: 0.95,
  topK: 40,
};

/**
 * Generates content using Gemini model
 */
export async function generateContent(
  prompt: string,
  config: GeminiConfig = {}
): Promise<string> {
  const vertexAI = getVertexAI();
  const modelConfig = { ...DEFAULT_CONFIG, ...config };

  const generativeModel = vertexAI.getGenerativeModel({
    model: modelConfig.model,
    generationConfig: {
      temperature: modelConfig.temperature,
      maxOutputTokens: modelConfig.maxOutputTokens,
      topP: modelConfig.topP,
      topK: modelConfig.topK,
    },
  });

  const result = await generativeModel.generateContent(prompt);
  const response = result.response;

  if (!response.candidates || response.candidates.length === 0) {
    throw new Error('No response generated from Gemini');
  }

  const candidate = response.candidates[0];
  if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
    throw new Error('Invalid response structure from Gemini');
  }

  return candidate.content.parts[0].text || '';
}

/**
 * Chat interface for multi-turn conversations
 */
export interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export class GeminiChat {
  protected vertexAI: VertexAI;
  protected model: string;
  protected config: Required<GeminiConfig>;
  protected history: ChatMessage[] = [];

  constructor(config: GeminiConfig = {}) {
    this.vertexAI = getVertexAI();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.model = this.config.model;
  }

  /**
   * Sends a message and gets a response
   */
  async sendMessage(message: string): Promise<string> {
    const generativeModel = this.vertexAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
        topP: this.config.topP,
        topK: this.config.topK,
      },
    });

    const chat = generativeModel.startChat({
      history: this.history,
    });

    const result = await chat.sendMessage(message);
    const response = result.response;

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No response generated from Gemini');
    }

    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error('Invalid response structure from Gemini');
    }

    const responseText = candidate.content.parts[0].text || '';

    // Update history
    this.history.push(
      { role: 'user', parts: [{ text: message }] },
      { role: 'model', parts: [{ text: responseText }] }
    );

    return responseText;
  }

  /**
   * Clears conversation history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Gets current conversation history
   */
  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  /**
   * Sets conversation history (for session restoration)
   */
  setHistory(history: ChatMessage[]): void {
    this.history = history;
  }
}

/**
 * Enhanced Gemini Chat with Function Calling Support
 */
export class GeminiChatWithTools extends GeminiChat {
  private tools: ToolFunction[] = [];
  private toolImplementations: Map<string, ToolImplementation> = new Map();

  constructor(config: GeminiConfig = {}) {
    super(config);
  }

  /**
   * Registers a tool with its implementation
   */
  registerTool(tool: ToolFunction, implementation: ToolImplementation): void {
    this.tools.push(tool);
    this.toolImplementations.set(tool.name, implementation);
  }

  /**
   * Executes a tool call with error handling and timeout
   */
  private async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    const implementation = this.toolImplementations.get(toolCall.toolName);

    if (!implementation) {
      return {
        success: false,
        error: `Tool '${toolCall.toolName}' not found`
      };
    }

    const env = getEnv();
    const timeout = implementation.timeout || env.TOOL_CALLING_TIMEOUT_MS;

    try {
      const timeoutPromise = new Promise<ToolResult>((_, reject) => {
        setTimeout(() => reject(new Error('Tool execution timeout')), timeout);
      });

      const result = await Promise.race([
        implementation.execute(toolCall.parameters),
        timeoutPromise
      ]);

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown tool execution error'
      };
    }
  }

  /**
   * Extracts thinking tags from Gemini response
   */
  private extractThinking(text: string): string | undefined {
    const thinkingMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/);
    return thinkingMatch?.[1]?.trim();
  }

  /**
   * Extracts tool calls from Gemini response
   */
  private extractToolCalls(text: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    // Look for function call patterns in the response
    const functionCallPattern = /function_call:\s*{\s*"name":\s*"([^"]+)"\s*,\s*"parameters":\s*({[^}]*})\s*}/g;
    let match;

    while ((match = functionCallPattern.exec(text)) !== null) {
      try {
        const parameters = JSON.parse(match[2]);
        toolCalls.push({
          toolName: match[1],
          parameters
        });
      } catch {
        console.warn(`Failed to parse function call parameters: ${match[2]}`);
      }
    }

    return toolCalls;
  }

  /**
   * Sends a message with tool calling support
   */
  async sendMessageWithTools(message: string): Promise<FunctionCallResult> {
    const env = getEnv();

    if (!env.GEMINI_ENABLE_FUNCTION_CALLING) {
      // Fall back to regular chat if function calling is disabled
      const response = await this.sendMessage(message);
      return { text: response };
    }

    const generativeModel = this.vertexAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
        topP: this.config.topP,
        topK: this.config.topK,
      },
      tools: this.tools.length > 0 ? [{
        functionDeclarations: this.tools
      }] : undefined
    });

    const chat = generativeModel.startChat({
      history: this.history,
    });

    try {
      const result = await chat.sendMessage(message);
      const response = result.response;

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No response generated from Gemini');
      }

      const candidate = response.candidates[0];
      const responseText = candidate.content?.parts?.[0]?.text || '';

      // Extract thinking and tool calls
      const thinking = this.extractThinking(responseText);
      const extractedToolCalls = this.extractToolCalls(responseText);

      // Execute any tool calls
      const executedToolCalls: ToolCall[] = [];

      // Check for function calls in the candidate
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.functionCall) {
            const toolCall: ToolCall = {
              toolName: part.functionCall.name,
              parameters: (part.functionCall.args || {}) as Record<string, unknown>
            };

            const result = await this.executeTool(toolCall);
            executedToolCalls.push(toolCall);

            // Send tool result back to the model if successful
            if (result.success) {
              const toolResponse = await chat.sendMessage([{
                functionResponse: {
                  name: part.functionCall.name,
                  response: (result.data || {}) as object
                }
              }]);

              // Update response with tool execution result
              const toolCandidate = toolResponse.response.candidates?.[0];
              if (toolCandidate?.content?.parts?.[0]?.text) {
                const updatedText = toolCandidate.content.parts[0].text;
                const finalThinking = this.extractThinking(updatedText) || thinking;

                // Update history with tool execution
                this.history.push(
                  { role: 'user', parts: [{ text: message }] },
                  { role: 'model', parts: [{ text: updatedText }] }
                );

                return {
                  text: updatedText,
                  toolCalls: executedToolCalls,
                  reasoning: finalThinking,
                  finishReason: candidate.finishReason
                };
              }
            }
          }
        }
      }

      // Update history for non-tool responses
      this.history.push(
        { role: 'user', parts: [{ text: message }] },
        { role: 'model', parts: [{ text: responseText }] }
      );

      return {
        text: responseText,
        toolCalls: extractedToolCalls.length > 0 ? extractedToolCalls : executedToolCalls,
        reasoning: thinking,
        finishReason: candidate.finishReason
      };

    } catch (error) {
      throw new Error(
        `Function calling failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets registered tools
   */
  getRegisteredTools(): ToolFunction[] {
    return [...this.tools];
  }

  /**
   * Checks if a tool is registered
   */
  isToolRegistered(toolName: string): boolean {
    return this.toolImplementations.has(toolName);
  }
}

/**
 * Specialized triage agent with Indian epidemiology context
 */
export async function triageSymptoms(
  symptoms: string,
  patientContext?: Record<string, unknown>
): Promise<{
  severity: string;
  suspectedConditions: string[];
  recommendedAction: string;
  reasoning: string;
}> {
  const contextString = patientContext
    ? `\n\nPatient Context:\n${JSON.stringify(patientContext, null, 2)}`
    : '';

  const prompt = `You are a medical triage AI assistant specialized in Indian healthcare contexts.
Analyze the following symptoms and provide a triage assessment.

IMPORTANT CONTEXT:
- Consider common Indian epidemiological conditions (dengue, TB, malaria, typhoid)
- Assume resource-constrained settings (limited access to advanced diagnostics)
- Prioritize affordable and accessible treatment options
- Use clear, simple language suitable for patients with varying health literacy

Symptoms: ${symptoms}${contextString}

Provide your assessment in the following JSON format:
{
  "severity": "low|moderate|high|critical",
  "suspectedConditions": ["condition1", "condition2"],
  "recommendedAction": "specific action to take",
  "reasoning": "brief explanation of your assessment"
}`;

  const response = await generateContent(prompt, {
    temperature: 0.3, // Lower temperature for more consistent medical reasoning
  });

  try {
    // Extract JSON from response (handle cases where model includes markdown)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch (error) {
    throw new Error(
      `Failed to parse triage response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
