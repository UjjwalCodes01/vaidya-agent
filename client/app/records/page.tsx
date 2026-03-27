'use client';

import { AppLayout } from '@/components/layout';
import { ConsentBadge, Button } from '@/components/shared';
import { useToast } from '@/components/shared/Toast';
import { useAuth } from '@/lib/hooks/useAuth';
import { useABDM, type ABDMConsent } from '@/lib/hooks/useABDM';
import { useState, useEffect } from 'react';

export default function RecordsPage() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'prescriptions' | 'diagnostics' | 'visits' | 'vaccinations'>('all');
  const [consents, setConsents] = useState<ABDMConsent[]>([]);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const { showToast } = useToast();
  const { user, linkABHA } = useAuth();
  const { loading, error, listConsents, revokeConsent, clearError } = useABDM();

  // Fetch consents when component mounts
  useEffect(() => {
    const fetchConsents = async () => {
      if (user?.userId) {
        const fetchedConsents = await listConsents(user.userId);
        setConsents(fetchedConsents);
      }
    };

    fetchConsents();
  }, [user?.userId, listConsents]);

  // Show error toast
  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      clearError();
    }
  }, [error, showToast, clearError]);

  const handleLinkABHA = async () => {
    const abhaAddress = prompt('Enter your ABHA address (e.g., username@abdm):');
    if (!abhaAddress) return;

    try {
      await linkABHA(abhaAddress);
      showToast('ABHA linked successfully!', 'success');
    } catch (err) {
      showToast('Failed to link ABHA. Please try again.', 'error');
    }
  };

  const handleManageConsents = () => {
    setShowConsentModal(true);
  };

  const handleRevokeAccess = async (consentId: string, facilityName: string) => {
    if (!confirm(`Revoke access for ${facilityName}?`)) return;

    const success = await revokeConsent(consentId);
    if (success) {
      showToast(`Access revoked for ${facilityName}`, 'success');
      // Refresh consents
      if (user?.userId) {
        const updatedConsents = await listConsents(user.userId);
        setConsents(updatedConsents);
      }
    }
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

  const abhaLinked = user?.abhaLinked || false;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Consent Management Modal */}
        {showConsentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Consent Management</h3>
                <button
                  onClick={() => setShowConsentModal(false)}
                  className="text-[var(--muted)] hover:text-[var(--foreground)] text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {consents.length > 0 ? (
                  consents.map((consent) => (
                    <div
                      key={consent.id}
                      className="border border-[var(--border)] rounded-xl p-4 space-y-3"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-[var(--foreground)]">
                            {consent.hipName}
                          </h4>
                          <p className="text-sm text-[var(--muted)]">{consent.purpose}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            consent.status === 'GRANTED'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : consent.status === 'REQUESTED'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {consent.status}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-[var(--muted)]">Data Types</p>
                          <p className="font-medium text-[var(--foreground)]">
                            {consent.hiTypes.join(', ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-[var(--muted)]">Date Range</p>
                          <p className="font-medium text-[var(--foreground)]">
                            {new Date(consent.dateRange.from).toLocaleDateString('en-IN')} -{' '}
                            {new Date(consent.dateRange.to).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                      </div>

                      {/* Timestamps */}
                      <div className="text-xs text-[var(--muted)]">
                        <p>Created: {new Date(consent.createdAt).toLocaleString('en-IN')}</p>
                        <p>Expires: {new Date(consent.expiryDate).toLocaleString('en-IN')}</p>
                      </div>

                      {/* Actions */}
                      {consent.status === 'GRANTED' && (
                        <button
                          onClick={async () => {
                            const success = await revokeConsent(consent.id);
                            if (success) {
                              showToast(`Consent revoked for ${consent.hipName}`, 'success');
                              if (user?.userId) {
                                const updated = await listConsents(user.userId);
                                setConsents(updated);
                              }
                            }
                          }}
                          className="w-full mt-2 px-4 py-2 rounded-xl border border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors text-sm font-medium"
                        >
                          Revoke Consent
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-[var(--muted)] mb-4">No consents found</p>
                    <p className="text-sm text-[var(--muted)]">
                      Healthcare facilities will request consent to access your health records
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={() => setShowConsentModal(false)} variant="secondary">
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ABHA Wallet Summary */}
        <div className="ui-shell rounded-[30px] p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow mb-2">Health identity</p>
              <h2 className="text-2xl font-bold mb-2 text-[var(--foreground)]">ABHA Health ID</h2>
              {abhaLinked ? (
                <>
                  <p className="text-[var(--muted)] mb-2">{user?.abhaAddress}</p>
                  <p className="text-sm text-[var(--brand)] font-medium">✓ Connected to ABDM</p>
                </>
              ) : (
                <>
                  <p className="text-[var(--muted)] mb-4">Link your ABHA to access complete health records</p>
                  <Button onClick={handleLinkABHA} disabled={loading}>
                    {loading ? 'Linking...' : 'Link ABHA Account'}
                  </Button>
                </>
              )}
            </div>
            <div className={`hidden rounded-[24px] border px-5 py-4 text-sm font-semibold md:block ${
              abhaLinked
                ? 'bg-[var(--brand-soft)] border-[var(--brand)]/30 text-[var(--brand)]'
                : 'bg-[var(--surface-strong)] border-[var(--border)] text-[var(--muted)]'
            }`}>
              {abhaLinked ? `Linked ✓` : 'Not linked'}
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
                {abhaLinked
                  ? `You have ${consents.filter(c => c.status === 'GRANTED').length} active consent(s)`
                  : 'Link ABHA to manage health data consents'
                }
              </p>
            </div>
            {abhaLinked && (
              <button
                onClick={handleManageConsents}
                className="text-[var(--brand)] hover:underline text-sm font-medium"
              >
                Manage Consents →
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {abhaLinked && consents.length > 0 ? (
              consents.slice(0, 3).map((consent) => (
                <ConsentBadge
                  key={consent.id}
                  status={consent.status === 'GRANTED' ? 'granted' : 'pending'}
                  grantedTo={consent.hipName}
                  grantedAt={new Date(consent.createdAt)}
                />
              ))
            ) : (
              <>
                <ConsentBadge status="pending" />
                <div className="text-sm text-[var(--muted)] py-2">
                  {abhaLinked ? 'No active consents' : 'Link ABHA to view consents'}
                </div>
              </>
            )}
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
            {abhaLinked && consents.length > 0 ? (
              consents.map((consent) => (
                <AccessItem
                  key={consent.id}
                  consentId={consent.id}
                  facility={consent.hipName}
                  status={consent.status === 'GRANTED' ? 'Active' : 'Revoked'}
                  since={new Date(consent.createdAt).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  onRevoke={handleRevokeAccess}
                />
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-[var(--muted)]">
                  {abhaLinked ? 'No consents found' : 'Link ABHA to view access history'}
                </p>
              </div>
            )}
          </div>
          {abhaLinked && consents.length > 0 && (
            <button
              onClick={handleViewAccessHistory}
              className="mt-4 text-sm text-[var(--brand)] hover:underline font-medium"
            >
              View all access history →
            </button>
          )}
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

function AccessItem({ consentId, facility, status, since, onRevoke }: {
  consentId: string;
  facility: string;
  status: 'Active' | 'Revoked';
  since: string;
  onRevoke: (consentId: string, facilityName: string) => void;
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
            onClick={() => onRevoke(consentId, facility)}
            className="text-sm text-[var(--danger)] hover:underline"
          >
            Revoke
          </button>
        )}
      </div>
    </div>
  );
}
