/**
 * RAG Guidelines Management Endpoint
 * GET /api/rag/guidelines - List guidelines (public)
 * POST /api/rag/guidelines - Create/update guideline (admin-only)
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  parseRequestBody,
  getQueryParam,
  APIError,
} from '@/lib/api-middleware';
import { guidelineUpsertSchema } from '@/lib/validations';
import {
  listGuidelines,
  upsertGuideline,
  getGuidelinesStats,
} from '@/lib/gcp/guidelines-store';
import type { ClinicalGuideline } from '@/lib/gcp/guidelines-store';
import { getEnv } from '@/lib/env';

// Admin key required for write operations
const env = getEnv();
const ADMIN_KEY = env.RAG_ADMIN_KEY;

/**
 * Verify admin authorization for write operations
 * Fails closed: requires RAG_ADMIN_KEY to be set in production
 */
function verifyAdminAccess(request: NextRequest): void {
  // In production, RAG_ADMIN_KEY must be configured
  if (process.env.NODE_ENV === 'production' && !ADMIN_KEY) {
    throw new APIError(
      'Admin write operations disabled - RAG_ADMIN_KEY not configured',
      503,
      'SERVICE_UNAVAILABLE'
    );
  }

  // If ADMIN_KEY is set, verify it matches
  if (ADMIN_KEY) {
    const providedKey = request.headers.get('x-admin-key');
    if (providedKey !== ADMIN_KEY) {
      throw new APIError('Unauthorized - invalid or missing admin key', 401, 'UNAUTHORIZED');
    }
  }
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const category = getQueryParam(request, 'category') as ClinicalGuideline['category'] | null;
  const condition = getQueryParam(request, 'condition');
  const stats = getQueryParam(request, 'stats') === 'true';

  if (stats) {
    const guidelinesStats = await getGuidelinesStats();
    return successResponse(guidelinesStats);
  }

  const guidelines = await listGuidelines({
    category: category || undefined,
    condition: condition || undefined,
  });

  return successResponse({
    guidelines,
    count: guidelines.length,
  });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Admin-only: verify authorization
  verifyAdminAccess(request);

  const body = await parseRequestBody(request);
  const validated = guidelineUpsertSchema.parse(body);

  const id = await upsertGuideline(validated);

  return successResponse(
    {
      id,
      message: 'Guideline saved successfully',
    },
    201
  );
});
