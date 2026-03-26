'use client';

interface ConsentBadgeProps {
  status: 'granted' | 'pending' | 'revoked';
  grantedTo?: string;
  grantedAt?: Date;
}

/**
 * Consent Badge
 * Shows consent status for health records
 */
export function ConsentBadge({ status, grantedTo, grantedAt }: ConsentBadgeProps) {
  const getStyle = () => {
    switch (status) {
      case 'granted':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
      case 'revoked':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'granted': return '✅';
      case 'pending': return '⏳';
      case 'revoked': return '🚫';
    }
  };

  return (
    <div className={`inline-flex flex-col gap-1 px-3 py-2 rounded-lg border ${getStyle()}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{getIcon()}</span>
        <span className="font-semibold text-sm capitalize">{status}</span>
      </div>
      {grantedTo && status === 'granted' && (
        <div className="text-xs opacity-80">
          <div>To: {grantedTo}</div>
          {grantedAt && <div>On: {grantedAt.toLocaleDateString()}</div>}
        </div>
      )}
    </div>
  );
}
