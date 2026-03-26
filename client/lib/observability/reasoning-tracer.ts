/**
 * Reasoning Trace Persistence
 * Captures and stores agent thinking, tool execution, and decision traces
 */

import { getFirestore } from '../gcp/firestore';
import { Timestamp } from '@google-cloud/firestore';
import { randomUUID } from 'crypto';
import { createLogger } from './logger';

const log = createLogger('reasoning-tracer');

/**
 * Tool execution record
 */
export interface ToolExecutionTrace {
  /** Tool name */
  toolName: string;
  /** Input parameters */
  parameters: Record<string, unknown>;
  /** Tool result */
  result: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
  /** Execution start time */
  startedAt: Date;
  /** Execution end time */
  completedAt: Date;
  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Complete reasoning trace for a request
 */
export interface ReasoningTrace {
  /** Unique trace ID */
  traceId: string;
  /** Session ID */
  sessionId: string;
  /** Request ID (correlates with audit logs) */
  requestId: string;
  /** User ID (if authenticated) */
  userId?: string;
  /** User input message */
  userMessage: string;
  /** Extracted thinking/reasoning from model */
  thinking?: string;
  /** Tool executions during this request */
  toolExecutions: ToolExecutionTrace[];
  /** Final response to user */
  finalResponse: string;
  /** Model used */
  model: string;
  /** Total request duration */
  totalDurationMs: number;
  /** Timestamp */
  timestamp: Date;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// Firestore collection name
const TRACES_COLLECTION = 'reasoning_traces';

/**
 * Active trace builders (in-progress requests)
 */
interface TraceBuilder {
  trace: Partial<ReasoningTrace>;
  toolExecutions: ToolExecutionTrace[];
  startTime: number;
}

const activeTraces = new Map<string, TraceBuilder>();

/**
 * Start a new reasoning trace
 */
export function startReasoningTrace(options: {
  sessionId: string;
  requestId?: string;
  userId?: string;
  userMessage: string;
  model?: string;
}): string {
  const traceId = options.requestId || randomUUID();
  
  activeTraces.set(traceId, {
    trace: {
      traceId,
      sessionId: options.sessionId,
      requestId: traceId,
      userId: options.userId,
      userMessage: options.userMessage,
      model: options.model || 'unknown',
      timestamp: new Date(),
    },
    toolExecutions: [],
    startTime: Date.now(),
  });

  log.debug('Started reasoning trace', { traceId, sessionId: options.sessionId });
  return traceId;
}

/**
 * Add thinking content to trace
 */
export function addThinking(traceId: string, thinking: string): void {
  const builder = activeTraces.get(traceId);
  if (!builder) {
    log.warn('Trace not found for adding thinking', { traceId });
    return;
  }

  builder.trace.thinking = thinking;
  log.debug('Added thinking to trace', { traceId, thinkingLength: thinking.length });
}

/**
 * Start a tool execution within a trace
 */
export function startToolExecution(
  traceId: string,
  toolName: string,
  parameters: Record<string, unknown>
): string {
  const executionId = `${traceId}-tool-${Date.now()}`;
  
  const builder = activeTraces.get(traceId);
  if (!builder) {
    log.warn('Trace not found for tool execution', { traceId, toolName });
    return executionId;
  }

  // Add placeholder for this execution
  builder.toolExecutions.push({
    toolName,
    parameters,
    result: { success: false },
    startedAt: new Date(),
    completedAt: new Date(),
    durationMs: 0,
  });

  log.debug('Started tool execution', { traceId, toolName, executionId });
  return executionId;
}

/**
 * Complete a tool execution
 */
export function completeToolExecution(
  traceId: string,
  toolName: string,
  result: { success: boolean; data?: unknown; error?: string },
  startTime: Date
): void {
  const builder = activeTraces.get(traceId);
  if (!builder) {
    log.warn('Trace not found for completing tool execution', { traceId, toolName });
    return;
  }

  // Find and update the matching execution
  const execution = builder.toolExecutions.find(
    e => e.toolName === toolName && e.durationMs === 0
  );

  if (execution) {
    const completedAt = new Date();
    execution.result = result;
    execution.completedAt = completedAt;
    execution.durationMs = completedAt.getTime() - startTime.getTime();
  }

  log.debug('Completed tool execution', { 
    traceId, 
    toolName, 
    success: result.success,
    durationMs: execution?.durationMs,
  });
}

/**
 * Add a complete tool execution (for simple cases)
 */
export function addToolExecution(traceId: string, execution: ToolExecutionTrace): void {
  const builder = activeTraces.get(traceId);
  if (!builder) {
    log.warn('Trace not found for adding tool execution', { traceId });
    return;
  }

  builder.toolExecutions.push(execution);
}

/**
 * Complete and persist a reasoning trace
 */
export async function completeReasoningTrace(
  traceId: string,
  finalResponse: string,
  metadata?: Record<string, unknown>
): Promise<ReasoningTrace | null> {
  const builder = activeTraces.get(traceId);
  if (!builder) {
    log.warn('Trace not found for completion', { traceId });
    return null;
  }

  const totalDurationMs = Date.now() - builder.startTime;

  const trace: ReasoningTrace = {
    traceId,
    sessionId: builder.trace.sessionId || '',
    requestId: builder.trace.requestId || traceId,
    userId: builder.trace.userId,
    userMessage: builder.trace.userMessage || '',
    thinking: builder.trace.thinking,
    toolExecutions: builder.toolExecutions,
    finalResponse,
    model: builder.trace.model || 'unknown',
    totalDurationMs,
    timestamp: builder.trace.timestamp || new Date(),
    metadata,
  };

  // Remove from active traces
  activeTraces.delete(traceId);

  // Persist to Firestore
  try {
    await persistTrace(trace);
    log.info('Completed reasoning trace', {
      traceId,
      sessionId: trace.sessionId,
      toolCount: trace.toolExecutions.length,
      durationMs: totalDurationMs,
    });
  } catch (error) {
    log.error('Failed to persist reasoning trace', error instanceof Error ? error : new Error(String(error)), { traceId });
  }

  return trace;
}

/**
 * Persist trace to Firestore
 */
async function persistTrace(trace: ReasoningTrace): Promise<void> {
  const db = getFirestore();
  
  // Store under session ID for efficient querying
  const docPath = `${TRACES_COLLECTION}/${trace.sessionId}/traces/${trace.traceId}`;
  const docRef = db.doc(docPath);

  await docRef.set({
    ...trace,
    timestamp: Timestamp.fromDate(trace.timestamp),
    toolExecutions: trace.toolExecutions.map(te => ({
      ...te,
      startedAt: Timestamp.fromDate(te.startedAt),
      completedAt: Timestamp.fromDate(te.completedAt),
    })),
  });
}

/**
 * Cancel an active trace (e.g., on error)
 */
export function cancelReasoningTrace(traceId: string): void {
  activeTraces.delete(traceId);
  log.debug('Cancelled reasoning trace', { traceId });
}

/**
 * Query reasoning traces for a session
 */
export async function getReasoningTraces(
  sessionId: string,
  options?: {
    limit?: number;
    startAfter?: Date;
  }
): Promise<ReasoningTrace[]> {
  const db = getFirestore();
  const collectionPath = `${TRACES_COLLECTION}/${sessionId}/traces`;
  
  let query = db.collection(collectionPath)
    .orderBy('timestamp', 'desc');

  if (options?.startAfter) {
    query = query.startAfter(Timestamp.fromDate(options.startAfter));
  }

  query = query.limit(options?.limit || 50);

  const snapshot = await query.get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      timestamp: data.timestamp?.toDate() || new Date(),
      toolExecutions: (data.toolExecutions || []).map((te: Record<string, unknown>) => ({
        ...te,
        startedAt: (te.startedAt as Timestamp)?.toDate() || new Date(),
        completedAt: (te.completedAt as Timestamp)?.toDate() || new Date(),
      })),
    } as ReasoningTrace;
  });
}

/**
 * Get a specific reasoning trace
 */
export async function getReasoningTrace(
  sessionId: string,
  traceId: string
): Promise<ReasoningTrace | null> {
  const db = getFirestore();
  const docPath = `${TRACES_COLLECTION}/${sessionId}/traces/${traceId}`;
  const docRef = db.doc(docPath);

  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data();
  if (!data) return null;

  return {
    ...data,
    timestamp: data.timestamp?.toDate() || new Date(),
    toolExecutions: (data.toolExecutions || []).map((te: Record<string, unknown>) => ({
      ...te,
      startedAt: (te.startedAt as Timestamp)?.toDate() || new Date(),
      completedAt: (te.completedAt as Timestamp)?.toDate() || new Date(),
    })),
  } as ReasoningTrace;
}

/**
 * Extract thinking from Gemini response
 * Looks for content between <thinking> tags
 */
export function extractThinking(response: string): { thinking: string | null; content: string } {
  const thinkingMatch = response.match(/<thinking>([\s\S]*?)<\/thinking>/);
  
  if (thinkingMatch) {
    const thinking = thinkingMatch[1].trim();
    const content = response.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim();
    return { thinking, content };
  }

  return { thinking: null, content: response };
}
