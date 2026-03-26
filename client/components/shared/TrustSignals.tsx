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
    <div className="flex flex-wrap items-center justify-end gap-2 text-xs md:text-sm">
      {abhaLinked && (
        <div className="soft-pill px-3 py-1.5">
          <span className="font-medium text-foreground">ABHA linked</span>
        </div>
      )}
      
      {consentProtected && (
        <div className="soft-pill px-3 py-1.5">
          <span className="font-medium text-foreground">Consent protected</span>
        </div>
      )}
      
      <div className="soft-pill px-3 py-1.5">
        <span className="font-medium text-foreground">{language}</span>
      </div>
    </div>
  );
}
