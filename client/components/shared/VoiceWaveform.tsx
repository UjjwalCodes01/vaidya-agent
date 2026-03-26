'use client';

import { useEffect, useRef } from 'react';

interface VoiceWaveformProps {
  isListening: boolean;
  isThinking?: boolean;
}

/**
 * Voice Waveform Animation
 * Shows animated waveform while listening, pulsing orb while thinking
 */
export function VoiceWaveform({ isListening, isThinking = false }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isListening || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const bars = 40;
    const barWidth = canvas.width / bars;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#3b82f6'; // blue-500

      for (let i = 0; i < bars; i++) {
        const height = Math.random() * canvas.height * 0.8 + canvas.height * 0.1;
        const x = i * barWidth;
        const y = (canvas.height - height) / 2;
        
        ctx.fillRect(x + 1, y, barWidth - 2, height);
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [isListening]);

  if (isThinking) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse shadow-lg" />
      </div>
    );
  }

  if (!isListening) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <span className="text-4xl">🎤</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-32">
      <canvas
        ref={canvasRef}
        width={400}
        height={128}
        className="w-full max-w-md h-32"
      />
    </div>
  );
}
