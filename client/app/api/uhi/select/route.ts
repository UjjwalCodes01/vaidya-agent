/**
 * UHI Provider Selection Endpoint
 * POST /api/uhi/select
 *
 * Healthcare provider and service selection in UHI workflow
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  parseRequestBody,
} from '@/lib/api-middleware';
import { UHIFulfillmentAgent } from '@/lib/agents/uhi-fulfillment';
import { uhiSelectSchema } from '@/lib/validations';

// UHI Selection Response Type
interface UHISelectionData {
  selectionId?: string;
  providerId: string;
  itemId: string;
  source: string;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody(request);
  const validated = uhiSelectSchema.parse(body);

  const uhiAgent = new UHIFulfillmentAgent();

  // Extract parameters from UHI schema structure
  const providerId = validated.provider?.id;
  const itemId = validated.items?.[0]?.id;
  const transactionId = validated.context?.transaction_id;
  const patientDetails = undefined; // Not included in current schema

  if (!providerId || !itemId || !transactionId) {
    return successResponse({
      error: 'Missing required parameters: providerId, itemId, or transactionId',
      message: 'Provider selection failed'
    }, 400);
  }

  const result = await uhiAgent.selectProvider(providerId, itemId, transactionId, patientDetails);

  if (result.success) {
    const data = result.data as UHISelectionData;
    return successResponse({
      selection: result.data,
      transactionId,
      source: data.source || 'UHI_SELECT',
      message: 'Provider selection successful'
    });
  } else {
    return successResponse({
      selection: null,
      transactionId,
      error: result.error,
      message: 'Provider selection failed'
    }, 500);
  }
});