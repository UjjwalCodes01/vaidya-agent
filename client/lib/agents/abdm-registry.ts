/**
 * ABDM Registry Agent - Milestone M1 & M2 Implementation
 * Handles patient discovery (M1) and facility registry (M2) through ABDM
 * Uses mock responses for hackathon reliability while maintaining authentic data structures
 */

import type { ABHAAddress, HealthFacility, HealthProfessional } from '../../types';
import type { ToolResult } from '../../types';
import { abdmRequest } from '../abdm/client';
import { getEnv } from '../env';

// ABDM API Response Types
interface ABDMPatientSearchResponse {
  patients?: Array<{
    healthIdNumber: string;
    name: string;
    gender: string;
    yearOfBirth: string;
    monthOfBirth?: string;
    dayOfBirth?: string;
    stateCode?: string;
    districtCode?: string;
  }>;
  totalCount?: number;
}

interface ABDMFacilitySearchResponse {
  facilities?: Array<{
    facilityId: string;
    facilityName: string;
    facilityType: string;
    address: {
      line1?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
    contact?: {
      phone?: string;
      email?: string;
    };
  }>;
  totalCount?: number;
}

interface ABDMProfessionalSearchResponse {
  professionals?: Array<{
    professionalId: string;
    name: string;
    specialization: string;
    qualifications?: string[];
  }>;
}

export interface PatientSearchParams {
  healthId?: string;
  mobile?: string;
  name?: string;
  yearOfBirth?: string;
  gender?: 'M' | 'F' | 'O';
}

export interface FacilitySearchParams {
  gps?: string;
  city?: string;
  state?: string;
  facilityType?: 'Hospital' | 'PHC' | 'CHC' | 'SubCenter' | 'Clinic' | 'Diagnostic';
  radius?: number;
  specialization?: string;
}

export interface ABDMSearchResult<T> {
  success: boolean;
  data?: T[];
  totalCount?: number;
  error?: string;
}

/**
 * ABDM Registry Agent for M1/M2 Milestone Implementation
 */
export class ABDMRegistryAgent {
  private mockMode: boolean;

  constructor() {
    this.mockMode = getEnv().MOCK_ABDM_RESPONSES;
  }

  /**
   * M1: Search for patients in ABDM registry
   */
  async searchPatients(params: PatientSearchParams): Promise<ToolResult> {
    try {
      if (this.mockMode) {
        return await this.mockPatientSearch(params);
      } else {
        return await this.realPatientSearch(params);
      }
    } catch (error) {
      return {
        success: false,
        error: `Patient search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * M2: Search for healthcare facilities in ABDM registry
   */
  async searchFacilities(params: FacilitySearchParams): Promise<ToolResult> {
    try {
      if (this.mockMode) {
        return await this.mockFacilitySearch(params);
      } else {
        return await this.realFacilitySearch(params);
      }
    } catch (error) {
      return {
        success: false,
        error: `Facility search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Mock patient search with realistic ABDM data structures
   */
  private async mockPatientSearch(params: PatientSearchParams): Promise<ToolResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

    const mockPatients: ABHAAddress[] = [];

    // Generate realistic mock data based on search parameters
    if (params.healthId) {
      // Specific health ID search - return exact match or not found
      if (params.healthId.includes('1234') || params.healthId.includes('demo')) {
        mockPatients.push({
          healthId: params.healthId,
          name: "राम कुमार शर्मा",
          dayOfBirth: "15",
          monthOfBirth: "08",
          yearOfBirth: "1985",
          gender: "M",
          mobile: "9876543210",
          email: "ram.sharma@example.com",
          address: "वार्ड 12, मुख्य बाजार, लखनऊ",
          stateCode: "UP",
          districtCode: "U07"
        });
      }
    } else if (params.name || params.mobile) {
      // Demographic search - return multiple potential matches
      const names = [
        "सुनीता देवी",
        "मोहन सिंह",
        "प्रिया गुप्ता",
        "राजेश वर्मा",
        "अनिता त्यागी"
      ];

      for (let i = 0; i < Math.min(3, names.length); i++) {
        const birthYear = params.yearOfBirth || (1970 + Math.floor(Math.random() * 40)).toString();
        mockPatients.push({
          healthId: `${Date.now()}${i}@abdm`,
          name: names[i],
          dayOfBirth: (1 + Math.floor(Math.random() * 28)).toString().padStart(2, '0'),
          monthOfBirth: (1 + Math.floor(Math.random() * 12)).toString().padStart(2, '0'),
          yearOfBirth: birthYear,
          gender: Math.random() > 0.5 ? "F" : "M",
          mobile: params.mobile || `98765432${10 + i}${Math.floor(Math.random() * 10)}`,
          address: `गाँव ${i + 1}, ${params.name ? 'नोएडा' : 'लखनऊ'}`,
          stateCode: "UP",
          districtCode: params.name ? "GB" : "U07"
        });
      }
    }

    return {
      success: true,
      data: {
        patients: mockPatients,
        totalCount: mockPatients.length,
        searchParams: params,
        source: 'ABDM_MOCK_M1_REGISTRY'
      }
    };
  }

  /**
   * Mock facility search with realistic ABDM HFR data
   */
  private async mockFacilitySearch(params: FacilitySearchParams): Promise<ToolResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

    const mockFacilities: HealthFacility[] = [];

    // Generate location-based mock facilities
    const baseCoords = this.parseGPS(params.gps);
    const searchCity = params.city || 'Lucknow';

    const facilityTemplates = [
      {
        prefix: 'प्राथमिक स्वास्थ्य केंद्र',
        type: 'PHC',
        specs: ['General Medicine', 'Basic Emergency', 'Maternal Care']
      },
      {
        prefix: 'सामुदायिक स्वास्थ्य केंद्र',
        type: 'CHC',
        specs: ['General Medicine', 'Pediatrics', 'Obstetrics', 'Surgery']
      },
      {
        prefix: 'जिला चिकित्सालय',
        type: 'Hospital',
        specs: ['Multi-specialty', 'Emergency', 'ICU', 'Diagnostics']
      },
      {
        prefix: 'उप केंद्र',
        type: 'SubCenter',
        specs: ['Basic Primary Care', 'Immunization', 'Health Education']
      }
    ];

    const areas = ['गोमती नगर', 'हज़रतगंज', 'अमीनाबाद', 'चिनहट', 'इंदिरा नगर', 'राजाजीपुरम'];

    for (let i = 0; i < Math.min(5, areas.length); i++) {
      const template = facilityTemplates[i % facilityTemplates.length];

      // Apply facility type filter
      if (params.facilityType && template.type !== params.facilityType) {
        continue;
      }

      // Generate realistic coordinates around search area
      const lat = baseCoords.lat + (Math.random() - 0.5) * 0.1; // ~5km radius
      const lng = baseCoords.lng + (Math.random() - 0.5) * 0.1;

      mockFacilities.push({
        hfrId: `HFR${searchCity.toUpperCase()}${Date.now()}${i}`,
        facilityName: `${template.prefix} ${areas[i]}`,
        facilityType: template.type,
        address: `${areas[i]}, ${searchCity}, उत्तर प्रदेश`,
        city: searchCity,
        state: 'Uttar Pradesh',
        pincode: `22601${i}`,
        latitude: lat,
        longitude: lng,
        contact: `0522-${2234567 + i}`
      });
    }

    // Filter by radius if specified
    if (params.radius && baseCoords.lat && baseCoords.lng) {
      const filteredFacilities = mockFacilities.filter(facility => {
        if (!facility.latitude || !facility.longitude) return true;
        const distance = this.calculateDistance(
          baseCoords.lat, baseCoords.lng,
          facility.latitude, facility.longitude
        );
        return distance <= (params.radius || 25);
      });

      mockFacilities.splice(0, mockFacilities.length, ...filteredFacilities);
    }

    return {
      success: true,
      data: {
        facilities: mockFacilities,
        totalCount: mockFacilities.length,
        searchParams: params,
        searchRadius: params.radius || 25,
        source: 'ABDM_MOCK_M2_HFR'
      }
    };
  }

  /**
   * Real ABDM patient search (for production use)
   */
  private async realPatientSearch(params: PatientSearchParams): Promise<ToolResult> {
    try {
      const response = await abdmRequest<ABDMPatientSearchResponse>('/v2/search/searchByHealthId', {
        method: 'POST',
        body: JSON.stringify({
          healthId: params.healthId,
          yearOfBirth: params.yearOfBirth,
          gender: params.gender,
          name: params.name,
          mobile: params.mobile
        })
      });

      return {
        success: true,
        data: {
          patients: response.patients || [],
          totalCount: response.totalCount || 0,
          source: 'ABDM_LIVE_M1_REGISTRY'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Real ABDM patient search failed: ${error instanceof Error ? error.message : 'API error'}`
      };
    }
  }

  /**
   * Real ABDM facility search (for production use)
   */
  private async realFacilitySearch(params: FacilitySearchParams): Promise<ToolResult> {
    try {
      const searchPayload: Record<string, unknown> = {
        facilityType: params.facilityType,
        city: params.city,
        state: params.state
      };

      if (params.gps) {
        const coords = this.parseGPS(params.gps);
        searchPayload.latitude = coords.lat;
        searchPayload.longitude = coords.lng;
        searchPayload.radius = params.radius || 25;
      }

      const response = await abdmRequest<ABDMFacilitySearchResponse>('/v2/bridge/search/facility', {
        method: 'POST',
        body: JSON.stringify(searchPayload)
      });

      return {
        success: true,
        data: {
          facilities: response.facilities || [],
          totalCount: response.totalCount || 0,
          source: 'ABDM_LIVE_M2_HFR'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Real ABDM facility search failed: ${error instanceof Error ? error.message : 'API error'}`
      };
    }
  }

  /**
   * Utility: Parse GPS coordinates
   */
  private parseGPS(gps?: string): { lat: number; lng: number } {
    if (!gps) {
      // Default to Lucknow coordinates
      return { lat: 26.8467, lng: 80.9462 };
    }

    const [latStr, lngStr] = gps.split(',');
    return {
      lat: parseFloat(latStr.trim()),
      lng: parseFloat(lngStr.trim())
    };
  }

  /**
   * Utility: Calculate distance between two points in kilometers
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Utility: Convert degrees to radians
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Gets healthcare professionals from facility (bonus M2 feature)
   */
  async getHealthcareProfessionals(facilityId: string): Promise<ToolResult> {
    try {
      if (this.mockMode) {
        // Mock healthcare professionals data
        const mockProfessionals: HealthProfessional[] = [
          {
            hprId: `HPR${facilityId}001`,
            name: "डॉ. संजय कुमार",
            registrationNumber: "UP/MED/12345",
            system: "State Medical Council",
            specialization: ["General Medicine", "Internal Medicine"],
            verified: true
          },
          {
            hprId: `HPR${facilityId}002`,
            name: "डॉ. प्रिया शर्मा",
            registrationNumber: "UP/GYN/67890",
            system: "State Medical Council",
            specialization: ["Obstetrics", "Gynecology"],
            verified: true
          }
        ];

        return {
          success: true,
          data: {
            professionals: mockProfessionals,
            facilityId,
            source: 'ABDM_MOCK_HPR'
          }
        };
      } else {
        const response = await abdmRequest<ABDMProfessionalSearchResponse>(`/v2/professionals/facility/${facilityId}`, {
          method: 'GET'
        });

        return {
          success: true,
          data: {
            professionals: response.professionals || [],
            facilityId,
            source: 'ABDM_LIVE_HPR'
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get professionals: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}