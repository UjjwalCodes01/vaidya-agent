'use client';

import { useState } from 'react';

/**
 * Emergency Floating Action Button
 * Always visible, high-priority emergency access
 */
export function EmergencyFAB() {
  const [isPressed, setIsPressed] = useState(false);

  const handleEmergencyClick = () => {
    // TODO: Integrate with emergency routing
    if (typeof window !== 'undefined' && window.confirm('Call emergency services or find the nearest hospital?')) {
      // Navigate to care finder in emergency mode
      window.location.href = '/care-finder?mode=emergency';
    }
  };

  return (
    <button
      onClick={handleEmergencyClick}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={`
        fixed bottom-24 right-6 z-50
        min-w-[136px] rounded-full
        bg-danger hover:brightness-95 active:brightness-90
        px-5 py-4 text-white shadow-[0_18px_42px_rgba(184,79,69,0.32)]
        flex items-center justify-center gap-2
        transition-all duration-200
        ${isPressed ? 'scale-95' : 'scale-100 hover:-translate-y-0.5'}
        focus:outline-none focus:ring-4 focus:ring-red-300
      `}
      aria-label="Emergency - Find nearest hospital or call help"
      title="Emergency Help"
    >
      <span className="text-sm font-semibold tracking-[0.18em] uppercase">Emergency</span>
    </button>
  );
}
