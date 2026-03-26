/**
 * ABDM M3 Consent Manager
 * FHIR R4-compliant consent management with ABHA OTP verification
 * Implements Milestone M3 for secure health data access authorization
 */

import type { ToolResult } from '../../types';
import { abdmRequest } from '../abdm/client';
import { getEnv } from '../env';
import { getFirestore } from '../gcp/firestore';
import type { Firestore } from '@google-cloud/firestore';

export interface ConsentRequestParams {
  patientAbhaAddress: string;
  purpose: 'CAREMGT' | 'BTG' | 'PUBHLTH' | 'HPAYMT' | 'DSRCH' | 'PATRQT';
  hiTypes: string[];
  dateRangeFrom: string;
  dateRangeTo: string;
  requesterName: string;
  requesterIdentifier: string;
  dataEraseAt?: string;
}

export interface ConsentStatus {
  requestId: string;
  status: 'REQUESTED' | 'GRANTED' | 'DENIED' | 'EXPIRED' | 'REVOKED';
  createdAt: Date;
  expiresAt?: Date;
  otpVerified?: boolean;
  fhirConsentId?: string;
}

export interface FHIRConsent {
  resourceType: 'Consent';
  id: string;
  status: 'draft' | 'proposed' | 'active' | 'rejected' | 'inactive' | 'entered-in-error';
  scope: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  };
  category: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  patient: {
    reference: string;
    identifier: {
      system: string;
      value: string;
    };
  };
  dateTime: string;
  performer?: Array<{
    reference: string;
  }>;
  purpose: Array<{
    system: string;
    code: string;
  }>;
  provision: {
    type: 'deny' | 'permit';
    period?: {
      start: string;
      end: string;
    };
    data?: Array<{
      meaning: 'instance' | 'related' | 'dependents' | 'authoredby';
      reference: {
        reference: string;
      };
    }>;
  };
}

// ABDM API Response Types
interface ABDMConsentResponse {
  consentRequestId: string;
  status?: string;
  createdAt?: string;
}

interface ABDMOTPVerificationResponse {
  verified: boolean;
  consentId?: string;
  message?: string;
  accessToken?: string;
  expiresAt?: string;
}

/**
 * ABDM M3 Consent Manager - FHIR-compliant consent workflow
 */
export class ConsentManager {
  private mockMode: boolean;
  private firestore: Firestore;

  constructor() {
    this.mockMode = getEnv().MOCK_ABDM_RESPONSES;
    this.firestore = getFirestore();
  }

  /**
   * Initiates M3 consent request workflow
   */
  async initiateConsentRequest(params: ConsentRequestParams): Promise<ToolResult> {
    try {
      const requestId = this.generateConsentRequestId();

      // Create FHIR-compliant consent resource
      const fhirConsent = this.createFHIRConsent(params, requestId);

      // Store consent request in Firestore for tracking
      await this.storeConsentRequest(requestId, params, fhirConsent);

      if (this.mockMode) {
        return await this.mockConsentRequest(requestId, params, fhirConsent);
      } else {
        return await this.realConsentRequest(requestId, params, fhirConsent);
      }
    } catch (error) {
      return {
        success: false,
        error: `Consent request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Verifies ABHA OTP for consent authorization
   */
  async verifyABHAOTP(
    requestId: string,
    abhaAddress: string,
    otp: string
  ): Promise<ToolResult> {
    try {
      if (this.mockMode) {
        return await this.mockOTPVerification(requestId, abhaAddress, otp);
      } else {
        return await this.realOTPVerification(requestId, abhaAddress, otp);
      }
    } catch (error) {
      return {
        success: false,
        error: `OTP verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Retrieves consent status and details
   */
  async getConsentStatus(requestId: string): Promise<ToolResult> {
    try {
      const doc = await this.firestore.collection('consent_requests').doc(requestId).get();

      if (!doc.exists) {
        return {
          success: false,
          error: 'Consent request not found'
        };
      }

      const consentData = doc.data();
      if (!consentData) {
        return {
          success: false,
          error: 'Consent data not found'
        };
      }

      return {
        success: true,
        data: {
          requestId,
          status: consentData.status,
          createdAt: consentData.createdAt,
          expiresAt: consentData.expiresAt,
          otpVerified: consentData.otpVerified || false,
          fhirConsentId: consentData.fhirConsentId,
          purpose: consentData.purpose,
          hiTypes: consentData.hiTypes,
          source: 'CONSENT_MANAGER_M3'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get consent status: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Revokes an existing consent
   */
  async revokeConsent(requestId: string, reason?: string): Promise<ToolResult> {
    try {
      await this.firestore.collection('consent_requests').doc(requestId).update({
        status: 'REVOKED',
        revokedAt: new Date(),
        revocationReason: reason || 'Patient request'
      });

      return {
        success: true,
        data: {
          requestId,
          status: 'REVOKED',
          revokedAt: new Date(),
          message: 'Consent successfully revoked'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to revoke consent: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Mock consent request for hackathon demonstration
   */
  private async mockConsentRequest(
    requestId: string,
    params: ConsentRequestParams,
    fhirConsent: FHIRConsent
  ): Promise<ToolResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Update consent status
    await this.firestore.collection('consent_requests').doc(requestId).update({
      status: 'REQUESTED',
      fhirConsentId: fhirConsent.id,
      abdmRequestId: `ABDM_${requestId}`,
      requestSent: true
    });

    return {
      success: true,
      data: {
        requestId,
        consentRequestId: `ABDM_${requestId}`,
        status: 'REQUESTED',
        fhirConsentId: fhirConsent.id,
        message: 'Consent request initiated successfully',
        nextSteps: [
          'Patient will receive OTP on registered mobile number',
          'OTP verification required to grant consent',
          'Consent will expire in 30 days if not acted upon'
        ],
        otpInstructions: {
          message: 'Please enter the 6-digit OTP sent to your ABHA-registered mobile number',
          validityMinutes: 10,
          resendAfterMinutes: 2
        },
        mockOTP: '123456', // For demo purposes only
        source: 'ABDM_MOCK_M3_CONSENT'
      }
    };
  }

  /**
   * Mock OTP verification for demonstration
   */
  private async mockOTPVerification(
    requestId: string,
    abhaAddress: string,
    otp: string
  ): Promise<ToolResult> {
    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

    // For demo, accept '123456' or any 6-digit OTP
    const isValidOTP = otp === '123456' || /^\d{6}$/.test(otp);

    if (isValidOTP) {
      // Grant consent
      await this.firestore.collection('consent_requests').doc(requestId).update({
        status: 'GRANTED',
        otpVerified: true,
        consentGrantedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });

      return {
        success: true,
        data: {
          requestId,
          status: 'GRANTED',
          otpVerified: true,
          consentGrantedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          message: 'Consent granted successfully',
          accessToken: `CONSENT_TOKEN_${requestId}_${Date.now()}`,
          dataAccess: {
            validFrom: new Date().toISOString(),
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            permissions: ['read', 'export']
          },
          source: 'ABDM_MOCK_M3_OTP_VERIFIED'
        }
      };
    } else {
      return {
        success: false,
        error: 'Invalid OTP. Please check and try again.',
        retryAllowed: true,
        attemptsRemaining: 2
      };
    }
  }

  /**
   * Real ABDM consent request (for production use)
   */
  private async realConsentRequest(
    requestId: string,
    params: ConsentRequestParams,
    fhirConsent: FHIRConsent
  ): Promise<ToolResult> {
    try {
      const consentPayload = {
        requestId,
        timestamp: new Date().toISOString(),
        consent: {
          purpose: { text: params.purpose === 'CAREMGT' ? 'Care Management' : params.purpose },
          patient: { id: params.patientAbhaAddress },
          hiu: { id: params.requesterIdentifier, name: params.requesterName },
          requester: { name: params.requesterName, identifier: { value: params.requesterIdentifier } },
          hiTypes: params.hiTypes,
          permission: {
            accessMode: 'VIEW',
            dateRange: {
              from: params.dateRangeFrom,
              to: params.dateRangeTo
            },
            dataEraseAt: params.dataEraseAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            frequency: { unit: 'HOUR', value: 1, repeats: 1 }
          }
        }
      };

      const response = await abdmRequest<ABDMConsentResponse>('/v2/consent-requests', {
        method: 'POST',
        body: JSON.stringify(consentPayload)
      });

      // Update Firestore with ABDM response
      await this.firestore.collection('consent_requests').doc(requestId).update({
        status: 'REQUESTED',
        abdmRequestId: response.consentRequestId,
        fhirConsentId: fhirConsent.id
      });

      return {
        success: true,
        data: {
          requestId,
          consentRequestId: response.consentRequestId,
          status: 'REQUESTED',
          message: 'Consent request sent to ABDM',
          source: 'ABDM_LIVE_M3_CONSENT'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Real consent request failed: ${error instanceof Error ? error.message : 'ABDM API error'}`
      };
    }
  }

  /**
   * Real ABDM OTP verification (for production use)
   */
  private async realOTPVerification(
    requestId: string,
    abhaAddress: string,
    otp: string
  ): Promise<ToolResult> {
    try {
      const response = await abdmRequest<ABDMOTPVerificationResponse>('/v2/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          requestId,
          abhaAddress,
          otp
        })
      });

      if (response.verified) {
        await this.firestore.collection('consent_requests').doc(requestId).update({
          status: 'GRANTED',
          otpVerified: true,
          consentGrantedAt: new Date(),
          accessToken: response.accessToken
        });

        return {
          success: true,
          data: {
            requestId,
            status: 'GRANTED',
            otpVerified: true,
            accessToken: response.accessToken,
            source: 'ABDM_LIVE_M3_OTP_VERIFIED'
          }
        };
      } else {
        return {
          success: false,
          error: 'OTP verification failed',
          retryAllowed: true
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Real OTP verification failed: ${error instanceof Error ? error.message : 'ABDM API error'}`
      };
    }
  }

  /**
   * Creates FHIR R4-compliant consent resource
   */
  private createFHIRConsent(params: ConsentRequestParams, requestId: string): FHIRConsent {
    const purposeMapping: Record<string, { code: string; display: string }> = {
      CAREMGT: { code: 'TREAT', display: 'Treatment' },
      BTG: { code: 'ETREAT', display: 'Emergency Treatment' },
      PUBHLTH: { code: 'PUBHLTH', display: 'Public Health' },
      HPAYMT: { code: 'HPAYMT', display: 'Healthcare Payment' },
      DSRCH: { code: 'HRESCH', display: 'Healthcare Research' },
      PATRQT: { code: 'PATRQT', display: 'Patient Request' }
    };

    const purpose = purposeMapping[params.purpose];

    return {
      resourceType: 'Consent',
      id: `consent-${requestId}`,
      status: 'proposed',
      scope: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/consentscope',
          code: 'patient-privacy',
          display: 'Privacy Consent'
        }]
      },
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
          code: 'idscl',
          display: 'Information Disclosure'
        }]
      }],
      patient: {
        reference: `Patient/${params.patientAbhaAddress}`,
        identifier: {
          system: 'https://healthid.ndhm.gov.in',
          value: params.patientAbhaAddress
        }
      },
      dateTime: new Date().toISOString(),
      performer: [{
        reference: `Organization/${params.requesterIdentifier}`
      }],
      purpose: [{
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason',
        code: purpose.code
      }],
      provision: {
        type: 'permit',
        period: {
          start: params.dateRangeFrom,
          end: params.dateRangeTo
        },
        data: params.hiTypes.map(hiType => ({
          meaning: 'instance' as const,
          reference: {
            reference: `DocumentReference/${hiType}`
          }
        }))
      }
    };
  }

  /**
   * Stores consent request in Firestore
   */
  private async storeConsentRequest(
    requestId: string,
    params: ConsentRequestParams,
    fhirConsent: FHIRConsent
  ): Promise<void> {
    const consentDoc = {
      requestId,
      patientAbhaAddress: params.patientAbhaAddress,
      purpose: params.purpose,
      hiTypes: params.hiTypes,
      dateRange: {
        from: params.dateRangeFrom,
        to: params.dateRangeTo
      },
      requester: {
        name: params.requesterName,
        identifier: params.requesterIdentifier
      },
      fhirConsent,
      status: 'INITIATED',
      createdAt: new Date(),
      otpVerified: false
    };

    await this.firestore.collection('consent_requests').doc(requestId).set(consentDoc);
  }

  /**
   * Generates unique consent request ID
   */
  private generateConsentRequestId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `CONSENT_${timestamp}_${random.toUpperCase()}`;
  }
}