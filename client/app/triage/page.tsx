'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { VoiceWaveform, StatusCard } from '@/components/shared';

export default function TriagePage() {
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [agentStatus, setAgentStatus] = useState<'idle' | 'listening' | 'thinking' | 'responding'>('idle');

  const handleMicClick = () => {
    if (isListening) {
      setIsListening(false);
      setIsThinking(true);
      setAgentStatus('thinking');
      
      // Simulate processing
      setTimeout(() => {
        setIsThinking(false);
        setAgentStatus('responding');
      }, 2000);
    } else {
      setIsListening(true);
      setAgentStatus('listening');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Agent Status Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Vaidya is {agentStatus}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {agentStatus === 'idle' && 'Tap the microphone to start'}
                {agentStatus === 'listening' && 'I\'m listening to your symptoms...'}
                {agentStatus === 'thinking' && 'Analyzing your symptoms...'}
                {agentStatus === 'responding' && 'Here\'s what I found...'}
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${
              agentStatus === 'listening' ? 'bg-red-500 animate-pulse' :
              agentStatus === 'thinking' ? 'bg-yellow-500 animate-pulse' :
              agentStatus === 'responding' ? 'bg-green-500' :
              'bg-gray-300'
            }`} />
          </div>
        </div>

        {/* Voice Interaction Area */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm">
          <VoiceWaveform 
            isListening={isListening} 
            isThinking={isThinking}
          />

          {/* Microphone Button */}
          <div className="flex justify-center mt-8">
            <button
              onClick={handleMicClick}
              className={`
                w-20 h-20 rounded-full shadow-lg
                flex items-center justify-center
                transition-all duration-200
                focus:outline-none focus:ring-4
                ${isListening 
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-300 scale-110' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300 hover:scale-110'
                }
              `}
              aria-label={isListening ? 'Stop recording' : 'Start recording'}
            >
              <span className="text-4xl">{isListening ? '⏸️' : '🎤'}</span>
            </button>
          </div>

          {/* Text Input Fallback */}
          <div className="mt-6">
            <input
              type="text"
              placeholder="Or type your symptoms here..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Live Transcript */}
        {transcript && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Transcript
            </h3>
            <p className="text-gray-900 dark:text-white">{transcript}</p>
          </div>
        )}

        {/* AI Interpretation (Mock) */}
        <StatusCard
          title="Symptom Analysis"
          icon="🔍"
          status="info"
        >
          <div className="space-y-2">
            <div>
              <span className="text-sm font-medium">Detected Symptoms:</span>
              <p className="text-sm text-gray-600 dark:text-gray-400">None yet - start talking to Vaidya</p>
            </div>
            <div>
              <span className="text-sm font-medium">Urgency Level:</span>
              <p className="text-sm text-gray-600 dark:text-gray-400">To be determined</p>
            </div>
          </div>
        </StatusCard>

        {/* Suggested Actions */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Next Steps
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ActionButton href="/care-finder" icon="🏥" label="Find Nearby Hospital" />
            <ActionButton href="/records" icon="💾" label="Save to Records" />
          </div>
        </div>

        {/* Conversation History Drawer Link */}
        <button className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:underline">
          View conversation history →
        </button>
      </div>
    </AppLayout>
  );
}

function ActionButton({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
    </a>
  );
}
