'use client';

import { AppLayout } from '@/components/layout';
import { ConsentBadge, Button } from '@/components/shared';
import { useToast } from '@/components/shared/Toast';
import { useState } from 'react';

export default function RecordsPage() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'prescriptions' | 'diagnostics' | 'visits' | 'vaccinations'>('all');
  const { showToast } = useToast();

  const handleLinkABHA = () => {
    showToast('Redirecting to ABHA linking...', 'info');
    // In production: Redirect to ABDM linking flow
    setTimeout(() => {
      showToast('ABHA linking requires OTP verification', 'warning');
    }, 1500);
  };

  const handleManageConsents = () => {
    showToast('Opening consent management...', 'info');
  };

  const handleViewAccessHistory = () => {
    showToast('Loading full access history...', 'info');
  };

  const handleExportPDF = () => {
    showToast('Generating PDF export...', 'info');
    setTimeout(() => {
      showToast('PDF export ready for download!', 'success');
    }, 2000);
  };

  const handleShareEmail = () => {
    showToast('Opening email share dialog...', 'info');
  };

  const handleViewDetails = (title: string) => {
    showToast(`Opening details: ${title}`, 'info');
  };

  const handleRevokeAccess = (facility: string) => {
    showToast(`Revoking access for ${facility}...`, 'warning');
    setTimeout(() => {
      showToast(`Access revoked for ${facility}`, 'success');
    }, 1500);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ABHA Wallet Summary */}
        <div className="ui-shell rounded-[30px] p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow mb-2">Health identity</p>
              <h2 className="text-2xl font-bold mb-2 text-[var(--foreground)]">ABHA Health ID</h2>
              <p className="text-[var(--muted)] mb-4">Link your ABHA to access complete health records</p>
              <Button onClick={handleLinkABHA}>
                Link ABHA Account
              </Button>
            </div>
            <div className="hidden rounded-[24px] border border-[var(--border)] bg-[var(--brand-soft)] px-5 py-4 text-sm font-semibold text-[var(--brand)] md:block">
              Not linked
            </div>
          </div>
        </div>

        {/* Consent Control Banner */}
        <div className="bg-[var(--surface-strong)] rounded-xl p-6 border border-[var(--border)]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
                Data Sharing & Consent
              </h3>
              <p className="text-sm text-[var(--muted)]">
                You control who can access your health records
              </p>
            </div>
            <button 
              onClick={handleManageConsents}
              className="text-[var(--brand)] hover:underline text-sm font-medium"
            >
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
          <FilterChip label="Prescriptions" active={activeFilter === 'prescriptions'} onClick={() => setActiveFilter('prescriptions')} />
          <FilterChip label="Diagnostics" active={activeFilter === 'diagnostics'} onClick={() => setActiveFilter('diagnostics')} />
          <FilterChip label="Visits" active={activeFilter === 'visits'} onClick={() => setActiveFilter('visits')} />
          <FilterChip label="Vaccinations" active={activeFilter === 'vaccinations'} onClick={() => setActiveFilter('vaccinations')} />
        </div>

        {/* Medical Timeline */}
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Medical History Timeline
          </h3>
          <div className="space-y-4">
            <TimelineItem 
              date="March 20, 2026"
              type="visit"
              title="General Consultation"
              facility="Apollo Hospital, Delhi"
              description="Follow-up consultation with Dr. Sharma for routine checkup"
              onViewDetails={handleViewDetails}
            />
            
            <TimelineItem 
              date="March 18, 2026"
              type="diagnostic"
              title="Blood Test Results"
              facility="PathLabs, Noida"
              description="Complete Blood Count (CBC) - All values normal"
              onViewDetails={handleViewDetails}
            />
            
            <TimelineItem 
              date="March 15, 2026"
              type="prescription"
              title="Prescription"
              facility="Dr. Sharma Clinic"
              description="Paracetamol 500mg - 3 times daily for 5 days"
              onViewDetails={handleViewDetails}
            />
            
            <TimelineItem 
              date="March 1, 2026"
              type="vaccination"
              title="COVID-19 Booster"
              facility="Government Health Center"
              description="Covishield booster dose administered"
              onViewDetails={handleViewDetails}
            />
          </div>
        </div>

        {/* Who Can Access Panel */}
        <div className="bg-[var(--brand-soft)] border border-[var(--brand)]/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Who can access your data?
          </h3>
          <div className="space-y-3">
            <AccessItem facility="Apollo Hospital" status="Active" since="March 15, 2026" onRevoke={handleRevokeAccess} />
            <AccessItem facility="Dr. Sharma Clinic" status="Active" since="March 10, 2026" onRevoke={handleRevokeAccess} />
            <AccessItem facility="PathLabs" status="Revoked" since="Feb 20, 2026" onRevoke={handleRevokeAccess} />
          </div>
          <button 
            onClick={handleViewAccessHistory}
            className="mt-4 text-sm text-[var(--brand)] hover:underline font-medium"
          >
            View all access history →
          </button>
        </div>

        {/* Export Options */}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={handleExportPDF} icon={<span>📄</span>}>
            Export as PDF
          </Button>
          <Button variant="secondary" className="flex-1" onClick={handleShareEmail} icon={<span>📧</span>}>
            Share via Email
          </Button>
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
        transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/50
        ${active 
          ? 'bg-[var(--brand)] text-white' 
          : 'bg-[var(--surface-strong)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--brand-soft)]'
        }
      `}
    >
      {label}
    </button>
  );
}

function TimelineItem({ date, type, title, facility, description, onViewDetails }: {
  date: string;
  type: 'visit' | 'prescription' | 'diagnostic' | 'vaccination';
  title: string;
  facility: string;
  description: string;
  onViewDetails: (title: string) => void;
}) {
  const getIcon = () => {
    switch (type) {
      case 'visit': return '🏥';
      case 'prescription': return '💊';
      case 'diagnostic': return '🔬';
      case 'vaccination': return '💉';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'visit': return 'bg-[var(--brand-soft)] border-[var(--brand)]/30';
      case 'prescription': return 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700';
      case 'diagnostic': return 'bg-[var(--brand-soft)] border-[var(--brand)]/30';
      case 'vaccination': return 'bg-[var(--accent)]/10 border-[var(--accent)]/30';
    }
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 ${getColor()}`}>
          {getIcon()}
        </div>
        <div className="w-0.5 h-full bg-[var(--border)] mt-2" />
      </div>
      
      <div className="flex-1 pb-6">
        <div className="bg-[var(--surface-strong)] rounded-xl p-4 border border-[var(--border)]">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-semibold text-[var(--foreground)]">{title}</h4>
              <p className="text-sm text-[var(--muted)]">{facility}</p>
            </div>
            <span className="text-xs text-[var(--muted)] whitespace-nowrap ml-2">{date}</span>
          </div>
          <p className="text-sm text-[var(--foreground)]">{description}</p>
          <button 
            onClick={() => onViewDetails(title)}
            className="mt-2 text-sm text-[var(--brand)] hover:underline"
          >
            View details →
          </button>
        </div>
      </div>
    </div>
  );
}

function AccessItem({ facility, status, since, onRevoke }: { 
  facility: string; 
  status: 'Active' | 'Revoked'; 
  since: string;
  onRevoke: (facility: string) => void;
}) {
  return (
    <div className="flex items-center justify-between bg-[var(--surface-strong)] p-3 rounded-xl">
      <div>
        <p className="font-medium text-[var(--foreground)]">{facility}</p>
        <p className="text-xs text-[var(--muted)]">Since {since}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-sm font-medium ${status === 'Active' ? 'text-[var(--brand)]' : 'text-[var(--danger)]'}`}>
          {status}
        </span>
        {status === 'Active' && (
          <button 
            onClick={() => onRevoke(facility)}
            className="text-sm text-[var(--danger)] hover:underline"
          >
            Revoke
          </button>
        )}
      </div>
    </div>
  );
}
