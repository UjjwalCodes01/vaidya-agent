/**
 * useLocation Hook
 * Provides geolocation and nearby facility search
 * - Browser Geolocation API
 * - PHC/Hospital search via Google Maps API
 * - Emergency facility routing
 */

import { useState, useCallback, useEffect } from 'react';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Facility {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'phc' | 'pharmacy' | 'diagnostic';
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  distance?: number; // in meters
  rating?: number;
  waitTime?: string;
  available?: boolean;
  phone?: string;
  hours?: string;
}

interface UseLocationReturn {
  // State
  position: Coordinates | null;
  loading: boolean;
  error: string | null;
  facilities: Facility[];

  // Location operations
  getCurrentPosition: () => Promise<Coordinates | null>;
  searchNearbyFacilities: (params: {
    latitude?: number;
    longitude?: number;
    radius?: number;
    type?: 'hospital' | 'clinic' | 'pharmacy' | 'phc' | 'diagnostic';
    emergency?: boolean;
  }) => Promise<Facility[]>;

  getDirections: (destination: Coordinates) => Promise<string | null>;

  clearError: () => void;
}

export function useLocation(): UseLocationReturn {
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get user's current position using browser Geolocation API
  const getCurrentPosition = useCallback(async (): Promise<Coordinates | null> => {
    setLoading(true);
    setError(null);

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const coords: Coordinates = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };

      setPosition(coords);
      return coords;
    } catch (err) {
      let message = 'Failed to get location';
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable location access.';
            break;
          case err.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable.';
            break;
          case err.TIMEOUT:
            message = 'Location request timed out.';
            break;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      console.error('[useLocation] Get position error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Search for nearby facilities using backend API
  const searchNearbyFacilities = useCallback(async (params: {
    latitude?: number;
    longitude?: number;
    radius?: number;
    type?: 'hospital' | 'clinic' | 'pharmacy' | 'phc' | 'diagnostic';
    emergency?: boolean;
  }): Promise<Facility[]> => {
    setLoading(true);
    setError(null);

    try {
      // Use provided coordinates or current position
      const lat = params.latitude ?? position?.latitude;
      const lng = params.longitude ?? position?.longitude;

      if (!lat || !lng) {
        throw new Error('Location is required. Please enable location access.');
      }

      // API expects gps as "lat,lng" string format
      const gps = `${lat},${lng}`;
      const radiusKm = (params.radius || 5000) / 1000; // Convert meters to km
      
      const response = await fetch('/api/location/phc/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gps,
          radiusKm,
          facilityTypes: params.type ? [params.type] : undefined,
          includePrivate: params.emergency, // Emergency searches include private facilities
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to search facilities');
      }

      const foundFacilities = data.success && data.data?.facilities ? data.data.facilities : [];
      setFacilities(foundFacilities);
      return foundFacilities;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Facility search failed';
      setError(message);
      console.error('[useLocation] Search facilities error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [position]);

  // Get directions URL from current location to destination
  const getDirections = useCallback(async (destination: Coordinates): Promise<string | null> => {
    try {
      if (!position) {
        throw new Error('Current location not available');
      }

      // API expects GPS as "lat,lng" string format
      const fromGPS = `${position.latitude},${position.longitude}`;
      const facilityGPS = `${destination.latitude},${destination.longitude}`;

      const response = await fetch('/api/location/directions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromGPS,
          facilityGPS,
          travelMode: 'driving',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get directions');
      }

      return data.success && data.data?.url ? data.data.url : null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Directions failed';
      setError(message);
      console.error('[useLocation] Get directions error:', err);
      return null;
    }
  }, [position]);

  // Auto-fetch position on mount
  useEffect(() => {
    getCurrentPosition();
  }, [getCurrentPosition]);

  return {
    position,
    loading,
    error,
    facilities,
    getCurrentPosition,
    searchNearbyFacilities,
    getDirections,
    clearError,
  };
}
