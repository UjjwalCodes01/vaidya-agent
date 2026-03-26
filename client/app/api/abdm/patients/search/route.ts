/**
 * ABDM Patient Search Endpoint (M1 Milestone)
 * POST /api/abdm/patients/search
 *
 * Patient discovery through ABDM M1 registry
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  parseRequestBody,
} from '@/lib/api-middleware';
import { ABDMRegistryAgent } from '@/lib/agents/abdm-registry';
import type { ABHAAddress } from '@/types';
import { hprSearchSchema } from '@/lib/validations';

// ABDM Patient Search Response Type
interface PatientSearchData {
  patients: ABHAAddress[];
  totalCount: number;
  source: string;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody(request);
  const validated = hprSearchSchema.parse(body);

  const abdmAgent = new ABDMRegistryAgent();
  const result = await abdmAgent.searchPatients(validated);

  if (result.success) {
    const data = result.data as PatientSearchData;
    return successResponse({
      patients: data.patients || [],
      totalCount: data.totalCount || 0,
      searchParams: validated,
      source: data.source || 'ABDM_M1_REGISTRY',
      message: `Found ${data.totalCount || 0} patients`
    });
  } else {
    return successResponse({
      patients: [],
      totalCount: 0,
      searchParams: validated,
      error: result.error,
      message: 'Patient search failed'
    }, 500);
  }
});