/**
 * RAG Search Endpoint
 * POST /api/rag/search
 *
 * Searches clinical guidelines using semantic similarity
 */

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, parseRequestBody } from '@/lib/api-middleware';
import { guidelineSearchSchema } from '@/lib/validations';
import { searchGuidelines } from '@/lib/gcp/guidelines-store';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody(request);
  const validated = guidelineSearchSchema.parse(body);

  const results = await searchGuidelines(validated.query, {
    topK: validated.topK,
    minSimilarity: validated.minSimilarity,
    category: validated.category,
    condition: validated.condition,
  });

  return successResponse({
    query: validated.query,
    results,
    count: results.length,
  });
});
