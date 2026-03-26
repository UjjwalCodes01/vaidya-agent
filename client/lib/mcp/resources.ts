/**
 * MCP Resources
 * Resource handlers for reasoning traces, session history, and audit logs
 */

import { createLogger } from '../observability/logger';
import { getReasoningTraces, getReasoningTrace, type ReasoningTrace } from '../observability/reasoning-tracer';
import { queryAuditLogs, type AuditEntry } from '../security/audit-logger';
import { getSession } from '../gcp/firestore';

const log = createLogger('mcp-resources');

/**
 * Resource definition
 */
export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * Resource URI patterns
 */
const RESOURCE_PATTERNS = {
  REASONING: /^reasoning:\/\/traces\/([^/]+)(?:\/([^/]+))?$/,
  SESSION: /^session:\/\/history\/([^/]+)$/,
  AUDIT: /^audit:\/\/logs(?:\/([^/]+))?$/,
  TOOLS: /^tools:\/\/registry$/,
} as const;

/**
 * Get list of available resources
 */
export async function getMCPResources(): Promise<MCPResource[]> {
  return [
    {
      uri: 'reasoning://traces/{sessionId}',
      name: 'Reasoning Traces',
      description: 'Agent reasoning and thinking traces for a session',
      mimeType: 'application/json',
    },
    {
      uri: 'reasoning://traces/{sessionId}/{traceId}',
      name: 'Reasoning Trace',
      description: 'Specific reasoning trace by ID',
      mimeType: 'application/json',
    },
    {
      uri: 'session://history/{sessionId}',
      name: 'Session History',
      description: 'Conversation history and context for a session',
      mimeType: 'application/json',
    },
    {
      uri: 'audit://logs',
      name: 'Audit Logs',
      description: 'Recent audit log entries',
      mimeType: 'application/json',
    },
    {
      uri: 'audit://logs/{timeRange}',
      name: 'Audit Logs (Filtered)',
      description: 'Audit logs filtered by time range (e.g., 1h, 24h, 7d)',
      mimeType: 'application/json',
    },
    {
      uri: 'tools://registry',
      name: 'Tool Registry',
      description: 'Available healthcare tools and their schemas',
      mimeType: 'application/json',
    },
  ];
}

/**
 * Read a resource by URI
 */
export async function readMCPResource(uri: string): Promise<unknown> {
  log.debug('Reading resource', { uri });

  // Reasoning traces
  const reasoningMatch = uri.match(RESOURCE_PATTERNS.REASONING);
  if (reasoningMatch) {
    const sessionId = reasoningMatch[1];
    const traceId = reasoningMatch[2];

    if (traceId) {
      return readReasoningTrace(sessionId, traceId);
    }
    return readReasoningTraces(sessionId);
  }

  // Session history
  const sessionMatch = uri.match(RESOURCE_PATTERNS.SESSION);
  if (sessionMatch) {
    const sessionId = sessionMatch[1];
    return readSessionHistory(sessionId);
  }

  // Audit logs
  const auditMatch = uri.match(RESOURCE_PATTERNS.AUDIT);
  if (auditMatch) {
    const timeRange = auditMatch[1];
    return readAuditLogs(timeRange);
  }

  // Tool registry
  if (RESOURCE_PATTERNS.TOOLS.test(uri)) {
    return readToolRegistry();
  }

  throw new Error(`Unknown resource URI: ${uri}`);
}

/**
 * Read reasoning traces for a session
 */
async function readReasoningTraces(sessionId: string): Promise<ReasoningTrace[]> {
  log.debug('Reading reasoning traces', { sessionId });
  
  const traces = await getReasoningTraces(sessionId, { limit: 50 });
  
  return traces.map(trace => ({
    ...trace,
    // Summarize for readability
    thinkingSummary: trace.thinking ? trace.thinking.substring(0, 200) + '...' : null,
  }));
}

/**
 * Read a specific reasoning trace
 */
async function readReasoningTrace(sessionId: string, traceId: string): Promise<ReasoningTrace | null> {
  log.debug('Reading reasoning trace', { sessionId, traceId });
  
  return getReasoningTrace(sessionId, traceId);
}

/**
 * Session history response
 */
interface SessionHistoryResponse {
  sessionId: string;
  userId?: string;
  abhaAddress?: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastActivity: Date;
  context: Record<string, unknown>;
}

/**
 * Read session history
 */
async function readSessionHistory(sessionId: string): Promise<SessionHistoryResponse | null> {
  log.debug('Reading session history', { sessionId });
  
  const session = await getSession(sessionId);
  
  if (!session) {
    return null;
  }

  return {
    sessionId: session.sessionId,
    userId: session.userId,
    abhaAddress: session.abhaAddress,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messageCount: session.context.conversationHistory?.length || 0,
    lastActivity: session.context.lastActivity,
    context: {
      ...session.context,
      // Don't include full history in summary
      conversationHistory: `${session.context.conversationHistory?.length || 0} messages`,
    },
  };
}

/**
 * Parse time range string (e.g., '1h', '24h', '7d')
 */
function parseTimeRange(range?: string): { startTime: Date; endTime: Date } {
  const endTime = new Date();
  
  if (!range) {
    // Default to last 24 hours
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
    return { startTime, endTime };
  }

  const match = range.match(/^(\d+)([hd])$/);
  if (!match) {
    throw new Error(`Invalid time range format: ${range}. Use format like '1h', '24h', '7d'`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  let offsetMs: number;
  if (unit === 'h') {
    offsetMs = value * 60 * 60 * 1000;
  } else {
    offsetMs = value * 24 * 60 * 60 * 1000;
  }

  const startTime = new Date(endTime.getTime() - offsetMs);
  return { startTime, endTime };
}

/**
 * Read audit logs
 */
async function readAuditLogs(timeRange?: string): Promise<AuditEntry[]> {
  log.debug('Reading audit logs', { timeRange });

  const { startTime, endTime } = parseTimeRange(timeRange);

  return queryAuditLogs({
    startTime,
    endTime,
    limit: 100,
  });
}

/**
 * Tool registry entry
 */
interface ToolRegistryEntry {
  name: string;
  description: string;
  category: string;
  parameters: Record<string, unknown>;
}

/**
 * Read tool registry
 */
async function readToolRegistry(): Promise<ToolRegistryEntry[]> {
  log.debug('Reading tool registry');

  // Import tool definitions
  const { ALL_HEALTHCARE_TOOLS } = await import('../tools/definitions');

  return ALL_HEALTHCARE_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    category: getCategoryFromToolName(tool.name),
    parameters: tool.parameters,
  }));
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
