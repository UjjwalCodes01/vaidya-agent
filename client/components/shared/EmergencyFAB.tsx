'use client';

import { useState } from 'react';

// Indian emergency numbers
const EMERGENCY_NUMBERS = {
  UNIFIED: '112',      // All emergencies
  AMBULANCE: '108',    // National ambulance
  WOMEN: '181',        // Women helpline
  CHILD: '1098',       // Child helpline
};

/**
 * Emergency Floating Action Button
 * Always visible, high-priority emergency access
 */
export function EmergencyFAB() {
  const [isPressed, setIsPressed] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleEmergencyClick = () => {
    setShowOptions(true);
  };

  const handleCall = (number: string) => {
    // Use tel: protocol for direct calling
    window.location.href = `tel:${number}`;
    setShowOptions(false);
  };

  const handleFindHospital = () => {
    // Navigate to care finder in emergency mode
    window.location.href = '/care-finder?mode=emergency';
    setShowOptions(false);
  };

  const handleClose = () => {
    setShowOptions(false);
  };

  return (
    <>
      {/* Emergency Options Modal */}
      {showOptions && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-danger">Emergency Help</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Choose how you need help
              </p>
            </div>

            <div className="space-y-3">
              {/* Call 112 - Unified Emergency */}
              <button
                onClick={() => handleCall(EMERGENCY_NUMBERS.UNIFIED)}
                className="flex w-full items-center gap-4 rounded-2xl bg-danger p-4 text-white transition hover:brightness-95"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl">
                  📞
                </span>
                <div className="text-left">
                  <p className="font-semibold">Call 112</p>
                  <p className="text-sm opacity-90">Unified Emergency Number</p>
                </div>
              </button>

              {/* Call 108 - Ambulance */}
              <button
                onClick={() => handleCall(EMERGENCY_NUMBERS.AMBULANCE)}
                className="flex w-full items-center gap-4 rounded-2xl bg-orange-500 p-4 text-white transition hover:brightness-95"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl">
                  🚑
                </span>
                <div className="text-left">
                  <p className="font-semibold">Call 108</p>
                  <p className="text-sm opacity-90">National Ambulance Service</p>
                </div>
              </button>

              {/* Find Nearest Hospital */}
              <button
                onClick={handleFindHospital}
                className="flex w-full items-center gap-4 rounded-2xl bg-brand p-4 text-white transition hover:brightness-95"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl">
                  🏥
                </span>
                <div className="text-left">
                  <p className="font-semibold">Find Nearest Hospital</p>
                  <p className="text-sm opacity-90">Get directions to emergency care</p>
                </div>
              </button>

              {/* Cancel */}
              <button
                onClick={handleClose}
                className="w-full rounded-2xl border border-gray-200 p-4 text-center font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main FAB Button */}
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
    </>
  );
}
