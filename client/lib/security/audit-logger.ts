/**
 * Audit Logger
 * Structured audit logging for DPDP 2023 compliance
 */

import { NextRequest } from 'next/server';
import { getFirestore, COLLECTIONS } from '../gcp/firestore';
import { Timestamp } from '@google-cloud/firestore';
import type { AuthContext } from '../auth/types';
import { getClientIP } from './rate-limiter-redis';

/**
 * Audit event types
 */
export type AuditEventType =
  | 'api_request'
  | 'authentication'
  | 'authorization'
  | 'session_created'
  | 'session_accessed'
  | 'patient_data_accessed'
  | 'patient_data_modified'
  | 'consent_requested'
  | 'consent_granted'
  | 'consent_revoked'
  | 'tool_executed'
  | 'error';

/**
 * Audit event severity
 */
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Audit log entry
 */
export interface AuditEntry {
  /** Unique event ID */
  eventId: string;
  /** Event type */
  eventType: AuditEventType;
  /** Event severity */
  severity: AuditSeverity;
  /** Timestamp */
  timestamp: Date;
  /** User ID (if authenticated) */
  userId?: string;
  /** Session ID (if applicable) */
  sessionId?: string;
  /** Request path */
  path?: string;
  /** HTTP method */
  method?: string;
  /** Client IP address */
  ipAddress?: string;
  /** User agent */
  userAgent?: string;
  /** Action description */
  action: string;
  /** Resource being accessed */
  resource?: string;
  /** Outcome of the action */
  outcome: 'success' | 'failure' | 'pending';
  /** Additional details */
  details?: Record<string, unknown>;
  /** Error message if failed */
  error?: string;
  /** Duration in milliseconds */
  durationMs?: number;
}

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Write audit log to Firestore
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const db = getFirestore();
    const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc(entry.eventId);

    await auditRef.set({
      ...entry,
      timestamp: Timestamp.fromDate(entry.timestamp),
    });
  } catch (error) {
    // Log to console as fallback - audit logging should never break the app
    console.error('[AuditLogger] Failed to write audit log:', error);
    console.log('[AuditLogger] Entry:', JSON.stringify(entry, null, 2));
  }
}

/**
 * Create audit entry from request
 */
export function createAuditEntry(
  request: NextRequest,
  auth: AuthContext | undefined,
  eventType: AuditEventType,
  action: string,
  options?: Partial<AuditEntry>
): AuditEntry {
  return {
    eventId: generateEventId(),
    eventType,
    severity: 'info',
    timestamp: new Date(),
    userId: auth?.user?.userId,
    sessionId: auth?.user?.sessionId,
    path: request.nextUrl.pathname,
    method: request.method,
    ipAddress: getClientIP(request),
    userAgent: request.headers.get('user-agent') || undefined,
    action,
    outcome: 'pending',
    ...options,
  };
}

/**
 * Log API request
 */
export async function logApiRequest(
  request: NextRequest,
  auth: AuthContext | undefined,
  outcome: 'success' | 'failure',
  durationMs: number,
  details?: Record<string, unknown>
): Promise<void> {
  const entry = createAuditEntry(
    request,
    auth,
    'api_request',
    `${request.method} ${request.nextUrl.pathname}`,
    {
      outcome,
      durationMs,
      details,
      severity: outcome === 'failure' ? 'warning' : 'info',
    }
  );

  await writeAuditLog(entry);
}

/**
 * Log authentication event
 */
export async function logAuthentication(
  request: NextRequest,
  userId: string | undefined,
  outcome: 'success' | 'failure',
  error?: string
): Promise<void> {
  const entry = createAuditEntry(
    request,
    undefined,
    'authentication',
    outcome === 'success' ? 'User authenticated' : 'Authentication failed',
    {
      userId,
      outcome,
      error,
      severity: outcome === 'failure' ? 'warning' : 'info',
    }
  );

  await writeAuditLog(entry);
}

/**
 * Log authorization event
 */
export async function logAuthorization(
  request: NextRequest,
  auth: AuthContext | undefined,
  resource: string,
  requiredRole: string,
  outcome: 'success' | 'failure'
): Promise<void> {
  const entry = createAuditEntry(
    request,
    auth,
    'authorization',
    outcome === 'success' 
      ? `Access granted to ${resource}` 
      : `Access denied to ${resource}`,
    {
      resource,
      outcome,
      details: { requiredRole, userRoles: auth?.user?.roles },
      severity: outcome === 'failure' ? 'warning' : 'info',
    }
  );

  await writeAuditLog(entry);
}

/**
 * Log patient data access (DPDP compliance)
 */
export async function logPatientDataAccess(
  request: NextRequest,
  auth: AuthContext | undefined,
  patientId: string,
  dataType: string,
  action: 'read' | 'write' | 'delete'
): Promise<void> {
  const eventType = action === 'read' ? 'patient_data_accessed' : 'patient_data_modified';
  
  const entry = createAuditEntry(
    request,
    auth,
    eventType,
    `Patient data ${action}: ${dataType}`,
    {
      resource: `patient:${patientId}`,
      outcome: 'success',
      details: { patientId, dataType, action },
      severity: 'info',
    }
  );

  await writeAuditLog(entry);
}

/**
 * Log consent event (DPDP compliance)
 */
export async function logConsentEvent(
  request: NextRequest,
  auth: AuthContext | undefined,
  consentType: 'requested' | 'granted' | 'revoked',
  consentId: string,
  patientId: string,
  details?: Record<string, unknown>
): Promise<void> {
  const eventTypes: Record<string, AuditEventType> = {
    requested: 'consent_requested',
    granted: 'consent_granted',
    revoked: 'consent_revoked',
  };

  const entry = createAuditEntry(
    request,
    auth,
    eventTypes[consentType],
    `Consent ${consentType}`,
    {
      resource: `consent:${consentId}`,
      outcome: 'success',
      details: { consentId, patientId, ...details },
      severity: 'info',
    }
  );

  await writeAuditLog(entry);
}

/**
 * Log tool execution
 */
export async function logToolExecution(
  sessionId: string,
  userId: string | undefined,
  toolName: string,
  outcome: 'success' | 'failure',
  durationMs: number,
  error?: string
): Promise<void> {
  const entry: AuditEntry = {
    eventId: generateEventId(),
    eventType: 'tool_executed',
    severity: outcome === 'failure' ? 'warning' : 'info',
    timestamp: new Date(),
    userId,
    sessionId,
    action: `Tool executed: ${toolName}`,
    resource: `tool:${toolName}`,
    outcome,
    durationMs,
    error,
  };

  await writeAuditLog(entry);
}

/**
 * Log error
 */
export async function logError(
  request: NextRequest,
  auth: AuthContext | undefined,
  error: Error,
  context?: string
): Promise<void> {
  const entry = createAuditEntry(
    request,
    auth,
    'error',
    context || 'An error occurred',
    {
      outcome: 'failure',
      error: error.message,
      details: { 
        errorName: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      severity: 'error',
    }
  );

  await writeAuditLog(entry);
}

/**
 * Query audit logs (for admin/debugging)
 */
export async function queryAuditLogs(options: {
  userId?: string;
  sessionId?: string;
  eventType?: AuditEventType;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
}): Promise<AuditEntry[]> {
  const db = getFirestore();
  let query = db.collection(COLLECTIONS.AUDIT_LOGS)
    .orderBy('timestamp', 'desc');

  if (options.userId) {
    query = query.where('userId', '==', options.userId);
  }

  if (options.sessionId) {
    query = query.where('sessionId', '==', options.sessionId);
  }

  if (options.eventType) {
    query = query.where('eventType', '==', options.eventType);
  }

  if (options.startTime) {
    query = query.where('timestamp', '>=', Timestamp.fromDate(options.startTime));
  }

  if (options.endTime) {
    query = query.where('timestamp', '<=', Timestamp.fromDate(options.endTime));
  }

  query = query.limit(options.limit || 100);

  const snapshot = await query.get();
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      timestamp: data.timestamp?.toDate() || new Date(),
    } as AuditEntry;
  });
}
