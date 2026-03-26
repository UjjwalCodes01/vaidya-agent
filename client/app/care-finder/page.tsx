'use client';

import { AppLayout } from '@/components/layout';
import { Button } from '@/components/shared';
import { useToast } from '@/components/shared/Toast';
import { useState } from 'react';

export default function CareFinderPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'hospital' | 'phc' | 'specialist' | 'diagnostic'>('all');
  const { showToast } = useToast();

  const handleNavigate = (facilityName: string, emergency?: boolean) => {
    if (emergency) {
      showToast(`Finding fastest route to ${facilityName}...`, 'warning');
      // In production: Use Google Maps Directions API
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(facilityName)}`, '_blank');
    } else {
      showToast(`Opening directions to ${facilityName}`, 'info');
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(facilityName)}`, '_blank');
    }
  };

  const handleBookUHI = (facilityName: string) => {
    showToast(`Initiating UHI booking for ${facilityName}...`, 'info');
    // In production: Call UHI API endpoint
    setTimeout(() => {
      showToast('UHI booking feature coming soon!', 'warning');
    }, 1500);
  };

  const handleSort = () => {
    showToast('Sorting facilities by distance...', 'info');
  };

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
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--muted)] p-4">
            <div className="w-16 h-16 mb-4 rounded-full bg-[var(--brand)]/10 flex items-center justify-center">
              <span className="text-3xl">📍</span>
            </div>
            <p className="text-lg font-semibold mb-2 text-[var(--foreground)]">Map View</p>
            <p className="text-sm text-center">Interactive map with facility locations</p>
            <p className="text-xs text-center mt-2 max-w-md">
              Shows nearby facilities with pins, distance, and real-time navigation
            </p>
          </div>
        </div>

        {/* Facility Cards (Scrollable Bottom Sheet) */}
        <div className="bg-[var(--surface-strong)] border-t-2 border-[var(--border)] overflow-y-auto max-h-80">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[var(--foreground)]">
                Nearby Facilities ({emergencyMode ? 'Emergency' : '12 results'})
              </h3>
              <button 
                onClick={handleSort}
                className="text-sm text-[var(--brand)] hover:underline"
              >
                Sort by distance
              </button>
            </div>

            <FacilityCard 
              name="Apollo Hospital"
              type="Multi-specialty Hospital"
              distance="2.5 km"
              waitTime="20 min"
              available={true}
              rating={4.5}
              emergency={emergencyMode}
              onNavigate={handleNavigate}
              onBook={handleBookUHI}
            />
            
            <FacilityCard 
              name="Max Super Speciality Hospital"
              type="Super Specialty Hospital"
              distance="3.2 km"
              waitTime="35 min"
              available={true}
              rating={4.7}
              emergency={emergencyMode}
              onNavigate={handleNavigate}
              onBook={handleBookUHI}
            />
            
            <FacilityCard 
              name="Government PHC Sector 15"
              type="Primary Health Center"
              distance="1.8 km"
              waitTime="15 min"
              available={true}
              rating={3.9}
              emergency={emergencyMode}
              onNavigate={handleNavigate}
              onBook={handleBookUHI}
            />
            
            <FacilityCard 
              name="Fortis Hospital"
              type="Multi-specialty Hospital"
              distance="4.5 km"
              waitTime="45 min"
              available={false}
              rating={4.6}
              emergency={emergencyMode}
              onNavigate={handleNavigate}
              onBook={handleBookUHI}
            />
          </div>
        </div>
      </div>
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
  name, 
  type, 
  distance, 
  waitTime, 
  available, 
  rating,
  emergency,
  onNavigate,
  onBook
}: { 
  name: string;
  type: string;
  distance: string;
  waitTime: string;
  available: boolean;
  rating: number;
  emergency?: boolean;
  onNavigate: (name: string, emergency?: boolean) => void;
  onBook: (name: string) => void;
}) {
  return (
    <div className={`
      bg-[var(--surface-strong)] border rounded-xl p-4 
      transition-all hover:shadow-md
      ${emergency ? 'border-[var(--danger)]' : 'border-[var(--border)]'}
    `}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-[var(--foreground)] mb-1">{name}</h4>
          <p className="text-sm text-[var(--muted)]">{type}</p>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-amber-500">★</span>
          <span className="font-medium text-[var(--foreground)]">{rating.toFixed(1)}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-[var(--muted)] mb-3">
        <div className="flex items-center gap-1">
          <span>📍</span>
          <span>{distance}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>⏱️</span>
          <span>{waitTime} wait</span>
        </div>
        <div className={`flex items-center gap-1 font-medium ${available ? 'text-[var(--brand)]' : 'text-[var(--danger)]'}`}>
          <span>{available ? '✓ Available' : '✕ Full'}</span>
        </div>
      </div>

      <div className="flex gap-2">
        {emergency ? (
          <Button 
            variant="danger" 
            fullWidth
            onClick={() => onNavigate(name, true)}
            icon={<span>🚨</span>}
          >
            Navigate Now
          </Button>
        ) : (
          <>
            <Button 
              variant="primary" 
              className="flex-1"
              onClick={() => onNavigate(name)}
              icon={<span>🧭</span>}
            >
              Navigate
            </Button>
            <Button 
              variant="secondary" 
              className="flex-1"
              onClick={() => onBook(name)}
            >
              Book via UHI
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
