'use client';

import { AppLayout } from '@/components/layout';
import { ConsentBadge } from '@/components/shared';
import { useState } from 'react';

export default function RecordsPage() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'prescriptions' | 'diagnostics' | 'visits' | 'vaccinations'>('all');

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ABHA Wallet Summary */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">ABHA Health ID</h2>
              <p className="text-green-100 mb-4">Link your ABHA to access complete health records</p>
              <button className="bg-white text-green-700 px-6 py-2 rounded-lg font-medium hover:bg-green-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white">
                Link ABHA Account →
              </button>
            </div>
            <span className="text-5xl">🔗</span>
          </div>
        </div>

        {/* Consent Control Banner */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Data Sharing & Consent
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You control who can access your health records
              </p>
            </div>
            <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
              Manage Consents →
            </button>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <ConsentBadge status="granted" grantedTo="Apollo Hospital" grantedAt={new Date('2026-03-15')} />
            <ConsentBadge status="pending" />
            <ConsentBadge status="granted" grantedTo="Dr. Sharma Clinic" grantedAt={new Date('2026-03-10')} />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <FilterChip label="All Records" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
          <FilterChip label="💊 Prescriptions" active={activeFilter === 'prescriptions'} onClick={() => setActiveFilter('prescriptions')} />
          <FilterChip label="🧪 Diagnostics" active={activeFilter === 'diagnostics'} onClick={() => setActiveFilter('diagnostics')} />
          <FilterChip label="🏥 Visits" active={activeFilter === 'visits'} onClick={() => setActiveFilter('visits')} />
          <FilterChip label="💉 Vaccinations" active={activeFilter === 'vaccinations'} onClick={() => setActiveFilter('vaccinations')} />
        </div>

        {/* Medical Timeline */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Medical History Timeline
          </h3>
          <div className="space-y-4">
            <TimelineItem 
              date="March 20, 2026"
              type="visit"
              title="General Consultation"
              facility="Apollo Hospital, Delhi"
              description="Follow-up consultation with Dr. Sharma for routine checkup"
            />
            
            <TimelineItem 
              date="March 18, 2026"
              type="diagnostic"
              title="Blood Test Results"
              facility="PathLabs, Noida"
              description="Complete Blood Count (CBC) - All values normal"
            />
            
            <TimelineItem 
              date="March 15, 2026"
              type="prescription"
              title="Prescription"
              facility="Dr. Sharma Clinic"
              description="Paracetamol 500mg - 3 times daily for 5 days"
            />
            
            <TimelineItem 
              date="March 1, 2026"
              type="vaccination"
              title="COVID-19 Booster"
              facility="Government Health Center"
              description="Covishield booster dose administered"
            />
          </div>
        </div>

        {/* Who Can Access Panel */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
            <span>🔐</span>
            Who can access your data?
          </h3>
          <div className="space-y-3">
            <AccessItem facility="Apollo Hospital" status="Active" since="March 15, 2026" />
            <AccessItem facility="Dr. Sharma Clinic" status="Active" since="March 10, 2026" />
            <AccessItem facility="PathLabs" status="Revoked" since="Feb 20, 2026" />
          </div>
          <button className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
            View all access history →
          </button>
        </div>

        {/* Export Options */}
        <div className="flex gap-3">
          <button className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
            📄 Export as PDF
          </button>
          <button className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
            ✉️ Share via Email
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
        transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
        ${active 
          ? 'bg-blue-600 text-white' 
          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-750'
        }
      `}
    >
      {label}
    </button>
  );
}

function TimelineItem({ date, type, title, facility, description }: {
  date: string;
  type: 'visit' | 'prescription' | 'diagnostic' | 'vaccination';
  title: string;
  facility: string;
  description: string;
}) {
  const getIcon = () => {
    switch (type) {
      case 'visit': return '🏥';
      case 'prescription': return '💊';
      case 'diagnostic': return '🧪';
      case 'vaccination': return '💉';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'visit': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
      case 'prescription': return 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700';
      case 'diagnostic': return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
      case 'vaccination': return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
    }
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 ${getColor()}`}>
          {getIcon()}
        </div>
        <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-2" />
      </div>
      
      <div className="flex-1 pb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{facility}</p>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">{date}</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{description}</p>
          <button className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View details →
          </button>
        </div>
      </div>
    </div>
  );
}

function AccessItem({ facility, status, since }: { facility: string; status: 'Active' | 'Revoked'; since: string }) {
  return (
    <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg">
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{facility}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Since {since}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-sm font-medium ${status === 'Active' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {status}
        </span>
        {status === 'Active' && (
          <button className="text-sm text-red-600 dark:text-red-400 hover:underline">
            Revoke
          </button>
        )}
      </div>
    </div>
  );
}
