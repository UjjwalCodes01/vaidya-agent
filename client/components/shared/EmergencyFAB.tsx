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
    if (typeof window !== 'undefined' && window.confirm('🚨 Call emergency services or find nearest hospital?')) {
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
        w-16 h-16 md:w-20 md:h-20
        bg-red-600 hover:bg-red-700 active:bg-red-800
        text-white rounded-full shadow-2xl
        flex items-center justify-center
        transition-all duration-200
        ${isPressed ? 'scale-95' : 'scale-100 hover:scale-110'}
        focus:outline-none focus:ring-4 focus:ring-red-300
        animate-pulse
      `}
      aria-label="Emergency - Find nearest hospital or call help"
      title="Emergency Help"
    >
      <span className="text-3xl md:text-4xl">🚨</span>
    </button>
  );
}
