/**
 * Session Management Endpoint
 * POST /api/agent/session
 *
 * Creates a new agent session for interaction
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  parseRequestBody,
} from '@/lib/api-middleware';
import { createSession } from '@/lib/gcp/firestore';
import { sessionCreateSchema } from '@/lib/validations';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody(request);

  // Validate request body
  const validated = sessionCreateSchema.parse(body);

  // Create session with initial context
  const session = await createSession(
    validated.userId,
    validated.abhaAddress,
    validated.initialContext
  );

  return successResponse(session, 201);
});
