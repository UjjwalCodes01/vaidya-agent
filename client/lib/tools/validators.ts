/**
 * Type-safe parameter validation for tool execution
 * Provides runtime validation with proper TypeScript types
 */

import type { ToolResult } from '../../types';
import type {
  PatientSearchParams,
  FacilitySearchParams,
} from '../agents/abdm-registry';
import type {
  UHIDiscoveryParams,
  UHIBookingParams,
} from '../agents/uhi-fulfillment';
import type { ConsentRequestParams } from '../abdm/consent-manager';
import type { LocationParams, DirectionsParams } from '../services/location-service';

/**
 * Type guard to check if a value is a record object
 */
function isRecordObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validates and converts unknown parameters to typed parameters
 * Returns error result if validation fails
 */
export function validatePatientSearchParams(
  params: Record<string, unknown>
): PatientSearchParams | ToolResult {
  // All fields are optional in PatientSearchParams
  return {
    healthId: typeof params.healthId === 'string' ? params.healthId : undefined,
    mobile: typeof params.mobile === 'string' ? params.mobile : undefined,
    name: typeof params.name === 'string' ? params.name : undefined,
    yearOfBirth: typeof params.yearOfBirth === 'string' ? params.yearOfBirth : undefined,
    gender: params.gender === 'M' || params.gender === 'F' || params.gender === 'O' ? params.gender : undefined,
  };
}

export function validateFacilitySearchParams(
  params: Record<string, unknown>
): FacilitySearchParams | ToolResult {
  // Validate facility type if provided
  let facilityType: FacilitySearchParams['facilityType'] = undefined;
  if (typeof params.facilityType === 'string') {
    const validTypes: Array<FacilitySearchParams['facilityType']> = [
      'Hospital', 'PHC', 'CHC', 'SubCenter', 'Clinic', 'Diagnostic'
    ];
    if (validTypes.includes(params.facilityType as FacilitySearchParams['facilityType'])) {
      facilityType = params.facilityType as FacilitySearchParams['facilityType'];
    }
  }

  return {
    facilityType,
    city: typeof params.city === 'string' ? params.city : undefined,
    state: typeof params.state === 'string' ? params.state : undefined,
    gps: typeof params.gps === 'string' ? params.gps : undefined,
    radius: typeof params.radius === 'number' ? params.radius : undefined,
  };
}

export function validateConsentRequestParams(
  params: Record<string, unknown>
): ConsentRequestParams | ToolResult {
  // Validate required fields
  if (typeof params.patientAbhaAddress !== 'string') {
    return {
      success: false,
      error: 'Missing required parameter: patientAbhaAddress (string)',
    };
  }

  if (typeof params.purpose !== 'string') {
    return {
      success: false,
      error: 'Missing required parameter: purpose (string)',
    };
  }

  if (!Array.isArray(params.hiTypes)) {
    return {
      success: false,
      error: 'Missing required parameter: hiTypes (array)',
    };
  }

  if (typeof params.dateRangeFrom !== 'string') {
    return {
      success: false,
      error: 'Missing required parameter: dateRangeFrom (string)',
    };
  }

  if (typeof params.dateRangeTo !== 'string') {
    return {
      success: false,
      error: 'Missing required parameter: dateRangeTo (string)',
    };
  }

  if (typeof params.requesterName !== 'string') {
    return {
      success: false,
      error: 'Missing required parameter: requesterName (string)',
    };
  }

  if (typeof params.requesterIdentifier !== 'string') {
    return {
      success: false,
      error: 'Missing required parameter: requesterIdentifier (string)',
    };
  }

  return {
    patientAbhaAddress: params.patientAbhaAddress,
    purpose: params.purpose as ConsentRequestParams['purpose'],
    hiTypes: params.hiTypes as string[],
    dateRangeFrom: params.dateRangeFrom,
    dateRangeTo: params.dateRangeTo,
    requesterName: params.requesterName,
    requesterIdentifier: params.requesterIdentifier,
    dataEraseAt: typeof params.dataEraseAt === 'string' ? params.dataEraseAt : undefined,
  };
}

export function validateUHIDiscoveryParams(
  params: Record<string, unknown>
): UHIDiscoveryParams | ToolResult {
  // Validate required category
  if (typeof params.category !== 'string') {
    return {
      success: false,
      error: 'Missing required parameter: category (string)',
    };
  }

  const validCategories = ['Consultation', 'Diagnostics', 'Pharmacy', 'Wellness'];
  if (!validCategories.includes(params.category)) {
    return {
      success: false,
      error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
    };
  }

  return {
    category: params.category as UHIDiscoveryParams['category'],
    fulfillmentType: params.fulfillmentType === 'Teleconsultation' || params.fulfillmentType === 'Physical'
      ? params.fulfillmentType
      : 'Physical',
    location: params.location && typeof params.location === 'object'
      ? params.location as UHIDiscoveryParams['location']
      : undefined,
    specialization: typeof params.specialization === 'string' ? params.specialization : undefined,
    availability: typeof params.availability === 'string' ? params.availability : undefined,
    maxDistance: typeof params.maxDistance === 'number' ? params.maxDistance : undefined,
  };
}

export function validateUHIBookingParams(
  params: Record<string, unknown>
): UHIBookingParams | ToolResult {
  // Validate required fields
  if (typeof params.providerId !== 'string') {
    return { success: false, error: 'Missing required parameter: providerId (string)' };
  }
  if (typeof params.itemId !== 'string') {
    return { success: false, error: 'Missing required parameter: itemId (string)' };
  }
  if (typeof params.transactionId !== 'string') {
    return { success: false, error: 'Missing required parameter: transactionId (string)' };
  }
  if (typeof params.abhaAddress !== 'string') {
    return { success: false, error: 'Missing required parameter: abhaAddress (string)' };
  }
  if (typeof params.appointmentTime !== 'string') {
    return { success: false, error: 'Missing required parameter: appointmentTime (string)' };
  }
  if (typeof params.paymentMethod !== 'string') {
    return { success: false, error: 'Missing required parameter: paymentMethod (string)' };
  }

  return {
    providerId: params.providerId,
    itemId: params.itemId,
    transactionId: params.transactionId,
    abhaAddress: params.abhaAddress,
    appointmentTime: params.appointmentTime,
    paymentMethod: params.paymentMethod as UHIBookingParams['paymentMethod'],
    symptoms: typeof params.symptoms === 'string' ? params.symptoms : undefined,
    emergencyContact: isRecordObject(params.emergencyContact) 
      ? params.emergencyContact as UHIBookingParams['emergencyContact']
      : undefined,
  };
}

export function validateLocationParams(
  params: Record<string, unknown>
): LocationParams | ToolResult {
  if (typeof params.gps !== 'string') {
    return { success: false, error: 'Missing required parameter: gps (string)' };
  }

  return {
    gps: params.gps,
    radiusKm: typeof params.radiusKm === 'number' ? params.radiusKm : undefined,
    facilityTypes: Array.isArray(params.facilityTypes) ? params.facilityTypes as LocationParams['facilityTypes'] : undefined,
    includePrivate: typeof params.includePrivate === 'boolean' ? params.includePrivate : undefined,
  };
}

export function validateDirectionsParams(
  params: Record<string, unknown>
): DirectionsParams | ToolResult {
  if (typeof params.fromGPS !== 'string') {
    return { success: false, error: 'Missing required parameter: fromGPS (string)' };
  }
  if (typeof params.facilityGPS !== 'string') {
    return { success: false, error: 'Missing required parameter: facilityGPS (string)' };
  }

  const validLanguages = ['hi', 'en', 'bn', 'te', 'mr', 'ta', 'gu'];
  const language = typeof params.language === 'string' && validLanguages.includes(params.language)
    ? params.language as DirectionsParams['language']
    : undefined;

  return {
    fromGPS: params.fromGPS,
    facilityGPS: params.facilityGPS,
    travelMode: params.travelMode === 'driving' || params.travelMode === 'walking' || params.travelMode === 'transit' || params.travelMode === 'bicycling'
      ? params.travelMode
      : undefined,
    avoidTolls: typeof params.avoidTolls === 'boolean' ? params.avoidTolls : undefined,
    language,
  };
}

export { isRecordObject };
