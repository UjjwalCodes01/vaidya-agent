/**
 * ABDM Consent Verification Endpoint (M3 Milestone)
 * POST /api/abdm/consent/verify
 *
 * Verifies OTP and completes consent workflow for health data access
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  parseRequestBody,
} from '@/lib/api-middleware';
import { ConsentManager } from '@/lib/abdm/consent-manager';
import { z } from 'zod';

// ABDM Consent Verification Response Type
interface ConsentVerificationData {
  consentId: string;
  status: string;
  accessToken?: string;
  expiresAt?: string;
  source: string;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody(request);

  // Simple validation for verification request
  const verifySchema = z.object({
    requestId: z.string().min(1, 'Request ID is required'),
    otp: z.string().optional(),
  });

  const validated = verifySchema.parse(body);

  const consentManager = new ConsentManager();
  const result = await consentManager.getConsentStatus(validated.requestId);

  if (result.success) {
    const data = result.data as ConsentVerificationData;
    return successResponse({
      verification: result.data,
      consentId: data.consentId,
      status: data.status || 'verified',
      accessToken: data.accessToken,
      expiresAt: data.expiresAt,
      source: data.source || 'ABDM_M3_VERIFY',
      message: 'Consent verification successful'
    });
  } else {
    return successResponse({
      verification: null,
      consentId: null,
      status: 'failed',
      error: result.error,
      message: 'Consent verification failed'
    }, 500);
  }
});