'use client';

import { ReactNode } from 'react';

interface StatusCardProps {
  title: string;
  icon: string;
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
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className={`rounded-lg border p-4 md:p-6 ${getStyle()}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label={title}>
            {icon}
          </span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
      </div>
      
      <div className="text-gray-700 dark:text-gray-300 mb-4">
        {children}
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
        >
          {action.label} →
        </button>
      )}
    </div>
  );
}
