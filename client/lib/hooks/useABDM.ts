/**
 * useABDM Hook
 * Provides ABDM (Ayushman Bharat Digital Mission) operations
 * - Patient discovery (M1)
 * - Facility search (M2)
 * - Consent management (M3)
 */

import { useState, useCallback } from 'react';

export interface ABDMPatient {
  abhaAddress: string;
  abhaNumber?: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  mobile?: string;
  email?: string;
}

export interface ABDMFacility {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
}

export interface ABDMConsent {
  id: string;
  requestId: string;
  status: 'REQUESTED' | 'GRANTED' | 'DENIED' | 'EXPIRED' | 'REVOKED';
  patientId: string;
  hipId: string;
  hipName: string;
  purpose: string;
  hiTypes: string[];
  dateRange: {
    from: string;
    to: string;
  };
  expiryDate: string;
  createdAt: string;
}

interface UseABDMReturn {
  // State
  loading: boolean;
  error: string | null;

  // Patient operations
  searchPatient: (abhaAddress: string) => Promise<ABDMPatient | null>;

  // Facility operations
  searchFacilities: (params: {
    pincode?: string;
    state?: string;
    city?: string;
    facilityType?: string;
  }) => Promise<ABDMFacility[]>;

  // Consent operations
  requestConsent: (params: {
    patientId: string;
    hipId: string;
    purpose: string;
    hiTypes: string[];
    dateFrom: string;
    dateTo: string;
  }) => Promise<string>; // Returns requestId

  verifyConsent: (requestId: string, otp: string) => Promise<boolean>;

  listConsents: (patientId: string) => Promise<ABDMConsent[]>;

  revokeConsent: (consentId: string) => Promise<boolean>;

  clearError: () => void;
}

export function useABDM(): UseABDMReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Search for a patient by ABHA address
  const searchPatient = useCallback(async (abhaAddress: string): Promise<ABDMPatient | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/abdm/patients/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abhaAddress }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to search patient');
      }

      if (data.success && data.data?.patients?.length > 0) {
        return data.data.patients[0];
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Patient search failed';
      setError(message);
      console.error('[useABDM] Search patient error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Search for healthcare facilities
  const searchFacilities = useCallback(async (params: {
    pincode?: string;
    state?: string;
    city?: string;
    facilityType?: string;
  }): Promise<ABDMFacility[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/abdm/facilities/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to search facilities');
      }

      return data.success && data.data?.facilities ? data.data.facilities : [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Facility search failed';
      setError(message);
      console.error('[useABDM] Search facilities error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Request consent for health records
  const requestConsent = useCallback(async (params: {
    patientId: string;
    hipId: string;
    purpose: string;
    hiTypes: string[];
    dateFrom: string;
    dateTo: string;
  }): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/abdm/consent/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: params.patientId,
          hip: {
            id: params.hipId,
          },
          purpose: params.purpose,
          hiTypes: params.hiTypes,
          permission: {
            dateRange: {
              from: params.dateFrom,
              to: params.dateTo,
            },
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to request consent');
      }

      if (!data.success || !data.data?.requestId) {
        throw new Error('No consent request ID returned');
      }

      return data.data.requestId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Consent request failed';
      setError(message);
      console.error('[useABDM] Request consent error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Verify consent with OTP
  const verifyConsent = useCallback(async (requestId: string, otp: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/abdm/consent/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to verify consent');
      }

      return data.success && data.data?.verified === true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Consent verification failed';
      setError(message);
      console.error('[useABDM] Verify consent error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // List all consents for a patient
  const listConsents = useCallback(async (patientId: string): Promise<ABDMConsent[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/abdm/consent/request?patientId=${encodeURIComponent(patientId)}`, {
        method: 'GET',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to list consents');
      }

      return data.success && data.data?.consents ? data.data.consents : [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'List consents failed';
      setError(message);
      console.error('[useABDM] List consents error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Revoke a consent
  const revokeConsent = useCallback(async (consentId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/abdm/consent/request', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to revoke consent');
      }

      return data.success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Revoke consent failed';
      setError(message);
      console.error('[useABDM] Revoke consent error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    searchPatient,
    searchFacilities,
    requestConsent,
    verifyConsent,
    listConsents,
    revokeConsent,
    clearError,
  };
}
