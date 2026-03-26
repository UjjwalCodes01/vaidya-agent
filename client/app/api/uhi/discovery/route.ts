/**
 * UHI Provider Discovery Endpoint
 * POST /api/uhi/discovery
 *
 * Healthcare provider discovery through UHI network
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  parseRequestBody,
} from '@/lib/api-middleware';
import { UHIFulfillmentAgent, type UHIProvider } from '@/lib/agents/uhi-fulfillment';
import { uhiDiscoverySchema } from '@/lib/validations';

// UHI Discovery Response Type
interface UHIDiscoveryData {
  transactionId: string;
  providers: UHIProvider[];
  totalCount: number;
  source: string;
  message: string;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody(request);
  const validated = uhiDiscoverySchema.parse(body);

  const uhiAgent = new UHIFulfillmentAgent();

  // Transform schema structure to UHIDiscoveryParams
  const discoveryParams = {
    category: validated.intent?.category?.descriptor?.name as 'Consultation' | 'Diagnostics' | 'Pharmacy' | 'Wellness' || 'Consultation',
    fulfillmentType: validated.intent?.fulfillment?.type || 'Physical',
    location: validated.intent?.location ? {
      gps: validated.intent.location.gps,
      city: validated.intent.location.city
    } : undefined
  };

  const result = await uhiAgent.discoverProviders(discoveryParams);

  if (result.success) {
    const data = result.data as UHIDiscoveryData;
    return successResponse({
      transactionId: data.transactionId,
      providers: data.providers || [],
      totalCount: data.totalCount || 0,
      searchParams: validated,
      source: data.source || 'UHI_DISCOVERY',
      message: data.message || 'Provider discovery completed'
    });
  } else {
    return successResponse({
      providers: [],
      totalCount: 0,
      searchParams: validated,
      error: result.error,
      message: 'Provider discovery failed'
    }, 500);
  }
});