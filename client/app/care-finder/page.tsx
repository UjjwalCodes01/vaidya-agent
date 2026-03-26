'use client';

import { AppLayout } from '@/components/layout';
import { useState } from 'react';

export default function CareFinderPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'hospital' | 'phc' | 'specialist' | 'diagnostic'>('all');

  return (
    <AppLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Emergency Mode Strip */}
        {emergencyMode && (
          <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚨</span>
              <span className="font-semibold">Emergency Mode Active</span>
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
        <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          <div className="flex gap-2">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hospitals, PHCs, specialists..."
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              onClick={() => setEmergencyMode(!emergencyMode)}
              className={`px-4 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 ${
                emergencyMode 
                  ? 'bg-red-600 text-white' 
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}
            >
              🚨
            </button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1">
            <FilterButton icon="🏥" label="All" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
            <FilterButton icon="🏛️" label="PHC" active={activeFilter === 'phc'} onClick={() => setActiveFilter('phc')} />
            <FilterButton icon="🏥" label="Hospitals" active={activeFilter === 'hospital'} onClick={() => setActiveFilter('hospital')} />
            <FilterButton icon="👨‍⚕️" label="Specialists" active={activeFilter === 'specialist'} onClick={() => setActiveFilter('specialist')} />
            <FilterButton icon="🧪" label="Diagnostics" active={activeFilter === 'diagnostic'} onClick={() => setActiveFilter('diagnostic')} />
          </div>
        </div>

        {/* Map View */}
        <div className="flex-1 bg-gray-300 dark:bg-gray-700 relative">
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 dark:text-gray-400 p-4">
            <span className="text-6xl mb-4">🗺️</span>
            <p className="text-lg font-semibold mb-2">Map View</p>
            <p className="text-sm text-center">Integrate Google Maps API here</p>
            <p className="text-xs text-center mt-2 max-w-md">
              Will show nearby facilities with pins, distance, and navigation
            </p>
          </div>
        </div>

        {/* Facility Cards (Scrollable Bottom Sheet) */}
        <div className="bg-white dark:bg-gray-800 border-t-2 border-gray-200 dark:border-gray-700 overflow-y-auto max-h-80">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Nearby Facilities ({emergencyMode ? 'Emergency' : '12 results'})
              </h3>
              <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
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
            />
            
            <FacilityCard 
              name="Max Super Speciality Hospital"
              type="Super Specialty Hospital"
              distance="3.2 km"
              waitTime="35 min"
              available={true}
              rating={4.7}
              emergency={emergencyMode}
            />
            
            <FacilityCard 
              name="Government PHC Sector 15"
              type="Primary Health Center"
              distance="1.8 km"
              waitTime="15 min"
              available={true}
              rating={3.9}
              emergency={emergencyMode}
            />
            
            <FacilityCard 
              name="Fortis Hospital"
              type="Multi-specialty Hospital"
              distance="4.5 km"
              waitTime="45 min"
              available={false}
              rating={4.6}
              emergency={emergencyMode}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function FilterButton({ icon, label, active, onClick }: { 
  icon: string; 
  label: string; 
  active?: boolean; 
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
        transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
        ${active 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }
      `}
    >
      <span>{icon}</span>
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
  emergency 
}: { 
  name: string;
  type: string;
  distance: string;
  waitTime: string;
  available: boolean;
  rating: number;
  emergency?: boolean;
}) {
  return (
    <div className={`
      bg-white dark:bg-gray-800 border rounded-lg p-4 
      transition-all hover:shadow-md
      ${emergency ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}
    `}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{name}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">{type}</p>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-yellow-500">⭐</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">{rating}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
        <div className="flex items-center gap-1">
          <span>📍</span>
          <span>{distance}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>⏱️</span>
          <span>{waitTime} wait</span>
        </div>
        <div className={`flex items-center gap-1 font-medium ${available ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          <span>{available ? '✅' : '🚫'}</span>
          <span>{available ? 'Available' : 'Full'}</span>
        </div>
      </div>

      <div className="flex gap-2">
        {emergency ? (
          <button className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500">
            🚨 Navigate Now
          </button>
        ) : (
          <>
            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
              🗺️ Navigate
            </button>
            <button className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-650 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
              📅 Book via UHI
            </button>
          </>
        )}
      </div>
    </div>
  );
}
