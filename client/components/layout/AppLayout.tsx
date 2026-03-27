'use client';

import { EmergencyFAB } from '../shared/EmergencyFAB';
import { BottomNav } from '../shared/BottomNav';
import { TrustSignals } from '../shared/TrustSignals';
import { useAuth } from '@/lib/hooks/useAuth';

interface AppLayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
  showEmergencyFAB?: boolean;
}

/**
 * Main App Layout
 * Wraps all pages with consistent navigation and emergency access
 */
export function AppLayout({ children, showNav = true, showEmergencyFAB = true }: AppLayoutProps) {
  const { user } = useAuth();

  // Default values while loading or if no user
  const displayUser = {
    name: user?.name || 'User',
    abhaLinked: user?.abhaLinked || false,
    language: user?.language || 'English'
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Trust Signals Header */}
      <header className="sticky top-0 z-30 px-4 pt-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="ui-shell flex w-full items-center justify-between rounded-[24px] px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-sm font-bold tracking-[0.2em] text-white">
                VA
              </div>
              <div>
                <p className="eyebrow">Autonomous Care Assistant</p>
                <h1 className="text-xl font-semibold text-foreground md:text-2xl">
                  Vaidya
                </h1>
              </div>
            </div>
            <TrustSignals
              abhaLinked={displayUser.abhaLinked}
              language={displayUser.language}
              consentProtected={true}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24 pt-5 md:pb-28">
        {children}
      </main>

      {/* Bottom Navigation */}
      {showNav && <BottomNav />}

      {/* Emergency FAB */}
      {showEmergencyFAB && <EmergencyFAB />}
    </div>
  );
}
