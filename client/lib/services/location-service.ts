/**
 * Location Service for Primary Health Center Discovery
 * Google Maps integration for healthcare facility discovery and navigation
 * Implements PHC grounding capabilities for Vaidya-Agent
 */

import type { HealthFacility, ToolResult } from '../../types';
import { getEnv } from '../env';
import { ABDMRegistryAgent } from '../agents/abdm-registry';

export interface LocationParams {
  gps: string; // "latitude,longitude"
  radiusKm?: number;
  facilityTypes?: ('PHC' | 'CHC' | 'SubCenter' | 'Hospital')[];
  includePrivate?: boolean;
}

export interface DirectionsParams {
  fromGPS: string;
  facilityGPS: string;
  travelMode?: 'driving' | 'walking' | 'transit' | 'bicycling';
  avoidTolls?: boolean;
  language?: 'hi' | 'en' | 'bn' | 'te' | 'mr' | 'ta' | 'gu';
}

export interface PHCResult {
  facility: HealthFacility;
  distance: number; // in kilometers
  travelTime?: number; // in minutes
  isVerified: boolean; // cross-referenced with ABDM registry
  services: string[];
  operatingHours?: string;
  emergencyAvailable: boolean;
}

export interface DirectionsResult {
  route: {
    distance: string;
    duration: string;
    polyline?: string;
  };
  steps: Array<{
    instruction: string;
    distance: string;
    duration: string;
    maneuver?: string;
  }>;
  alternatives?: Array<{
    description: string;
    distance: string;
    duration: string;
  }>;
}

// Google Maps API Response Types
interface GoogleMapsLeg {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  steps: Array<{
    html_instructions: string;
    distance: { text: string; value: number };
    duration: { text: string; value: number };
    maneuver?: string;
  }>;
}

interface GoogleMapsRoute {
  legs: GoogleMapsLeg[];
  overview_polyline?: { points: string };
  summary?: string;
}

// Note: GoogleMapsDirectionsResponse is defined but will be used when full response parsing is needed
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface GoogleMapsDirectionsResponse {
  routes: GoogleMapsRoute[];
  status: string;
}

interface GoogleMapsPlace {
  weekday_text?: string[];
}

/**
 * Location Service for Healthcare Facility Discovery and Navigation
 */
export class LocationService {
  private apiKey: string;
  private abdmAgent: ABDMRegistryAgent;

  constructor() {
    this.apiKey = getEnv().GOOGLE_MAPS_API_KEY;
    this.abdmAgent = new ABDMRegistryAgent();
  }

  /**
   * Finds nearest Primary Health Centers using Google Maps and ABDM registry
   */
  async findNearestPHC(params: LocationParams): Promise<ToolResult> {
    try {
      const [lat, lng] = params.gps.split(',').map(Number);

      if (isNaN(lat) || isNaN(lng)) {
        return {
          success: false,
          error: 'Invalid GPS coordinates format. Use "latitude,longitude"'
        };
      }

      // Get facilities from Google Maps
      const mapsFacilities = await this.searchGoogleMaps(lat, lng, params);

      // Cross-reference with ABDM facility registry
      const abdmResult = await this.abdmAgent.searchFacilities({
        gps: params.gps,
        radius: params.radiusKm || 25,
        facilityType: params.facilityTypes?.[0] || 'PHC'
      });

      const abdmFacilities = abdmResult.success ? (abdmResult.data as { facilities?: HealthFacility[] })?.facilities || [] : [];

      // Merge and prioritize facilities
      const mergedResults = this.mergeFacilityData(mapsFacilities, abdmFacilities, lat, lng);

      // Filter by distance
      const filteredResults = mergedResults.filter(
        result => result.distance <= (params.radiusKm || 25)
      );

      // Sort by priority: verified facilities first, then by distance
      filteredResults.sort((a, b) => {
        if (a.isVerified && !b.isVerified) return -1;
        if (!a.isVerified && b.isVerified) return 1;
        return a.distance - b.distance;
      });

      return {
        success: true,
        data: {
          facilities: filteredResults.slice(0, 10), // Return top 10 results
          searchCenter: { latitude: lat, longitude: lng },
          searchRadius: params.radiusKm || 25,
          totalFound: filteredResults.length,
          abdmVerified: filteredResults.filter(r => r.isVerified).length,
          source: 'GOOGLE_MAPS_ABDM_COMBINED'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `PHC discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Gets directions to a healthcare facility
   */
  async getDirectionsToFacility(params: DirectionsParams): Promise<ToolResult> {
    try {
      const [fromLat, fromLng] = params.fromGPS.split(',').map(Number);
      const [toLat, toLng] = params.facilityGPS.split(',').map(Number);

      if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
        return {
          success: false,
          error: 'Invalid GPS coordinates format for directions'
        };
      }

      const directionsUrl = new URL('https://maps.googleapis.com/maps/api/directions/json');
      directionsUrl.searchParams.set('origin', `${fromLat},${fromLng}`);
      directionsUrl.searchParams.set('destination', `${toLat},${toLng}`);
      directionsUrl.searchParams.set('mode', params.travelMode || 'driving');
      directionsUrl.searchParams.set('avoid', params.avoidTolls ? 'tolls' : '');
      directionsUrl.searchParams.set('language', params.language || 'hi');
      directionsUrl.searchParams.set('region', 'in');
      directionsUrl.searchParams.set('key', this.apiKey);
      directionsUrl.searchParams.set('alternatives', 'true');

      const response = await fetch(directionsUrl.toString());
      const data = await response.json();

      if (data.status !== 'OK') {
        return {
          success: false,
          error: `Directions API error: ${data.error_message || data.status}`
        };
      }

      const route = data.routes[0];
      const leg = route.legs[0];

      const result: DirectionsResult = {
        route: {
          distance: leg.distance.text,
          duration: leg.duration.text,
          polyline: route.overview_polyline?.points
        },
        steps: leg.steps.map((step: GoogleMapsLeg['steps'][0]) => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
          distance: step.distance.text,
          duration: step.duration.text,
          maneuver: step.maneuver
        })),
        alternatives: data.routes.slice(1, 4).map((altRoute: GoogleMapsRoute) => {
          const altLeg = altRoute.legs[0];
          return {
            description: `Alternative route via ${altRoute.summary || 'alternative path'}`,
            distance: altLeg.distance.text,
            duration: altLeg.duration.text
          };
        })
      };

      return {
        success: true,
        data: {
          directions: result,
          from: { latitude: fromLat, longitude: fromLng },
          to: { latitude: toLat, longitude: toLng },
          travelMode: params.travelMode || 'driving',
          source: 'GOOGLE_MAPS_DIRECTIONS'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Directions failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Searches for healthcare facilities using Google Maps Places API
   */
  private async searchGoogleMaps(
    lat: number,
    lng: number,
    params: LocationParams
  ): Promise<PHCResult[]> {
    const results: PHCResult[] = [];

    try {
      // Search for different types of healthcare facilities
      const facilityTypes = params.facilityTypes || ['PHC', 'CHC', 'Hospital'];

      for (const facilityType of facilityTypes) {
        const keyword = this.getFacilityKeyword(facilityType);
        const placesResults = await this.searchPlaces(lat, lng, keyword, params.radiusKm || 25, params.includePrivate);
        results.push(...placesResults);
      }

      // Remove duplicates based on location proximity
      return this.removeDuplicateFacilities(results);
    } catch (error) {
      console.error('Google Maps search error:', error);
      return [];
    }
  }

  /**
   * Searches Google Places API for healthcare facilities
   */
  private async searchPlaces(
    lat: number,
    lng: number,
    keyword: string,
    radiusKm: number,
    includePrivate?: boolean
  ): Promise<PHCResult[]> {
    const placesUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    placesUrl.searchParams.set('location', `${lat},${lng}`);
    placesUrl.searchParams.set('radius', (radiusKm * 1000).toString());
    placesUrl.searchParams.set('type', 'hospital');
    placesUrl.searchParams.set('keyword', keyword);
    placesUrl.searchParams.set('language', 'hi');
    placesUrl.searchParams.set('key', this.apiKey);

    const response = await fetch(placesUrl.toString());
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Places API error: ${data.error_message || data.status}`);
    }

    const results: PHCResult[] = [];

    for (const place of data.results || []) {
      // Skip private facilities if not requested
      if (!includePrivate && this.isPrivateFacility(place.name)) {
        continue;
      }

      const distance = this.calculateDistance(
        lat, lng,
        place.geometry.location.lat,
        place.geometry.location.lng
      );

      const facility: HealthFacility = {
        hfrId: `GMAPS_${place.place_id}`,
        facilityName: place.name,
        facilityType: this.determineFacilityType(place.name, place.types),
        address: place.vicinity || place.formatted_address || '',
        city: this.extractCity(place.vicinity),
        state: 'Uttar Pradesh', // Default for Northern India
        pincode: '226001', // Default
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        contact: place.formatted_phone_number
      };

      results.push({
        facility,
        distance,
        isVerified: false, // Will be updated when cross-referenced with ABDM
        services: this.extractServices(place.types, place.name),
        operatingHours: this.parseOpeningHours(place.opening_hours),
        emergencyAvailable: this.hasEmergencyServices(place.name, place.types)
      });
    }

    return results;
  }

  /**
   * Merges Google Maps and ABDM facility data
   */
  private mergeFacilityData(
    mapsFacilities: PHCResult[],
    abdmFacilities: HealthFacility[],
    searchLat: number,
    searchLng: number
  ): PHCResult[] {
    const merged: PHCResult[] = [...mapsFacilities];

    // Add ABDM facilities that aren't already in the Maps results
    for (const abdmFacility of abdmFacilities) {
      const isNearExisting = mapsFacilities.some(mf => {
        if (!mf.facility.latitude || !mf.facility.longitude || !abdmFacility.latitude || !abdmFacility.longitude) {
          return false;
        }
        const distance = this.calculateDistance(
          mf.facility.latitude, mf.facility.longitude,
          abdmFacility.latitude, abdmFacility.longitude
        );
        return distance < 0.5; // Within 500 meters
      });

      if (!isNearExisting) {
        const distance = abdmFacility.latitude && abdmFacility.longitude
          ? this.calculateDistance(searchLat, searchLng, abdmFacility.latitude, abdmFacility.longitude)
          : 999;

        merged.push({
          facility: abdmFacility,
          distance,
          isVerified: true, // ABDM facilities are verified
          services: this.getABDMServices(abdmFacility.facilityType),
          emergencyAvailable: abdmFacility.facilityType === 'Hospital' || abdmFacility.facilityType === 'CHC'
        });
      }
    }

    // Mark facilities as verified if they match ABDM registry
    for (const mapsFacility of merged) {
      if (!mapsFacility.isVerified) {
        const abdmMatch = abdmFacilities.find(af => {
          if (!mapsFacility.facility.latitude || !mapsFacility.facility.longitude || !af.latitude || !af.longitude) {
            return false;
          }
          const distance = this.calculateDistance(
            mapsFacility.facility.latitude, mapsFacility.facility.longitude,
            af.latitude, af.longitude
          );
          return distance < 0.5; // Within 500 meters
        });

        if (abdmMatch) {
          mapsFacility.isVerified = true;
          // Update with ABDM data
          mapsFacility.facility.hfrId = abdmMatch.hfrId;
          mapsFacility.facility.contact = abdmMatch.contact || mapsFacility.facility.contact;
        }
      }
    }

    return merged;
  }

  /**
   * Utility functions
   */
  private getFacilityKeyword(facilityType: string): string {
    const keywords = {
      'PHC': 'primary health center PHC प्राथमिक स्वास्थ्य केंद्र',
      'CHC': 'community health center CHC सामुदायिक स्वास्थ्य केंद्र',
      'SubCenter': 'sub center उप केंद्र health',
      'Hospital': 'hospital अस्पताल government सरकारी'
    };
    return keywords[facilityType as keyof typeof keywords] || 'health center';
  }

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

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private isPrivateFacility(name: string): boolean {
    const privateKeywords = ['private', 'प्राइवेट', 'nursing home', 'clinic', 'नर्सिंग होम'];
    return privateKeywords.some(keyword => name.toLowerCase().includes(keyword.toLowerCase()));
  }

  private determineFacilityType(name: string, types: string[]): string {
    const nameLC = name.toLowerCase();
    if (nameLC.includes('phc') || nameLC.includes('प्राथमिक')) return 'PHC';
    if (nameLC.includes('chc') || nameLC.includes('सामुदायिक')) return 'CHC';
    if (nameLC.includes('sub') || nameLC.includes('उप')) return 'SubCenter';
    if (types.includes('hospital') || nameLC.includes('hospital') || nameLC.includes('अस्पताल')) return 'Hospital';
    return 'Clinic';
  }

  private extractCity(vicinity?: string): string {
    if (!vicinity) return 'Lucknow'; // Default
    const parts = vicinity.split(',');
    return parts[parts.length - 1]?.trim() || 'Lucknow';
  }

  private extractServices(types: string[], name: string): string[] {
    const services = [];
    if (types.includes('hospital') || name.includes('Hospital')) {
      services.push('General Medicine', 'Emergency Care', 'Diagnostics');
    }
    if (name.toLowerCase().includes('maternity')) {
      services.push('Maternal Care', 'Delivery Services');
    }
    if (name.toLowerCase().includes('pediatric')) {
      services.push('Child Healthcare', 'Immunization');
    }
    return services.length > 0 ? services : ['Basic Healthcare', 'Consultation'];
  }

  private getABDMServices(facilityType: string): string[] {
    const services = {
      'PHC': ['Basic Primary Care', 'Maternal Care', 'Child Healthcare', 'Immunization'],
      'CHC': ['Specialist Consultation', 'Minor Surgery', 'Laboratory Services', 'Emergency Care'],
      'Hospital': ['Multi-specialty Care', 'Emergency Services', 'Surgery', 'ICU', 'Diagnostics'],
      'SubCenter': ['Basic Health Services', 'Health Education', 'Immunization']
    };
    return services[facilityType as keyof typeof services] || ['Healthcare Services'];
  }

  private parseOpeningHours(openingHours?: GoogleMapsPlace): string {
    if (!openingHours || !openingHours.weekday_text) {
      return '24x7 Emergency Services';
    }
    return openingHours.weekday_text[0] || 'Contact facility for timings';
  }

  private hasEmergencyServices(name: string, types: string[]): boolean {
    const emergencyKeywords = ['emergency', 'hospital', '24', 'trauma', 'accident'];
    return emergencyKeywords.some(keyword =>
      name.toLowerCase().includes(keyword) || types.some(type => type.includes(keyword))
    );
  }

  private removeDuplicateFacilities(facilities: PHCResult[]): PHCResult[] {
    const unique: PHCResult[] = [];

    for (const facility of facilities) {
      const isDuplicate = unique.some(existing => {
        if (!facility.facility.latitude || !facility.facility.longitude ||
            !existing.facility.latitude || !existing.facility.longitude) {
          return facility.facility.facilityName === existing.facility.facilityName;
        }
        const distance = this.calculateDistance(
          facility.facility.latitude, facility.facility.longitude,
          existing.facility.latitude, existing.facility.longitude
        );
        return distance < 0.1; // Within 100 meters
      });

      if (!isDuplicate) {
        unique.push(facility);
      }
    }

    return unique;
  }
}