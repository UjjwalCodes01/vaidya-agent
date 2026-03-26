'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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

interface TriageResult {
  severity: string;
  suspectedConditions: string[];
  recommendedAction: string;
  reasoning: string;
}

export default function TriagePage() {
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [agentStatus, setAgentStatus] = useState<'idle' | 'listening' | 'thinking' | 'responding'>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const { showToast } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const callTriageAPI = useCallback(async (symptoms: string) => {
    try {
      const payload = {
        symptoms,
        sessionId: sessionId || undefined,
      };
      
      console.log('Sending triage request:', payload);
      
      const response = await fetch('/api/agent/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Triage API error response:', errorData);
        const errorMessage = errorData.error?.message || 'Failed to analyze symptoms';
        const errorDetails = errorData.error?.details ? `\n${JSON.stringify(errorData.error.details, null, 2)}` : '';
        throw new Error(errorMessage + errorDetails);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Triage API error:', error);
      throw error;
    }
  }, [sessionId]);

  const processSymptoms = useCallback(async (symptoms: string) => {
    setIsThinking(true);
    setAgentStatus('thinking');
    showToast('Analyzing your symptoms with Gemini AI...', 'info');
    
    try {
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: symptoms,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, userMessage]);

      const result = await callTriageAPI(symptoms);
      
      if (!sessionId && result.data?.sessionId) {
        setSessionId(result.data.sessionId);
      }

      const triage = result.data?.triage;
      setTriageResult(triage);

      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `Based on your symptoms, I've assessed the severity as **${triage.severity}**.\n\n**Suspected conditions:** ${triage.suspectedConditions.join(', ')}\n\n**Recommended action:** ${triage.recommendedAction}\n\n**Reasoning:** ${triage.reasoning}`,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      setAgentStatus('responding');
      showToast('Analysis complete', 'success');
    } catch (error) {
      console.error('Error processing symptoms:', error);
      showToast('Failed to analyze symptoms. Please try again.', 'error');
      setAgentStatus('idle');
    } finally {
      setIsThinking(false);
    }
  }, [sessionId, showToast, callTriageAPI]);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Indian English, can be changed to 'hi-IN' for Hindi

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript((prev) => prev + ' ' + finalTranscript);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        // Handle different error types with appropriate messages
        switch (event.error) {
          case 'network':
            showToast('Speech recognition offline. Google speech service unreachable. Text input works perfectly! ✍️', 'warning');
            break;
          case 'not-allowed':
          case 'permission-denied':
            showToast('Microphone permission needed. Enable in browser or use text input below.', 'error');
            break;
          case 'no-speech':
            showToast('No speech detected. Try speaking louder or use text input.', 'warning');
            break;
          case 'audio-capture':
            showToast('Microphone not found. Use text input instead.', 'error');
            break;
          case 'aborted':
            // User stopped - don't show error
            break;
          default:
            showToast(`Speech unavailable (${event.error}). Text input works great!`, 'warning');
        }
        
        setIsListening(false);
        setAgentStatus('idle');
      };

      recognition.onend = () => {
        if (isListening) {
          recognition.start(); // Restart if still supposed to be listening
        }
      };

      recognitionRef.current = recognition;
    }
  }, [isListening, showToast]);

  const handleMicClick = useCallback(() => {
    if (isListening) {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      
      // Process the transcript
      if (transcript.trim()) {
        processSymptoms(transcript.trim());
      } else {
        setAgentStatus('idle');
        showToast('No speech detected', 'warning');
      }
    } else {
      // Start listening
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
          setAgentStatus('listening');
          setTranscript('');
          showToast('Listening... Speak your symptoms', 'info');
        } catch (error) {
          console.error('Failed to start speech recognition:', error);
          showToast('Speech recognition not available. Please type your symptoms.', 'error');
        }
      } else {
        showToast('Speech recognition not supported. Please type your symptoms.', 'error');
      }
    }
  }, [isListening, transcript, showToast, processSymptoms]);

  const handleTextSubmit = useCallback(() => {
    if (!transcript.trim()) return;
    processSymptoms(transcript.trim());
    setTranscript('');
  }, [transcript, processSymptoms]);

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
                {agentStatus === 'thinking' && 'Analyzing your symptoms with Gemini AI...'}
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

          {/* Real-time Transcript Display */}
          {transcript && (
            <div className="mt-4 p-3 bg-[var(--brand-soft)] rounded-xl">
              <p className="text-xs font-medium text-[var(--brand)] mb-1">Transcript:</p>
              <p className="text-sm text-[var(--foreground)]">{transcript}</p>
            </div>
          )}

          {/* Microphone Button */}
          <div className="flex flex-col items-center mt-8 gap-3">
            <button
              onClick={handleMicClick}
              disabled={isThinking}
              className={`
                w-20 h-20 rounded-full shadow-lg
                flex items-center justify-center text-white
                transition-all duration-200
                focus:outline-none focus:ring-4
                disabled:opacity-50 disabled:cursor-not-allowed
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
            <p className="text-xs text-[var(--muted)] text-center max-w-sm">
              Speech requires Google servers. If offline, text input works great! 📝
            </p>
          </div>

          {/* Text Input Fallback */}
          <div className="mt-6 flex gap-2">
            <input
              type="text"
              placeholder="Type your symptoms here (works offline)..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
              disabled={isThinking}
              className="flex-1 rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] disabled:opacity-50"
            />
            <Button onClick={handleTextSubmit} disabled={!transcript.trim() || isThinking}>
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
                  <p className="text-sm text-[var(--foreground)] whitespace-pre-line">{msg.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Interpretation (Real Gemini Results) */}
        {triageResult && (
          <StatusCard
            title="Symptom Analysis"
            icon="🩺"
            status={
              triageResult.severity === 'critical' ? 'error' :
              triageResult.severity === 'high' ? 'warning' :
              triageResult.severity === 'moderate' ? 'warning' :
              'success'
            }
          >
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-[var(--foreground)]">Severity:</span>
                <p className={`text-sm font-semibold ${
                  triageResult.severity === 'critical' ? 'text-[var(--danger)]' :
                  triageResult.severity === 'high' ? 'text-[var(--accent)]' :
                  triageResult.severity === 'moderate' ? 'text-[var(--accent)]' :
                  'text-[var(--brand)]'
                }`}>
                  {triageResult.severity.toUpperCase()}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-[var(--foreground)]">Suspected Conditions:</span>
                <p className="text-sm text-[var(--muted)]">
                  {triageResult.suspectedConditions.join(', ')}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-[var(--foreground)]">Recommended Action:</span>
                <p className="text-sm text-[var(--muted)]">
                  {triageResult.recommendedAction}
                </p>
              </div>
            </div>
          </StatusCard>
        )}

        {!triageResult && (
          <StatusCard
            title="Symptom Analysis"
            icon="🩺"
            status="info"
          >
            <div className="space-y-2">
              <p className="text-sm text-[var(--muted)]">
                Start talking to Vaidya to analyze your symptoms using Gemini AI
              </p>
            </div>
          </StatusCard>
        )}

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
                    <p className="text-[var(--foreground)] whitespace-pre-line">{msg.content}</p>
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
