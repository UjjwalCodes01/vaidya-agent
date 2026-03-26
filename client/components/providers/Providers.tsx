'use client';

import { ToastProvider } from '@/components/shared/Toast';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Client-side providers wrapper
 * Includes all context providers needed by the app
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
}
