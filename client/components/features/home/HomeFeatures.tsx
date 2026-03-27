'use client';

import { StatusCard } from '@/components/shared';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { useState, useEffect } from 'react';

interface LastTriage {
  sessionId: string;
  timestamp: string;
  severity: string;
  suspectedConditions: string[];
  summary?: string;
}

interface HealthAlert {
  id: string;
  title: string;
  description: string;
  topic: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Home Page Features
 */
export function HomeFeatures() {
  const { user } = useAuth();
  const [lastTriage, setLastTriage] = useState<LastTriage | null>(null);
  const [healthAlert, setHealthAlert] = useState<HealthAlert | null>(null);
  const [, setLoading] = useState(true);

  // Fetch last triage session and health alerts
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch RAG guidelines for health alerts
        const guidelinesRes = await fetch('/api/rag/guidelines?category=emergency');
        if (guidelinesRes.ok) {
          const guidelinesData = await guidelinesRes.json();
          if (guidelinesData.success && guidelinesData.data?.guidelines?.length > 0) {
            const alert = guidelinesData.data.guidelines[0];
            setHealthAlert({
              id: alert.id,
              title: alert.condition || 'Health Advisory',
              description: alert.description?.substring(0, 100) + '...' || 'Stay safe and healthy.',
              topic: alert.condition?.toLowerCase().replace(/\s+/g, '-') || 'health',
              priority: alert.category === 'emergency' ? 'high' : 'medium',
            });
          }
        }
        
        // Attempt to fetch last triage session (if user is logged in)
        if (user?.abhaAddress) {
          try {
            const triageRes = await fetch('/api/agent/session?latest=true');
            if (triageRes.ok) {
              const triageData = await triageRes.json();
              if (triageData.success && triageData.data?.session) {
                const session = triageData.data.session;
                setLastTriage({
                  sessionId: session.id || '',
                  severity: session.severity || 'low',
                  summary: session.summary || 'Previous consultation available',
                  timestamp: session.createdAt || new Date().toISOString(),
                  suspectedConditions: session.suspectedConditions || [],
                });
              }
            }
          } catch {
            // Silently ignore - last triage is optional
          }
        }
      } catch (error) {
        console.error('[Home] Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.abhaAddress]);

  // Determine ABHA status
  const abhaLinked = user?.abhaLinked || false;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Welcome Section */}
      <div className="ui-shell rounded-[32px] p-6 md:p-8">
        <p className="eyebrow mb-3">Care Dashboard</p>
        <div className="grid gap-6 md:grid-cols-[1.4fr_0.8fr] md:items-end">
          <div>
            <h2 className="section-title mb-3">
              {user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'A calmer, clearer way to start healthcare triage.'}
            </h2>
            <p className="muted-copy max-w-2xl text-base md:text-lg">
              Talk to Vaidya, review your records, and move to the right care option without navigating a cluttered system.
            </p>
          </div>
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--brand)] px-5 py-5 text-white">
            <p className="text-xs uppercase tracking-[0.16em] text-white/70">Current readiness</p>
            <p className="mt-3 text-3xl font-semibold">Voice triage ready</p>
            <p className="mt-2 text-sm text-white/80">ABDM and UHI workflows remain one step away from the same dashboard.</p>
          </div>
        </div>
      </div>

      {/* Primary Action */}
      <Link
        href="/triage"
        className="block rounded-[32px] bg-[linear-gradient(135deg,#15372f_0%,#235347_55%,#396f61_100%)] p-8 text-white shadow-[0_24px_50px_rgba(21,55,47,0.28)] transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-[var(--brand)]/30"
      >
        <p className="mb-3 text-xs uppercase tracking-[0.18em] text-white/60">Primary action</p>
        <div className="flex items-center justify-between gap-6">
          <div>
            <h3 className="text-3xl font-bold mb-2">Start Triage</h3>
            <p className="max-w-xl text-white/80">Begin with voice or text and let the assistant guide the next best step.</p>
          </div>
          <div className="hidden min-w-[150px] rounded-[28px] border border-white/15 bg-white/10 px-5 py-5 md:block">
            <p className="text-sm text-white/70">Response mode</p>
            <p className="mt-2 text-xl font-semibold">{user?.language || 'Hindi + English'}</p>
          </div>
        </div>
      </Link>

      {/* Health Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatusCard
          title="Last Triage"
          icon="LT"
          status={lastTriage ? 'success' : 'info'}
          action={{
            label: lastTriage ? 'View Details' : 'Start Triage',
            onClick: () => (window.location.href = lastTriage ? '/records' : '/triage')
          }}
        >
          {lastTriage ? (
            <>
              <p className="text-sm capitalize">{lastTriage.severity} severity</p>
              <p className="text-xs text-[var(--muted)] mt-1">
                {lastTriage.suspectedConditions?.slice(0, 2).join(', ')}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm">No recent triage sessions</p>
              <p className="text-xs text-[var(--muted)] mt-1">Start your first consultation</p>
            </>
          )}
        </StatusCard>

        <StatusCard
          title="ABHA Status"
          icon="AB"
          status={abhaLinked ? 'success' : 'warning'}
          action={{
            label: abhaLinked ? 'View Profile' : 'Link ABHA',
            onClick: () => (window.location.href = '/profile')
          }}
        >
          {abhaLinked ? (
            <>
              <p className="text-sm">Linked ✓</p>
              <p className="text-xs text-[var(--muted)] mt-1">{user?.abhaAddress || 'Connected to ABDM'}</p>
            </>
          ) : (
            <>
              <p className="text-sm">Not linked</p>
              <p className="text-xs text-[var(--muted)] mt-1">Link your ABHA for seamless health records</p>
            </>
          )}
        </StatusCard>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <QuickActionCard href="/records" label="View Records" icon="📋" />
          <QuickActionCard href="/care-finder" label="Find Hospital" icon="🏥" />
          <QuickActionCard href="/guides" label="Health Guides" icon="📚" />
        </div>
      </div>

      {/* Local Health Alert */}
      <div className="ui-section rounded-[28px] border-l-[5px] border-l-[var(--accent)] p-5">
        <div className="flex items-start gap-3">
          <div>
            <p className="eyebrow mb-2">Local alert</p>
            <h4 className="font-semibold text-[var(--foreground)] mb-1">
              {healthAlert?.title || 'This Week in Your Region'}
            </h4>
            <p className="text-sm text-[var(--muted)]">
              {healthAlert?.description || 'Dengue cases increasing. Stay hydrated and use mosquito repellent.'}
            </p>
            <Link
              href={`/guides?topic=${healthAlert?.topic || 'dengue'}`}
              className="mt-3 inline-block text-sm font-medium text-[var(--brand)] hover:underline"
            >
              Learn more
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ href, label, icon }: { href: string; label: string; icon?: string }) {
  return (
    <Link
      href={href}
      className="ui-section rounded-[24px] p-5 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/50 flex flex-col items-center text-center"
    >
      {icon && <span className="text-2xl mb-2">{icon}</span>}
      <span className="eyebrow mb-1 block">Quick action</span>
      <span className="text-base font-semibold text-[var(--foreground)]">
        {label}
      </span>
    </Link>
  );
}
