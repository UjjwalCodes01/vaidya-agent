/**
 * MCP Tools
 * Tool handlers for debugging and inspection via MCP
 */

import { createLogger } from '../observability/logger';
import { getSession } from '../gcp/firestore';
import { getReasoningTraces, getReasoningTrace } from '../observability/reasoning-tracer';
import { queryAuditLogs } from '../security/audit-logger';
import { getMetrics } from '../observability/metrics';

const log = createLogger('mcp-tools');

/**
 * MCP Tool definition
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

/**
 * Get available MCP tools for debugging
 */
export function getMCPTools(): MCPTool[] {
  return [
    {
      name: 'inspect_session',
      description: 'Inspect the current state of an agent session including context and conversation history',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'The session ID to inspect',
          },
        },
        required: ['sessionId'],
      },
    },
    {
      name: 'query_reasoning',
      description: 'Search and retrieve reasoning traces from agent interactions',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Session ID to query traces for',
          },
          traceId: {
            type: 'string',
            description: 'Optional specific trace ID',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of traces to return (default: 10)',
          },
        },
        required: ['sessionId'],
      },
    },
    {
      name: 'get_audit_trail',
      description: 'Retrieve audit logs for compliance and debugging',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Filter by session ID',
          },
          userId: {
            type: 'string',
            description: 'Filter by user ID',
          },
          eventType: {
            type: 'string',
            description: 'Filter by event type',
            enum: [
              'api_request',
              'authentication',
              'authorization',
              'session_created',
              'patient_data_accessed',
              'consent_requested',
              'tool_executed',
              'error',
            ],
          },
          limit: {
            type: 'number',
            description: 'Maximum number of logs to return (default: 50)',
          },
        },
      },
    },
    {
      name: 'get_metrics',
      description: 'Get performance metrics for the agent system',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Filter metrics by category',
            enum: ['requests', 'tools', 'auth', 'all'],
          },
        },
      },
    },
    {
      name: 'list_tools',
      description: 'List all available healthcare tools and their schemas',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Filter by tool category',
            enum: ['abdm', 'uhi', 'search', 'session', 'all'],
          },
        },
      },
    },
    {
      name: 'replay_tool_call',
      description: 'Re-execute a tool call with specific parameters for debugging',
      inputSchema: {
        type: 'object',
        properties: {
          toolName: {
            type: 'string',
            description: 'Name of the tool to execute',
          },
          parameters: {
            type: 'string',
            description: 'JSON string of tool parameters',
          },
        },
        required: ['toolName', 'parameters'],
      },
    },
  ];
}

/**
 * Execute an MCP tool
 */
export async function executeMCPTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  log.debug('Executing MCP tool', { name, args });

  switch (name) {
    case 'inspect_session':
      return inspectSession(args.sessionId as string);
    
    case 'query_reasoning':
      return queryReasoning(
        args.sessionId as string,
        args.traceId as string | undefined,
        args.limit as number | undefined
      );
    
    case 'get_audit_trail':
      return getAuditTrail(args);
    
    case 'get_metrics':
      return getSystemMetrics(args.category as string | undefined);
    
    case 'list_tools':
      return listHealthcareTools(args.category as string | undefined);
    
    case 'replay_tool_call':
      return replayToolCall(
        args.toolName as string,
        args.parameters as string
      );
    
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Inspect a session
 */
async function inspectSession(sessionId: string): Promise<unknown> {
  if (!sessionId) {
    throw new Error('sessionId is required');
  }

  const session = await getSession(sessionId);
  
  if (!session) {
    return {
      error: 'Session not found',
      sessionId,
    };
  }

  return {
    sessionId: session.sessionId,
    userId: session.userId,
    abhaAddress: session.abhaAddress,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    context: {
      messageCount: session.context.conversationHistory?.length || 0,
      lastActivity: session.context.lastActivity,
      currentIntent: session.context.currentIntent,
      currentSymptoms: session.context.currentSymptoms,
      extractedSymptoms: session.context.extractedSymptoms,
      suspectedConditions: session.context.suspectedConditions,
    },
    conversationSummary: session.context.conversationHistory?.slice(-5).map(msg => ({
      role: msg.role,
      contentPreview: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
      timestamp: msg.timestamp,
    })),
  };
}

/**
 * Query reasoning traces
 */
async function queryReasoning(
  sessionId: string,
  traceId?: string,
  limit?: number
): Promise<unknown> {
  if (!sessionId) {
    throw new Error('sessionId is required');
  }

  if (traceId) {
    const trace = await getReasoningTrace(sessionId, traceId);
    if (!trace) {
      return { error: 'Trace not found', sessionId, traceId };
    }
    return trace;
  }

  const traces = await getReasoningTraces(sessionId, { limit: limit || 10 });
  
  return {
    sessionId,
    traceCount: traces.length,
    traces: traces.map(t => ({
      traceId: t.traceId,
      timestamp: t.timestamp,
      userMessage: t.userMessage.substring(0, 100),
      hasThinking: !!t.thinking,
      toolCount: t.toolExecutions.length,
      tools: t.toolExecutions.map(te => te.toolName),
      totalDurationMs: t.totalDurationMs,
    })),
  };
}

/**
 * Get audit trail
 */
async function getAuditTrail(args: Record<string, unknown>): Promise<unknown> {
  const logs = await queryAuditLogs({
    sessionId: args.sessionId as string | undefined,
    userId: args.userId as string | undefined,
    eventType: args.eventType as Parameters<typeof queryAuditLogs>[0]['eventType'],
    limit: (args.limit as number) || 50,
  });

  return {
    count: logs.length,
    logs: logs.map(log => ({
      eventId: log.eventId,
      eventType: log.eventType,
      timestamp: log.timestamp,
      action: log.action,
      outcome: log.outcome,
      userId: log.userId,
      sessionId: log.sessionId,
      path: log.path,
      durationMs: log.durationMs,
      error: log.error,
    })),
  };
}

/**
 * Get system metrics
 */
function getSystemMetrics(category?: string): unknown {
  const allMetrics = getMetrics();

  if (!category || category === 'all') {
    return allMetrics;
  }

  // Filter by category prefix
  const prefixMap: Record<string, string[]> = {
    requests: ['http_'],
    tools: ['tool_'],
    auth: ['auth_'],
  };

  const prefixes = prefixMap[category];
  if (!prefixes) {
    return allMetrics;
  }

  const filterByPrefix = (obj: Record<string, unknown>) => {
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (prefixes.some(p => key.startsWith(p))) {
        filtered[key] = value;
      }
    }
    return filtered;
  };

  return {
    counters: filterByPrefix(allMetrics.counters),
    gauges: filterByPrefix(allMetrics.gauges),
    histograms: filterByPrefix(allMetrics.histograms as Record<string, unknown>),
  };
}

/**
 * List healthcare tools
 */
async function listHealthcareTools(category?: string): Promise<unknown> {
  const { ALL_HEALTHCARE_TOOLS } = await import('../tools/definitions');
  
  interface Tool {
    name: string;
    description: string;
    parameters: {
      properties?: Record<string, unknown>;
      required?: string[];
    };
  }

  let tools: Tool[] = ALL_HEALTHCARE_TOOLS;

  if (category && category !== 'all') {
    tools = tools.filter((t) => {
      const toolCategory = getCategoryFromToolName(t.name);
      return toolCategory === category;
    });
  }

  return {
    count: tools.length,
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      category: getCategoryFromToolName(t.name),
      parameterCount: Object.keys(t.parameters.properties || {}).length,
      requiredParams: t.parameters.required || [],
    })),
  };
}

/**
 * Determine tool category from name
 */
function getCategoryFromToolName(name: string): string {
  if (name.startsWith('search_')) return 'search';
  if (name.includes('abdm') || name.includes('patient')) return 'abdm';
  if (name.includes('uhi') || name.includes('appointment')) return 'uhi';
  if (name.includes('consent')) return 'consent';
  if (name.includes('session')) return 'session';
  return 'general';
}

/**
 * Replay a tool call for debugging
 */
async function replayToolCall(
  toolName: string,
  parametersJson: string
): Promise<unknown> {
  if (!toolName) {
    throw new Error('toolName is required');
  }

  let parameters: Record<string, unknown>;
  try {
    parameters = JSON.parse(parametersJson);
  } catch {
    throw new Error('Invalid JSON in parameters');
  }

  // Get the tool registry
  const { getToolRegistry } = await import('../tools/registry');
  const registry = getToolRegistry();
  const toolInfo = registry.getToolInfo(toolName);

  if (!toolInfo) {
    return {
      error: 'Tool not found',
      toolName,
      availableTools: 'Use list_tools to see available tools',
    };
  }

  log.info('Replaying tool call', { toolName, parameters });

  const startTime = Date.now();
  try {
    const result = await registry.executeTool({
      toolName,
      parameters,
    });
    const durationMs = Date.now() - startTime;

    return {
      success: true,
      toolName,
      parameters,
      result,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      toolName,
      parameters,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs,
    };
  }
}
