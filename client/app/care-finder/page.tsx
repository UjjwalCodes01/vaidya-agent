'use client';

import { AppLayout } from '@/components/layout';
import { Button } from '@/components/shared';
import { useToast } from '@/components/shared/Toast';
import { useLocation, type Facility } from '@/lib/hooks/useLocation';
import { BookingModal } from '@/components/features/care-finder/BookingModal';
import { useState, useEffect } from 'react';

export default function CareFinderPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'hospital' | 'phc' | 'specialist' | 'diagnostic'>('all');
  const [bookingFacility, setBookingFacility] = useState<{ name: string; id?: string } | null>(null);
  const { showToast } = useToast();
  const { position, loading, error, facilities, searchNearbyFacilities, getDirections, clearError } = useLocation();

  // Fetch facilities when position is available or filter changes
  useEffect(() => {
    if (position) {
      const facilityType = activeFilter === 'all' ? undefined :
                          activeFilter === 'specialist' ? 'clinic' : activeFilter;

      searchNearbyFacilities({
        latitude: position.latitude,
        longitude: position.longitude,
        radius: emergencyMode ? 3000 : 10000, // 3km for emergency, 10km normal
        type: facilityType as any,
        emergency: emergencyMode,
      });
    }
  }, [position, activeFilter, emergencyMode, searchNearbyFacilities]);

  // Show error toast
  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      clearError();
    }
  }, [error, showToast, clearError]);

  const handleNavigate = async (facility: Facility, emergency?: boolean) => {
    if (emergency) {
      showToast(`Finding fastest route to ${facility.name}...`, 'warning');
    } else {
      showToast(`Opening directions to ${facility.name}`, 'info');
    }

    // Try to use our directions API first
    const directionsUrl = await getDirections({
      latitude: facility.location.latitude,
      longitude: facility.location.longitude,
    });

    if (directionsUrl) {
      window.open(directionsUrl, '_blank');
    } else {
      // Fallback to Google Maps search
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${facility.location.latitude},${facility.location.longitude}`, '_blank');
    }
  };

  const handleBookUHI = (facility: Facility) => {
    setBookingFacility({ name: facility.name, id: facility.id });
  };

  const handleSort = () => {
    showToast('Facilities are sorted by distance', 'info');
  };

  // Filter facilities by search query
  const filteredFacilities = facilities.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Emergency Mode Strip */}
        {emergencyMode && (
          <div className="bg-[var(--danger)] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-[0.14em] uppercase text-sm">Emergency Mode Active</span>
            </div>
            <button 
              onClick={() => setEmergencyMode(false)}
              className="text-sm underline hover:no-underline"
            >
              Exit
            </button>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-[var(--surface-strong)] p-4 border-b border-[var(--border)] space-y-3">
          <div className="flex gap-2">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hospitals, PHCs, specialists..."
              className="flex-1 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/50"
            />
            <button 
              onClick={() => setEmergencyMode(!emergencyMode)}
              className={`px-4 py-3 rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--danger)]/50 ${
                emergencyMode 
                  ? 'bg-[var(--danger)] text-white' 
                  : 'bg-[var(--danger)]/10 text-[var(--danger)]'
              }`}
            >
              SOS
            </button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1">
            <FilterButton label="All" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
            <FilterButton label="PHC" active={activeFilter === 'phc'} onClick={() => setActiveFilter('phc')} />
            <FilterButton label="Hospitals" active={activeFilter === 'hospital'} onClick={() => setActiveFilter('hospital')} />
            <FilterButton label="Specialists" active={activeFilter === 'specialist'} onClick={() => setActiveFilter('specialist')} />
            <FilterButton label="Diagnostics" active={activeFilter === 'diagnostic'} onClick={() => setActiveFilter('diagnostic')} />
          </div>
        </div>

        {/* Map View */}
        <div className="flex-1 bg-[var(--brand-soft)] relative">
          {loading && !position ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--muted)] p-4">
              <div className="w-16 h-16 mb-4 rounded-full bg-[var(--brand)]/10 flex items-center justify-center animate-pulse">
                <span className="text-3xl">📍</span>
              </div>
              <p className="text-lg font-semibold mb-2 text-[var(--foreground)]">Getting your location...</p>
              <p className="text-sm text-center">Please allow location access to find nearby facilities</p>
            </div>
          ) : position ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--muted)] p-4">
              <div className="w-16 h-16 mb-4 rounded-full bg-[var(--brand)]/10 flex items-center justify-center">
                <span className="text-3xl">🗺️</span>
              </div>
              <p className="text-lg font-semibold mb-2 text-[var(--foreground)]">Interactive Map</p>
              <p className="text-sm text-center">Showing {filteredFacilities.length} facilities near you</p>
              <p className="text-xs text-center mt-2 max-w-md text-[var(--muted)]">
                📍 Your location: {position.latitude.toFixed(4)}°N, {position.longitude.toFixed(4)}°E
              </p>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--muted)] p-4">
              <div className="w-16 h-16 mb-4 rounded-full bg-[var(--danger)]/10 flex items-center justify-center">
                <span className="text-3xl">⚠️</span>
              </div>
              <p className="text-lg font-semibold mb-2 text-[var(--foreground)]">Location Unavailable</p>
              <p className="text-sm text-center">Please enable location access to find nearby facilities</p>
            </div>
          )}
        </div>

        {/* Facility Cards (Scrollable Bottom Sheet) */}
        <div className="bg-[var(--surface-strong)] border-t-2 border-[var(--border)] overflow-y-auto max-h-80">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[var(--foreground)]">
                Nearby Facilities ({emergencyMode ? 'Emergency mode' : `${filteredFacilities.length} results`})
              </h3>
              <button
                onClick={handleSort}
                className="text-sm text-[var(--brand)] hover:underline"
              >
                Sorted by distance
              </button>
            </div>

            {loading && facilities.length === 0 ? (
              <div className="text-center py-8 text-[var(--muted)]">
                <div className="animate-pulse">Loading facilities...</div>
              </div>
            ) : filteredFacilities.length === 0 ? (
              <div className="text-center py-8 text-[var(--muted)]">
                <p>No facilities found nearby.</p>
                <p className="text-sm mt-2">Try adjusting your filters or search query.</p>
              </div>
            ) : (
              filteredFacilities.map((facility) => (
                <FacilityCard
                  key={facility.id}
                  facility={facility}
                  emergency={emergencyMode}
                  onNavigate={handleNavigate}
                  onBook={handleBookUHI}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* UHI Booking Modal */}
      <BookingModal
        isOpen={!!bookingFacility}
        onClose={() => setBookingFacility(null)}
        facilityName={bookingFacility?.name || ''}
        facilityId={bookingFacility?.id}
      />
    </AppLayout>
  );
}

function FilterButton({ label, active, onClick }: {
  label: string; 
  active?: boolean; 
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
        transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/50
        ${active 
          ? 'bg-[var(--brand)] text-white' 
          : 'bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--brand-soft)]'
        }
      `}
    >
      <span>{label}</span>
    </button>
  );
}

function FacilityCard({
  facility,
  emergency,
  onNavigate,
  onBook
}: {
  facility: Facility;
  emergency?: boolean;
  onNavigate: (facility: Facility, emergency?: boolean) => void;
  onBook: (facility: Facility) => void;
}) {
  // Format distance
  const formatDistance = (meters?: number): string => {
    if (!meters) return 'Unknown';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Get type display name
  const getTypeDisplayName = (type: string): string => {
    const typeMap: Record<string, string> = {
      'hospital': 'Hospital',
      'clinic': 'Specialist Clinic',
      'phc': 'Primary Health Center',
      'pharmacy': 'Pharmacy',
      'diagnostic': 'Diagnostic Center',
    };
    return typeMap[type] || type;
  };

  return (
    <div className={`
      bg-[var(--surface-strong)] border rounded-xl p-4
      transition-all hover:shadow-md
      ${emergency ? 'border-[var(--danger)]' : 'border-[var(--border)]'}
    `}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-[var(--foreground)] mb-1">{facility.name}</h4>
          <p className="text-sm text-[var(--muted)]">{getTypeDisplayName(facility.type)}</p>
        </div>
        {facility.rating && (
          <div className="flex items-center gap-1 text-sm">
            <span className="text-amber-500">★</span>
            <span className="font-medium text-[var(--foreground)]">{facility.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-[var(--muted)] mb-3">
        <div className="flex items-center gap-1">
          <span>📍</span>
          <span>{formatDistance(facility.distance)}</span>
        </div>
        {facility.waitTime && (
          <div className="flex items-center gap-1">
            <span>⏱️</span>
            <span>{facility.waitTime} wait</span>
          </div>
        )}
        {facility.available !== undefined && (
          <div className={`flex items-center gap-1 font-medium ${facility.available ? 'text-[var(--brand)]' : 'text-[var(--danger)]'}`}>
            <span>{facility.available ? '✓ Available' : '✕ Full'}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {emergency ? (
          <Button
            variant="danger"
            fullWidth
            onClick={() => onNavigate(facility, true)}
            icon={<span>🚨</span>}
          >
            Navigate Now
          </Button>
        ) : (
          <>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => onNavigate(facility)}
              icon={<span>🧭</span>}
            >
              Navigate
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => onBook(facility)}
            >
              Book via UHI
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
