'use client';

import { ReactNode } from 'react';

interface StatusCardProps {
  title: string;
  icon?: string;
  children: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  status?: 'success' | 'warning' | 'error' | 'info';
}

/**
 * Status Card
 * Reusable card component for displaying health information
 */
export function StatusCard({ title, icon, children, action, status = 'info' }: StatusCardProps) {
  const getStyle = () => {
    switch (status) {
      case 'success':
        return 'border-l-[5px] border-l-[var(--brand)] bg-[var(--surface-strong)]';
      case 'warning':
        return 'border-l-[5px] border-l-[var(--accent)] bg-[var(--surface-strong)]';
      case 'error':
        return 'border-l-[5px] border-l-[var(--danger)] bg-[var(--surface-strong)]';
      default:
        return 'border-l-[5px] border-l-[var(--brand)] bg-[var(--surface-strong)]';
    }
  };

  return (
    <div className={`ui-section rounded-[28px] p-5 md:p-6 ${getStyle()}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {icon ? (
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-sm font-semibold text-[var(--brand)]">
              {icon}
            </span>
          ) : null}
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            {title}
          </h3>
        </div>
      </div>
      
      <div className="mb-4 text-[var(--foreground)]">
        {children}
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--brand)] hover:bg-[var(--brand-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/50"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
