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
      ctx.fillStyle = '#235347';

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
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft shadow-lg">
          <div className="h-12 w-12 rounded-full bg-brand animate-pulse" />
        </div>
      </div>
    );
  }

  if (!isListening) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border border-border bg-surface-strong">
          <div className="h-4 w-4 rounded-full bg-muted" />
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
