'use client';

import { EmergencyFAB } from '../shared/EmergencyFAB';
import { BottomNav } from '../shared/BottomNav';
import { TrustSignals } from '../shared/TrustSignals';

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
  // TODO: Get user context from auth
  const user = {
    name: 'User',
    abhaLinked: false,
    language: 'English'
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Trust Signals Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              🏥 Vaidya
            </h1>
          </div>
          <TrustSignals 
            abhaLinked={user.abhaLinked}
            language={user.language}
            consentProtected={true}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      {showNav && <BottomNav />}

      {/* Emergency FAB */}
      {showEmergencyFAB && <EmergencyFAB />}
    </div>
  );
}
