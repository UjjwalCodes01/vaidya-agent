/**
 * RAG Seed Endpoint
 * POST /api/rag/seed
 *
 * Seeds the database with Indian clinical guidelines
 * Admin-only: requires RAG_ADMIN_KEY (fails closed in production)
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  APIError,
  getQueryParam,
} from '@/lib/api-middleware';
import { batchUpsertGuidelines, getGuidelinesStats } from '@/lib/gcp/guidelines-store';
import INDIAN_CLINICAL_GUIDELINES from '@/lib/data/clinical-guidelines';
import { getEnv } from '@/lib/env';

// Admin key for protecting seed endpoint
const env = getEnv();
const ADMIN_KEY = env.RAG_ADMIN_KEY;

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Fail closed: in production, RAG_ADMIN_KEY must be configured
  if (process.env.NODE_ENV === 'production' && !ADMIN_KEY) {
    throw new APIError(
      'Seed endpoint disabled - RAG_ADMIN_KEY not configured',
      503,
      'SERVICE_UNAVAILABLE'
    );
  }

  // If ADMIN_KEY is set (any environment), verify it
  if (ADMIN_KEY) {
    const providedKey = request.headers.get('x-admin-key');
    if (providedKey !== ADMIN_KEY) {
      throw new APIError('Unauthorized - invalid or missing admin key', 401, 'UNAUTHORIZED');
    }
  }

  const force = getQueryParam(request, 'force') === 'true';

  // Check if already seeded
  const stats = await getGuidelinesStats();
  if (stats.total > 0 && !force) {
    return successResponse({
      message: 'Database already seeded',
      stats,
      hint: 'Use ?force=true to re-seed',
    });
  }

  // Seed with Indian clinical guidelines
  const ids = await batchUpsertGuidelines(INDIAN_CLINICAL_GUIDELINES);

  const newStats = await getGuidelinesStats();

  return successResponse({
    message: 'Database seeded successfully',
    seeded: ids.length,
    stats: newStats,
  });
});
