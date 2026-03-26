/**
 * Firestore Configuration and Client Initialization
 * Manages session state and patient context for Vaidya-Agent
 */

import { Firestore, FieldValue, Timestamp } from '@google-cloud/firestore';
import { getGCPCredentials, getGCPConfig } from './config';
import { getEnv } from '../env';
import type { AgentSession, SessionContext, Message } from '@/types';

let firestoreInstance: Firestore | null = null;

/**
 * Returns a singleton Firestore instance
 */
export function getFirestore(): Firestore {
  if (!firestoreInstance) {
    const credentials = getGCPCredentials();
    const { projectId } = getGCPConfig();
    const databaseId = getEnv().FIRESTORE_DATABASE_ID;

    firestoreInstance = new Firestore({
      projectId,
      databaseId,
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      ignoreUndefinedProperties: true, // Allow undefined fields
    });
  }

  return firestoreInstance;
}

// Collection names
export const COLLECTIONS = {
  SESSIONS: 'agent_sessions',
  PATIENTS: 'patients',
  CONSENT_REQUESTS: 'consent_requests',
  AUDIT_LOGS: 'audit_logs',
} as const;

/**
 * Session Management Functions
 */

export async function createSession(
  userId?: string,
  abhaAddress?: string,
  initialContext?: Partial<SessionContext>
): Promise<AgentSession> {
  const db = getFirestore();
  const sessionRef = db.collection(COLLECTIONS.SESSIONS).doc();

  const session: AgentSession = {
    sessionId: sessionRef.id,
    userId,
    abhaAddress,
    createdAt: new Date(),
    updatedAt: new Date(),
    context: {
      conversationHistory: [],
      lastActivity: new Date(),
      ...initialContext,
    },
  };

  await sessionRef.set(session);
  return session;
}

export async function getSession(sessionId: string): Promise<AgentSession | null> {
  const db = getFirestore();
  const sessionRef = db.collection(COLLECTIONS.SESSIONS).doc(sessionId);
  const snapshot = await sessionRef.get();

  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data() as AgentSession;
}

export async function updateSession(
  sessionId: string,
  updates: Partial<SessionContext>
): Promise<void> {
  const db = getFirestore();
  const sessionRef = db.collection(COLLECTIONS.SESSIONS).doc(sessionId);

  // Build nested field updates to safely merge with existing context
  const fieldUpdates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  // Add each field as a nested update to preserve other context fields
  Object.keys(updates).forEach((key) => {
    fieldUpdates[`context.${key}`] = updates[key as keyof SessionContext];
  });

  await sessionRef.update(fieldUpdates);
}

export async function addMessageToSession(
  sessionId: string,
  message: Message
): Promise<void> {
  const db = getFirestore();
  const sessionRef = db.collection(COLLECTIONS.SESSIONS).doc(sessionId);

  await sessionRef.update({
    'context.conversationHistory': FieldValue.arrayUnion(message),
    'context.lastActivity': new Date(),
    updatedAt: new Date(),
  });
}

/**
 * Audit Logging for Compliance (DPDP 2023)
 */

interface AuditLog {
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  action: string;
  details: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAudit(log: AuditLog): Promise<void> {
  const db = getFirestore();
  const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();

  await auditRef.set({
    ...log,
    timestamp: Timestamp.fromDate(log.timestamp),
  });
}

/**
 * Patient Data Management
 */

export async function storePatientContext(
  abhaAddress: string,
  context: Record<string, unknown>
): Promise<void> {
  const db = getFirestore();
  const patientRef = db.collection(COLLECTIONS.PATIENTS).doc(abhaAddress);

  await patientRef.set(
    {
      abhaAddress,
      context,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  // Log for compliance
  await logAudit({
    timestamp: new Date(),
    userId: abhaAddress,
    action: 'patient_context_updated',
    details: { keys: Object.keys(context) },
  });
}

export async function getPatientContext(
  abhaAddress: string
): Promise<Record<string, unknown> | null> {
  const db = getFirestore();
  const patientRef = db.collection(COLLECTIONS.PATIENTS).doc(abhaAddress);
  const snapshot = await patientRef.get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data();
  return data?.context || null;
}
