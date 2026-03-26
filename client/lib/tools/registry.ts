/**
 * Tool Registry and Execution Middleware
 * Centralized management of healthcare tools for Vaidya-Agent
 */

import type { ToolCall, ToolResult } from '../../types';
import type { ToolFunction, ToolImplementation } from '../gcp/vertex-ai';
import { getEnv } from '../env';

interface ToolPropertyDefinition {
  type: string;
  description?: string;
}

export interface ToolRegistryEntry {
  definition: ToolFunction;
  implementation: ToolImplementation;
  category: 'abdm' | 'uhi' | 'location' | 'session' | 'emergency';
  isActive: boolean;
}

/**
 * Centralized tool registry for healthcare functions
 */
export class ToolRegistry {
  private tools: Map<string, ToolRegistryEntry> = new Map();
  private executionLog: Array<{
    toolName: string;
    timestamp: Date;
    success: boolean;
    executionTimeMs: number;
    error?: string;
  }> = [];

  /**
   * Registers a tool with the registry
   */
  registerTool(
    definition: ToolFunction,
    implementation: ToolImplementation,
    category: ToolRegistryEntry['category'] = 'session'
  ): void {
    this.tools.set(definition.name, {
      definition,
      implementation,
      category,
      isActive: true
    });
  }

  /**
   * Updates the implementation of an existing tool
   */
  updateToolImplementation(
    toolName: string,
    implementation: ToolImplementation
  ): void {
    const entry = this.tools.get(toolName);
    if (entry) {
      entry.implementation = implementation;
    }
  }

  /**
   * Gets all registered tools of a specific category
   */
  getToolsByCategory(category: ToolRegistryEntry['category']): ToolFunction[] {
    return Array.from(this.tools.values())
      .filter(entry => entry.category === category && entry.isActive)
      .map(entry => entry.definition);
  }

  /**
   * Gets all active tool definitions
   */
  getAllActiveTools(): ToolFunction[] {
    return Array.from(this.tools.values())
      .filter(entry => entry.isActive)
      .map(entry => entry.definition);
  }

  /**
   * Executes a tool with comprehensive error handling and logging
   */
  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    const startTime = Date.now();
    const entry = this.tools.get(toolCall.toolName);

    if (!entry) {
      const error = `Tool '${toolCall.toolName}' not found in registry`;
      this.logExecution(toolCall.toolName, false, 0, error);
      return {
        success: false,
        error
      };
    }

    if (!entry.isActive) {
      const error = `Tool '${toolCall.toolName}' is currently disabled`;
      this.logExecution(toolCall.toolName, false, 0, error);
      return {
        success: false,
        error
      };
    }

    try {
      // Validate parameters against tool definition
      const validationResult = this.validateParameters(toolCall, entry.definition);
      if (!validationResult.isValid) {
        const error = `Parameter validation failed: ${validationResult.error}`;
        this.logExecution(toolCall.toolName, false, 0, error);
        return {
          success: false,
          error
        };
      }

      const env = getEnv();
      const timeout = entry.implementation.timeout || env.TOOL_CALLING_TIMEOUT_MS;

      // Execute with timeout
      const timeoutPromise = new Promise<ToolResult>((_, reject) => {
        setTimeout(() => reject(new Error('Tool execution timeout')), timeout);
      });

      const result = await Promise.race([
        entry.implementation.execute(toolCall.parameters),
        timeoutPromise
      ]);

      const executionTime = Date.now() - startTime;
      this.logExecution(toolCall.toolName, result.success, executionTime, result.error);

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown tool execution error';
      this.logExecution(toolCall.toolName, false, executionTime, errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Validates tool call parameters against schema
   */
  private validateParameters(
    toolCall: ToolCall,
    definition: ToolFunction
  ): { isValid: boolean; error?: string } {
    const { parameters } = definition;
    const { required = [] } = parameters;

    // Check required parameters
    for (const requiredParam of required) {
      if (!(requiredParam in toolCall.parameters)) {
        return {
          isValid: false,
          error: `Required parameter '${requiredParam}' is missing`
        };
      }
    }

    // Basic type checking (could be enhanced with more sophisticated validation)
    const { properties = {} } = parameters;
    for (const [key, value] of Object.entries(toolCall.parameters)) {
      if (key in properties) {
        const expectedType = (properties[key] as ToolPropertyDefinition)?.type;
        const actualType = typeof value;

        if (expectedType === 'string' && actualType !== 'string') {
          return {
            isValid: false,
            error: `Parameter '${key}' expected string but got ${actualType}`
          };
        }
        if (expectedType === 'number' && actualType !== 'number') {
          return {
            isValid: false,
            error: `Parameter '${key}' expected number but got ${actualType}`
          };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Logs tool execution for monitoring and debugging
   */
  private logExecution(
    toolName: string,
    success: boolean,
    executionTimeMs: number,
    error?: string
  ): void {
    this.executionLog.push({
      toolName,
      timestamp: new Date(),
      success,
      executionTimeMs,
      error
    });

    // Keep only last 1000 entries to prevent memory growth
    if (this.executionLog.length > 1000) {
      this.executionLog = this.executionLog.slice(-1000);
    }

    // Log to console for development
    if (!success) {
      console.error(`Tool ${toolName} failed after ${executionTimeMs}ms:`, error);
    } else {
      console.log(`Tool ${toolName} executed successfully in ${executionTimeMs}ms`);
    }
  }

  /**
   * Gets execution statistics for monitoring
   */
  getExecutionStats(): {
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
    recentErrors: Array<{ toolName: string; error: string; timestamp: Date }>;
  } {
    const totalExecutions = this.executionLog.length;
    const successfulExecutions = this.executionLog.filter(log => log.success).length;
    const successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 0;

    const totalTime = this.executionLog.reduce((sum, log) => sum + log.executionTimeMs, 0);
    const avgExecutionTime = totalExecutions > 0 ? totalTime / totalExecutions : 0;

    const recentErrors = this.executionLog
      .filter(log => !log.success && log.error)
      .slice(-10)
      .map(log => ({
        toolName: log.toolName,
        error: log.error!,
        timestamp: log.timestamp
      }));

    return {
      totalExecutions,
      successRate,
      avgExecutionTime,
      recentErrors
    };
  }

  /**
   * Enables or disables a tool
   */
  setToolActive(toolName: string, active: boolean): boolean {
    const entry = this.tools.get(toolName);
    if (entry) {
      entry.isActive = active;
      return true;
    }
    return false;
  }

  /**
   * Gets tool information
   */
  getToolInfo(toolName: string): ToolRegistryEntry | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Clears execution log (for testing/maintenance)
   */
  clearLog(): void {
    this.executionLog = [];
  }
}

// Singleton instance
let toolRegistryInstance: ToolRegistry | null = null;

/**
 * Gets the global tool registry instance
 */
export function getToolRegistry(): ToolRegistry {
  if (!toolRegistryInstance) {
    toolRegistryInstance = new ToolRegistry();
  }
  return toolRegistryInstance;
}