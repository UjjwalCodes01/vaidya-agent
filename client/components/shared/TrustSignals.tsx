'use client';

/**
 * Trust Signals Header
 * Shows ABHA status, language, and consent protection
 */
export function TrustSignals({ 
  abhaLinked = false,
  language = 'English',
  consentProtected = true 
}: {
  abhaLinked?: boolean;
  language?: string;
  consentProtected?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
      {abhaLinked && (
        <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 px-2 md:px-3 py-1 rounded-full">
          <span className="text-green-700 dark:text-green-400">🔗</span>
          <span className="font-medium text-green-800 dark:text-green-300">ABHA</span>
        </div>
      )}
      
      {consentProtected && (
        <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 px-2 md:px-3 py-1 rounded-full">
          <span className="text-blue-700 dark:text-blue-400">🛡️</span>
          <span className="font-medium text-blue-800 dark:text-blue-300">Protected</span>
        </div>
      )}
      
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 md:px-3 py-1 rounded-full">
        <span>🌐</span>
        <span className="font-medium text-gray-700 dark:text-gray-300">{language}</span>
      </div>
    </div>
  );
}
