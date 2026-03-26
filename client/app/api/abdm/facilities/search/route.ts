/**
 * ABDM Facility Search Endpoint (M2 Milestone)
 * POST /api/abdm/facilities/search
 *
 * Healthcare facility discovery through ABDM HFR registry
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  parseRequestBody,
} from '@/lib/api-middleware';
import { ABDMRegistryAgent } from '@/lib/agents/abdm-registry';
import type { HealthFacility } from '@/types';
import { hfrSearchSchema } from '@/lib/validations';

// ABDM Facility Search Response Type
interface FacilitySearchData {
  facilities: HealthFacility[];
  totalCount: number;
  source: string;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody(request);
  const validated = hfrSearchSchema.parse(body);

  const abdmAgent = new ABDMRegistryAgent();

  // Ensure facilityType is properly typed
  const searchParams = {
    ...validated,
    facilityType: validated.facilityType as 'Hospital' | 'PHC' | 'CHC' | 'SubCenter' | 'Clinic' | 'Diagnostic' | undefined
  };

  const result = await abdmAgent.searchFacilities(searchParams);

  if (result.success) {
    const data = result.data as FacilitySearchData;
    return successResponse({
      facilities: data.facilities || [],
      totalCount: data.totalCount || 0,
      searchParams: validated,
      source: data.source || 'ABDM_M2_HFR',
      message: `Found ${data.totalCount || 0} healthcare facilities`
    });
  } else {
    return successResponse({
      facilities: [],
      totalCount: 0,
      searchParams: validated,
      error: result.error,
      message: 'Facility search failed'
    }, 500);
  }
});