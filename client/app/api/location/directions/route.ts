/**
 * Facility Directions Endpoint
 * POST /api/location/directions
 *
 * Get directions to healthcare facilities using Google Maps
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  parseRequestBody,
} from '@/lib/api-middleware';
import { LocationService, type DirectionsResult } from '@/lib/services/location-service';
import { z } from 'zod';

// Location Directions Response Type
interface DirectionsData {
  directions: DirectionsResult;
  from: string;
  to: string;
  travelMode: string;
  source: string;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody(request);

  // Simple validation for directions request
  const directionsSchema = z.object({
    fromGPS: z.string().min(1, 'From GPS coordinates are required'),
    facilityGPS: z.string().min(1, 'Facility GPS coordinates are required'),
    travelMode: z.enum(['driving', 'walking', 'transit', 'bicycling']).optional(),
    avoidTolls: z.boolean().optional(),
    language: z.enum(['hi', 'en', 'bn', 'te', 'mr', 'ta', 'gu']).optional(),
  });

  const validated = directionsSchema.parse(body);

  const locationService = new LocationService();

  // Transform validation structure to DirectionsParams
  const directionsParams = {
    fromGPS: validated.fromGPS,
    facilityGPS: validated.facilityGPS,
    travelMode: validated.travelMode || 'driving',
    avoidTolls: validated.avoidTolls || false,
    language: validated.language || 'hi'
  };

  const result = await locationService.getDirectionsToFacility(directionsParams);

  if (result.success) {
    const data = result.data as DirectionsData;
    return successResponse({
      directions: data.directions,
      from: data.from,
      to: data.to,
      travelMode: data.travelMode,
      source: data.source || 'GOOGLE_MAPS_DIRECTIONS',
      message: 'Directions retrieved successfully'
    });
  } else {
    return successResponse({
      directions: null,
      error: result.error,
      message: 'Failed to get directions'
    }, 500);
  }
});