/**
 * ABDM Consent Request Endpoint (M3 Milestone)
 * POST /api/abdm/consent/request
 *
 * Initiates FHIR-compliant consent workflow for health data access
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  parseRequestBody,
} from '@/lib/api-middleware';
import { ConsentManager } from '@/lib/abdm/consent-manager';
import { consentRequestSchema } from '@/lib/validations';

// ABDM Consent Response Type
interface ConsentRequestData {
  requestId: string;
  otpRequired: boolean;
  consentId?: string;
  source: string;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody(request);
  const validated = consentRequestSchema.parse(body);

  const consentManager = new ConsentManager();
  const result = await consentManager.initiateConsentRequest(validated);

  if (result.success) {
    const data = result.data as ConsentRequestData;
    return successResponse({
      consentRequest: result.data,
      requestId: data.requestId,
      otpRequired: data.otpRequired || false,
      consentId: data.consentId,
      source: data.source || 'ABDM_M3_CONSENT',
      message: 'Consent request initiated successfully'
    });
  } else {
    return successResponse({
      consentRequest: null,
      requestId: null,
      otpRequired: false,
      error: result.error,
      message: 'Consent request failed'
    }, 500);
  }
});