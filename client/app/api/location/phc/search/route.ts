/**
 * PHC Discovery Endpoint
 * POST /api/location/phc/search
 *
 * Finds nearest Primary Health Centers using Google Maps and ABDM registry
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  parseRequestBody,
} from '@/lib/api-middleware';
import { LocationService, type PHCResult } from '@/lib/services/location-service';
import { z } from 'zod';

// PHC Search Response Type
interface PHCSearchData {
  facilities: PHCResult[];
  totalFound: number;
  abdmVerified: number;
  searchCenter: { lat: number; lng: number };
  searchRadius: number;
  source: string;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody(request);

  // Simple validation for location search
  const locationSchema = z.object({
    gps: z.string().min(1, 'GPS coordinates are required'),
    radiusKm: z.number().optional(),
    facilityTypes: z.array(z.enum(['PHC', 'CHC', 'SubCenter', 'Hospital'])).optional(),
    includePrivate: z.boolean().optional(),
  });

  const validated = locationSchema.parse(body);

  const locationService = new LocationService();
  const result = await locationService.findNearestPHC(validated);

  if (result.success) {
    const data = result.data as PHCSearchData;
    return successResponse({
      facilities: data.facilities || [],
      totalFound: data.totalFound || 0,
      abdmVerified: data.abdmVerified || 0,
      searchCenter: data.searchCenter,
      searchRadius: data.searchRadius,
      source: data.source || 'GOOGLE_MAPS_ABDM_COMBINED',
      message: `Found ${data.totalFound || 0} healthcare facilities`
    });
  } else {
    return successResponse({
      facilities: [],
      totalFound: 0,
      abdmVerified: 0,
      error: result.error,
      message: 'PHC search failed'
    }, 500);
  }
});