/**
 * UHI Fulfillment Agent
 * Handles provider discovery and appointment booking through UHI network
 * Implements discovery → select → confirm flow with mock responses for hackathon reliability
 */

import type { ToolResult } from '../../types';
import { getEnv } from '../env';
import { getFirestore } from '../gcp/firestore';
import type { Firestore } from '@google-cloud/firestore';

export interface UHIDiscoveryParams {
  location?: {
    gps?: string;
    city?: string;
    pincode?: string;
  };
  category: 'Consultation' | 'Diagnostics' | 'Pharmacy' | 'Wellness';
  fulfillmentType: 'Teleconsultation' | 'Physical';
  specialization?: string;
  availability?: string;
  maxDistance?: number;
}

export interface UHIProvider {
  id: string;
  name: string;
  type: 'Hospital' | 'Clinic' | 'Individual' | 'Pharmacy' | 'Lab';
  category: string;
  location: {
    city: string;
    address: string;
    gps?: string;
    pincode: string;
  };
  contact: {
    phone?: string;
    email?: string;
  };
  services: UHIService[];
  rating?: number;
  experience?: string;
  languages?: string[];
  availability: {
    nextSlot?: string;
    workingHours?: string;
  };
}

export interface UHIService {
  id: string;
  name: string;
  specialization: string;
  type: 'Teleconsultation' | 'Physical' | 'Diagnostic' | 'Medicine';
  price: {
    amount: number;
    currency: string;
  };
  duration: number; // in minutes
  description?: string;
  availableSlots?: string[];
}

export interface UHIBookingParams {
  providerId: string;
  itemId: string;
  transactionId: string;
  abhaAddress: string;
  appointmentTime: string;
  paymentMethod: 'cash' | 'upi' | 'card' | 'insurance' | 'free';
  symptoms?: string;
  emergencyContact?: {
    name: string;
    mobile: string;
    relation: string;
  };
}

export interface UHIBookingResult {
  bookingId: string;
  status: 'confirmed' | 'pending' | 'failed';
  appointmentDetails: {
    dateTime: string;
    provider: string;
    service: string;
    mode: string;
    meetingLink?: string;
    address?: string;
  };
  paymentDetails?: {
    amount: number;
    method: string;
    transactionId?: string;
  };
}

interface UHITransaction {
  searchParams: UHIDiscoveryParams;
  providers: UHIProvider[];
  timestamp: Date;
  selectedProvider?: UHIProvider;
  selectedService?: UHIService;
  patientDetails?: Record<string, unknown>;
  selectionTimestamp?: Date;
}

/**
 * UHI Fulfillment Agent for Healthcare Provider Discovery and Booking
 */
export class UHIFulfillmentAgent {
  private mockMode: boolean;
  private firestore: Firestore;
  private transactionMap: Map<string, UHITransaction> = new Map();

  constructor() {
    this.mockMode = getEnv().MOCK_UHI_RESPONSES;
    this.firestore = getFirestore();
  }

  /**
   * Discovers healthcare providers through UHI network
   */
  async discoverProviders(params: UHIDiscoveryParams): Promise<ToolResult> {
    try {
      const transactionId = this.generateTransactionId();

      if (this.mockMode) {
        return await this.mockProviderDiscovery(params, transactionId);
      } else {
        return await this.realProviderDiscovery(params, transactionId);
      }
    } catch (error) {
      return {
        success: false,
        error: `Provider discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Selects a specific provider and service
   */
  async selectProvider(
    providerId: string,
    itemId: string,
    transactionId: string,
    patientDetails?: Record<string, unknown>
  ): Promise<ToolResult> {
    try {
      if (this.mockMode) {
        return await this.mockProviderSelection(providerId, itemId, transactionId, patientDetails);
      } else {
        return await this.realProviderSelection(providerId, itemId, transactionId);
      }
    } catch (error) {
      return {
        success: false,
        error: `Provider selection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Books healthcare appointment
   */
  async bookAppointment(params: UHIBookingParams): Promise<ToolResult> {
    try {
      if (this.mockMode) {
        return await this.mockAppointmentBooking(params);
      } else {
        return await this.realAppointmentBooking(params);
      }
    } catch (error) {
      return {
        success: false,
        error: `Appointment booking failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Mock provider discovery for demonstration
   */
  private async mockProviderDiscovery(
    params: UHIDiscoveryParams,
    transactionId: string
  ): Promise<ToolResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));

    const providers: UHIProvider[] = [];
    const searchCity = params.location?.city || 'Lucknow';
    const searchGPS = params.location?.gps || '26.8467,80.9462';

    // Generate realistic mock providers based on search parameters
    const providerTemplates = [
      {
        name: 'डॉ. अमित शर्मा - सामान्य चिकित्सा क्लिनिक',
        type: 'Clinic' as const,
        specialization: 'General Medicine',
        experience: '15+ years',
        rating: 4.5
      },
      {
        name: 'गंगा राम अस्पताल',
        type: 'Hospital' as const,
        specialization: 'Multi-specialty',
        experience: '25+ years',
        rating: 4.8
      },
      {
        name: 'डॉ. सुनीता गुप्ता - स्त्री रोग विशेषज्ञ',
        type: 'Individual' as const,
        specialization: 'Gynecology',
        experience: '12+ years',
        rating: 4.6
      },
      {
        name: 'केयर मल्टी-स्पेशियलिटी सेंटर',
        type: 'Hospital' as const,
        specialization: 'Cardiology',
        experience: '20+ years',
        rating: 4.7
      }
    ];

    for (let i = 0; i < providerTemplates.length; i++) {
      const template = providerTemplates[i];

      // Apply specialization filter
      if (params.specialization &&
          !template.specialization.toLowerCase().includes(params.specialization.toLowerCase())) {
        continue;
      }

      const services: UHIService[] = [];

      // Generate services based on fulfillment type
      if (params.fulfillmentType === 'Teleconsultation') {
        services.push({
          id: `service_${i}_tele`,
          name: `${template.specialization} ऑनलाइन परामर्श`,
          specialization: template.specialization,
          type: 'Teleconsultation',
          price: { amount: 300 + i * 100, currency: 'INR' },
          duration: 20,
          description: 'वीडियो कॉल के माध्यम से चिकित्सा परामर्श',
          availableSlots: this.generateTimeSlots()
        });
      } else {
        services.push({
          id: `service_${i}_physical`,
          name: `${template.specialization} व्यक्तिगत परामर्श`,
          specialization: template.specialization,
          type: 'Physical',
          price: { amount: 500 + i * 150, currency: 'INR' },
          duration: 30,
          description: 'क्लिनिक में व्यक्तिगत जांच और परामर्श',
          availableSlots: this.generateTimeSlots()
        });
      }

      // Calculate distance from search location
      const [searchLat, searchLng] = searchGPS.split(',').map(Number);
      const providerLat = searchLat + (Math.random() - 0.5) * 0.05;
      const providerLng = searchLng + (Math.random() - 0.5) * 0.05;

      providers.push({
        id: `provider_${transactionId}_${i}`,
        name: template.name,
        type: template.type,
        category: params.category,
        location: {
          city: searchCity,
          address: `सेक्टर ${i + 10}, ${searchCity}, उत्तर प्रदेश`,
          gps: `${providerLat.toFixed(6)},${providerLng.toFixed(6)}`,
          pincode: `22601${i}`
        },
        contact: {
          phone: `+91-${9876543210 + i}`,
          email: `contact${i}@healthcare.in`
        },
        services,
        rating: template.rating,
        experience: template.experience,
        languages: ['Hindi', 'English'],
        availability: {
          nextSlot: this.getNextAvailableSlot(),
          workingHours: '9:00 AM - 8:00 PM'
        }
      });
    }

    // Store transaction for later steps
    this.transactionMap.set(transactionId, {
      searchParams: params,
      providers,
      timestamp: new Date()
    });

    return {
      success: true,
      data: {
        transactionId,
        providers,
        totalCount: providers.length,
        searchParams: params,
        message: `Found ${providers.length} healthcare providers`,
        source: 'UHI_MOCK_DISCOVERY'
      }
    };
  }

  /**
   * Mock provider selection
   */
  private async mockProviderSelection(
    providerId: string,
    itemId: string,
    transactionId: string,
    patientDetails?: Record<string, unknown>
  ): Promise<ToolResult> {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

    const transaction = this.transactionMap.get(transactionId);
    if (!transaction) {
      return {
        success: false,
        error: 'Transaction not found. Please start with provider discovery.'
      };
    }

    const provider = transaction.providers.find((p: UHIProvider) => p.id === providerId);
    const service = provider?.services.find((s: UHIService) => s.id === itemId);

    if (!provider || !service) {
      return {
        success: false,
        error: 'Provider or service not found'
      };
    }

    // Update transaction with selection
    this.transactionMap.set(transactionId, {
      ...transaction,
      selectedProvider: provider,
      selectedService: service,
      patientDetails,
      selectionTimestamp: new Date()
    });

    return {
      success: true,
      data: {
        transactionId,
        selectedProvider: {
          id: provider.id,
          name: provider.name,
          type: provider.type,
          location: provider.location
        },
        selectedService: {
          id: service.id,
          name: service.name,
          specialization: service.specialization,
          price: service.price,
          duration: service.duration
        },
        availableSlots: service.availableSlots,
        nextSteps: [
          'Select preferred appointment time',
          'Confirm patient details',
          'Choose payment method',
          'Complete booking'
        ],
        source: 'UHI_MOCK_SELECT'
      }
    };
  }

  /**
   * Mock appointment booking
   */
  private async mockAppointmentBooking(params: UHIBookingParams): Promise<ToolResult> {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 700));

    const transaction = this.transactionMap.get(params.transactionId);
    if (!transaction) {
      return {
        success: false,
        error: 'Transaction not found. Please start with provider discovery.'
      };
    }

    const bookingId = `BOOKING_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Create appointment record in Firestore
    const appointmentDoc = {
      bookingId,
      transactionId: params.transactionId,
      providerId: params.providerId,
      serviceId: params.itemId,
      patientAbhaAddress: params.abhaAddress,
      appointmentTime: params.appointmentTime,
      paymentMethod: params.paymentMethod,
      symptoms: params.symptoms,
      emergencyContact: params.emergencyContact,
      status: 'confirmed',
      createdAt: new Date(),
      provider: transaction.selectedProvider,
      service: transaction.selectedService
    };

    await this.firestore.collection('uhi_bookings').doc(bookingId).set(appointmentDoc);

    const isTelemedicine = transaction.selectedService?.type === 'Teleconsultation';

    return {
      success: true,
      data: {
        bookingId,
        status: 'confirmed',
        appointmentDetails: {
          dateTime: params.appointmentTime,
          provider: transaction.selectedProvider?.name,
          service: transaction.selectedService?.name,
          mode: transaction.selectedService?.type,
          meetingLink: isTelemedicine ? `https://meet.healthcare.in/room/${bookingId}` : undefined,
          address: !isTelemedicine ? transaction.selectedProvider?.location.address : undefined
        },
        paymentDetails: {
          amount: transaction.selectedService?.price?.amount || 0,
          method: params.paymentMethod,
          transactionId: `PAY_${bookingId}`,
          status: params.paymentMethod === 'free' ? 'free' : 'pending'
        },
        confirmationDetails: {
          patientInstructions: isTelemedicine
            ? ['Join the video call 5 minutes before appointment time', 'Ensure stable internet connection', 'Keep your medical documents ready']
            : ['Reach the clinic 15 minutes early', 'Carry valid ID proof and medical documents', 'Follow COVID safety protocols'],
          providerInstructions: 'You will receive a confirmation SMS and email with appointment details',
          cancellationPolicy: 'Free cancellation up to 2 hours before appointment time'
        },
        source: 'UHI_MOCK_BOOKING'
      }
    };
  }

  /**
   * Real UHI provider discovery (for production use)
   */
  private async realProviderDiscovery(
    params: UHIDiscoveryParams,
    transactionId: string
  ): Promise<ToolResult> {
    try {
      const uhiRequest = {
        context: {
          domain: 'nic2004:85111',
          action: 'search',
          timestamp: new Date().toISOString(),
          message_id: `msg_${transactionId}`,
          transaction_id: transactionId
        },
        message: {
          intent: {
            fulfillment: {
              type: params.fulfillmentType,
              agent: { name: 'Vaidya-Agent' }
            },
            category: {
              descriptor: { name: params.category }
            },
            location: params.location ? {
              gps: params.location.gps,
              city: params.location.city
            } : undefined
          }
        }
      };

      const response = await fetch(`${getEnv().UHI_GATEWAY_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uhiRequest)
      });

      const data = await response.json();

      return {
        success: true,
        data: {
          transactionId,
          providers: data.message?.catalog?.providers || [],
          source: 'UHI_LIVE_DISCOVERY'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Real UHI discovery failed: ${error instanceof Error ? error.message : 'API error'}`
      };
    }
  }

  /**
   * Real UHI provider selection (for production use)
   */
  private async realProviderSelection(
    providerId: string,
    itemId: string,
    transactionId: string
    // patientDetails parameter intentionally omitted until UHI schema supports it
  ): Promise<ToolResult> {
    try {
      const uhiRequest = {
        context: {
          domain: 'nic2004:85111',
          action: 'select',
          timestamp: new Date().toISOString(),
          message_id: `msg_${Date.now()}`,
          transaction_id: transactionId
        },
        message: {
          order: {
            provider: { id: providerId },
            items: [{ id: itemId }]
          }
        }
      };

      const response = await fetch(`${getEnv().UHI_GATEWAY_URL}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uhiRequest)
      });

      const data = await response.json();

      return {
        success: true,
        data: {
          transactionId,
          selection: data.message?.order || {},
          source: 'UHI_LIVE_SELECT'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Real UHI selection failed: ${error instanceof Error ? error.message : 'API error'}`
      };
    }
  }

  /**
   * Real UHI appointment booking (for production use)
   */
  private async realAppointmentBooking(params: UHIBookingParams): Promise<ToolResult> {
    try {
      const uhiRequest = {
        context: {
          domain: 'nic2004:85111',
          action: 'confirm',
          timestamp: new Date().toISOString(),
          message_id: `msg_${Date.now()}`,
          transaction_id: params.transactionId
        },
        message: {
          order: {
            provider: { id: params.providerId },
            items: [{ id: params.itemId }],
            fulfillment: {
              type: 'Physical',
              start: { time: { timestamp: params.appointmentTime } }
            },
            payment: { type: params.paymentMethod }
          }
        }
      };

      const response = await fetch(`${getEnv().UHI_GATEWAY_URL}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uhiRequest)
      });

      const data = await response.json();

      return {
        success: true,
        data: {
          booking: data.message?.order || {},
          source: 'UHI_LIVE_BOOKING'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Real UHI booking failed: ${error instanceof Error ? error.message : 'API error'}`
      };
    }
  }

  /**
   * Utility: Generate transaction ID
   */
  private generateTransactionId(): string {
    return `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  /**
   * Utility: Generate available time slots
   */
  private generateTimeSlots(): string[] {
    const slots: string[] = [];
    const now = new Date();

    for (let i = 1; i <= 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);

      // Morning slots
      for (let hour = 9; hour <= 12; hour++) {
        slots.push(`${date.toISOString().split('T')[0]}T${hour.toString().padStart(2, '0')}:00:00`);
      }

      // Evening slots
      for (let hour = 15; hour <= 18; hour++) {
        slots.push(`${date.toISOString().split('T')[0]}T${hour.toString().padStart(2, '0')}:00:00`);
      }
    }

    return slots.slice(0, 10); // Return first 10 available slots
  }

  /**
   * Utility: Get next available slot
   */
  private getNextAvailableSlot(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow.toISOString();
  }

  /**
   * Gets booking details
   */
  async getBookingDetails(bookingId: string): Promise<ToolResult> {
    try {
      const doc = await this.firestore.collection('uhi_bookings').doc(bookingId).get();

      if (!doc.exists) {
        return {
          success: false,
          error: 'Booking not found'
        };
      }

      return {
        success: true,
        data: {
          booking: doc.data(),
          source: 'UHI_BOOKING_DETAILS'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get booking details: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}