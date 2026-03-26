'use client';

import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout';
import { VoiceWaveform, StatusCard, Button } from '@/components/shared';
import { useToast } from '@/components/shared/Toast';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function TriagePage() {
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [agentStatus, setAgentStatus] = useState<'idle' | 'listening' | 'thinking' | 'responding'>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const { showToast } = useToast();

  const handleMicClick = useCallback(() => {
    if (isListening) {
      setIsListening(false);
      setIsThinking(true);
      setAgentStatus('thinking');
      showToast('Processing your symptoms...', 'info');
      
      // Simulate processing and response
      setTimeout(() => {
        setIsThinking(false);
        setAgentStatus('responding');
        
        // Add mock conversation
        const userMessage: Message = {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: transcript || 'I have a headache and mild fever since yesterday.',
          timestamp: new Date(),
        };
        
        const assistantMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: 'Based on your symptoms of headache and mild fever, this could be a viral infection. I recommend rest, fluids, and monitoring your temperature. If fever exceeds 102°F or symptoms persist beyond 3 days, please visit a doctor.',
          timestamp: new Date(),
        };
        
        setMessages((prev) => [...prev, userMessage, assistantMessage]);
        showToast('Analysis complete', 'success');
      }, 2000);
    } else {
      setIsListening(true);
      setAgentStatus('listening');
      showToast('Listening... Speak your symptoms', 'info');
      
      // In production: Initialize Web Speech API
      // navigator.mediaDevices.getUserMedia({ audio: true })
    }
  }, [isListening, transcript, showToast]);

  const handleTextSubmit = useCallback(() => {
    if (!transcript.trim()) return;
    
    setAgentStatus('thinking');
    showToast('Analyzing your symptoms...', 'info');
    
    setTimeout(() => {
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: transcript,
        timestamp: new Date(),
      };
      
      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `I understand you&apos;re experiencing: "${transcript}". Based on this, I recommend consulting with a healthcare professional for proper diagnosis. Would you like me to find nearby facilities?`,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setTranscript('');
      setAgentStatus('responding');
      showToast('Analysis complete', 'success');
    }, 1500);
  }, [transcript, showToast]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Agent Status Header */}
        <div className="ui-shell rounded-[28px] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow mb-2">Live agent state</p>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Vaidya is {agentStatus}
              </h2>
              <p className="text-sm text-[var(--muted)]">
                {agentStatus === 'idle' && 'Tap the microphone to start'}
                {agentStatus === 'listening' && "I'm listening to your symptoms..."}
                {agentStatus === 'thinking' && 'Analyzing your symptoms...'}
                {agentStatus === 'responding' && "Here's what I found..."}
              </p>
            </div>
            <div className={`h-3 w-3 rounded-full ${
              agentStatus === 'listening' ? 'bg-[var(--danger)] animate-pulse' :
              agentStatus === 'thinking' ? 'bg-[var(--accent)] animate-pulse' :
              agentStatus === 'responding' ? 'bg-[var(--brand)]' :
              'bg-[var(--muted)]/30'
            }`} />
          </div>
        </div>

        {/* Voice Interaction Area */}
        <div className="ui-shell rounded-[32px] p-8">
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
                flex items-center justify-center text-white
                transition-all duration-200
                focus:outline-none focus:ring-4
                ${isListening 
                  ? 'bg-[var(--danger)] hover:brightness-95 focus:ring-[var(--danger)]/30 scale-110' 
                  : 'bg-[var(--brand)] hover:brightness-95 focus:ring-[var(--brand)]/30 hover:scale-110'
                }
              `}
              aria-label={isListening ? 'Stop recording' : 'Start recording'}
            >
              <span className="text-sm font-semibold tracking-[0.18em] uppercase">
                {isListening ? 'Stop' : 'Speak'}
              </span>
            </button>
          </div>

          {/* Text Input Fallback */}
          <div className="mt-6 flex gap-2">
            <input
              type="text"
              placeholder="Or type your symptoms here..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
              className="flex-1 rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
            <Button onClick={handleTextSubmit} disabled={!transcript.trim()}>
              Send
            </Button>
          </div>
        </div>

        {/* Latest Response */}
        {messages.length > 0 && (
          <div className="ui-section rounded-[24px] p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">
              Latest Response
            </h3>
            <div className="space-y-3">
              {messages.slice(-2).map((msg) => (
                <div 
                  key={msg.id}
                  className={`p-3 rounded-xl ${
                    msg.role === 'user' 
                      ? 'bg-[var(--brand-soft)] ml-8' 
                      : 'bg-[var(--surface-strong)] mr-8'
                  }`}
                >
                  <p className="text-xs font-medium text-[var(--muted)] mb-1">
                    {msg.role === 'user' ? 'You' : 'Vaidya'}
                  </p>
                  <p className="text-sm text-[var(--foreground)]">{msg.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Interpretation (Mock) */}
        <StatusCard
          title="Symptom Analysis"
          icon="🩺"
          status={messages.length > 0 ? 'success' : 'info'}
        >
          <div className="space-y-2">
            <div>
              <span className="text-sm font-medium text-[var(--foreground)]">Detected Symptoms:</span>
              <p className="text-sm text-[var(--muted)]">
                {messages.length > 0 ? 'Headache, mild fever' : 'None yet - start talking to Vaidya'}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-[var(--foreground)]">Urgency Level:</span>
              <p className={`text-sm ${messages.length > 0 ? 'text-[var(--accent)] font-medium' : 'text-[var(--muted)]'}`}>
                {messages.length > 0 ? 'Low - Self-care recommended' : 'To be determined'}
              </p>
            </div>
          </div>
        </StatusCard>

        {/* Suggested Actions */}
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Next Steps
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ActionButton href="/care-finder" icon="🏥" label="Find Nearby Hospital" />
            <ActionButton href="/records" icon="💾" label="Save to Records" />
          </div>
        </div>

        {/* Conversation History Toggle */}
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="w-full text-center text-sm text-[var(--brand)] hover:underline"
        >
          {showHistory ? 'Hide conversation history ↑' : 'View conversation history →'}
        </button>

        {/* Conversation History Drawer */}
        {showHistory && (
          <div className="ui-section rounded-[24px] p-4 space-y-3 max-h-64 overflow-y-auto">
            <h3 className="text-sm font-semibold text-[var(--foreground)] sticky top-0 bg-[var(--surface)] pb-2">
              Conversation History ({messages.length} messages)
            </h3>
            {messages.length === 0 ? (
              <p className="text-sm text-[var(--muted)] text-center py-4">
                No conversation yet. Start by speaking or typing your symptoms.
              </p>
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`p-3 rounded-xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-[var(--brand-soft)] ml-4' 
                        : 'bg-[var(--surface-strong)] mr-4'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-[var(--muted)]">
                        {msg.role === 'user' ? 'You' : 'Vaidya'}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[var(--foreground)]">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function ActionButton({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="ui-section flex items-center gap-3 rounded-[24px] p-4 hover:-translate-y-0.5 transition-transform focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-lg">
        {icon}
      </span>
      <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
    </Link>
  );
}
