/**
 * UHI Appointment Booking Endpoint
 * POST /api/uhi/confirm
 *
 * Confirms and books healthcare appointments through UHI network
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  parseRequestBody,
} from '@/lib/api-middleware';
import { UHIFulfillmentAgent } from '@/lib/agents/uhi-fulfillment';
import { uhiConfirmSchema } from '@/lib/validations';

// UHI Booking Response Type
interface UHIBookingData {
  bookingId: string;
  status: 'confirmed' | 'pending' | 'failed';
  source: string;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody(request);
  const validated = uhiConfirmSchema.parse(body);

  const uhiAgent = new UHIFulfillmentAgent();

  // Transform validation structure to UHIBookingParams
  const bookingParams = {
    providerId: validated.order.provider.id,
    itemId: validated.order.items[0]?.id || '',
    transactionId: validated.context.transaction_id,
    abhaAddress: validated.order.customer.id,
    appointmentTime: validated.order.fulfillment.end.time.timestamp,
    paymentMethod: 'cash' as const,
    symptoms: undefined,
    emergencyContact: undefined
  };

  const result = await uhiAgent.bookAppointment(bookingParams);

  if (result.success) {
    const data = result.data as UHIBookingData;
    return successResponse({
      booking: result.data,
      bookingId: data.bookingId,
      status: data.status || 'confirmed',
      source: data.source || 'UHI_CONFIRM',
      message: 'Appointment booking successful'
    });
  } else {
    return successResponse({
      booking: null,
      bookingId: null,
      status: 'failed',
      error: result.error,
      message: 'Appointment booking failed'
    }, 500);
  }
});