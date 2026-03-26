/**
 * Triage Endpoint
 * POST /api/agent/triage
 *
 * Analyzes symptoms and provides triage assessment
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  parseRequestBody,
  NotFoundError,
} from '@/lib/api-middleware';
import { triageSymptoms } from '@/lib/gcp/vertex-ai';
import { addMessageToSession, createSession, getSession } from '@/lib/gcp/firestore';
import { triageRequestSchema } from '@/lib/validations';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody(request);

  // Validate request body
  const validated = triageRequestSchema.parse(body);

  // Create session if not provided, or validate existing session
  let sessionId = validated.sessionId;
  if (sessionId) {
    // Verify session exists
    const existingSession = await getSession(sessionId);
    if (!existingSession) {
      throw new NotFoundError(`Session ${sessionId}`);
    }
  } else {
    // Create new session
    const session = await createSession(undefined, validated.abhaAddress);
    sessionId = session.sessionId;
  }

  // Perform triage
  const triageResult = await triageSymptoms(
    validated.symptoms,
    validated.patientContext
  );

  // Log interaction to session
  await addMessageToSession(sessionId, {
    role: 'user',
    content: `Symptoms: ${validated.symptoms}`,
    timestamp: new Date(),
  });

  await addMessageToSession(sessionId, {
    role: 'agent',
    content: `Triage: ${triageResult.severity} - ${triageResult.recommendedAction}`,
    timestamp: new Date(),
    metadata: triageResult,
  });

  return successResponse({
    sessionId,
    triage: triageResult,
  });
});
