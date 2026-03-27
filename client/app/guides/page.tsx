'use client';

import { AppLayout } from '@/components/layout';
import { StatusCard, Button } from '@/components/shared';
import { useToast } from '@/components/shared/Toast';
import { useRAG, type Guideline } from '@/lib/hooks/useRAG';
import { useState, useEffect, useCallback } from 'react';

export default function GuidesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuide, setSelectedGuide] = useState<Guideline | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { showToast } = useToast();
  const { loading, error, guidelines, searchResults, fetchAllGuidelines, searchGuidelines, clearError } = useRAG();

  // Fetch all guidelines on mount
  useEffect(() => {
    fetchAllGuidelines();
  }, [fetchAllGuidelines]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      searchGuidelines(debouncedQuery, { topK: 10 });
    }
  }, [debouncedQuery, searchGuidelines]);

  // Show errors
  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      clearError();
    }
  }, [error, showToast, clearError]);

  const handleReadGuide = useCallback((guideline: Guideline) => {
    setSelectedGuide(guideline);
    showToast(`Opening: ${guideline.condition}`, 'info');
  }, [showToast]);

  const handleShare = async (guideline: Guideline) => {
    const shareData = {
      title: `Health Guide: ${guideline.condition}`,
      text: `Check out this health guide from Vaidya: ${guideline.condition}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showToast('Guide shared successfully!', 'success');
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        showToast('Link copied to clipboard!', 'success');
      }
    } catch {
      showToast('Share cancelled', 'info');
    }
  };

  const handleTopicClick = (topic: string) => {
    setSearchQuery(topic);
    showToast(`Searching for: ${topic}`, 'info');
  };

  // Display either search results or all guidelines
  const displayGuidelines = debouncedQuery.trim()
    ? searchResults.map(r => r.guideline)
    : guidelines;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <div>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symptoms, conditions, or topics..."
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] text-base"
          />
        </div>

        {/* Local Alert Banner */}
        <div className="rounded-[30px] border border-[var(--accent)]/20 bg-gradient-to-br from-[var(--accent)]/90 to-[var(--accent)] text-white p-6 shadow-lg">
          <div className="flex items-start gap-3">
            <div>
              <h3 className="text-xl font-bold mb-2">This Week in Noida</h3>
              <p className="mb-3 opacity-95">
                Dengue cases rising sharply - 45 new cases reported this week. Mosquito breeding control measures in effect.
              </p>
              <ul className="text-sm space-y-1 mb-3 opacity-90">
                <li>• Use mosquito repellent</li>
                <li>• Remove standing water</li>
                <li>• Seek immediate care for high fever</li>
              </ul>
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchQuery('Dengue');
                  showToast('Searching for Dengue guides...', 'info');
                }}
                className="!bg-white !text-[var(--accent)] hover:!bg-white/90"
              >
                Read Dengue Guide →
              </Button>
            </div>
          </div>
        </div>

        {/* Topics Grid */}
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Browse by Topic
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <TopicCard label="Fever" icon="🤒" onClick={handleTopicClick} />
            <TopicCard label="Cough & Cold" icon="🤧" onClick={handleTopicClick} />
            <TopicCard label="Women&apos;s Health" icon="👩" onClick={handleTopicClick} />
            <TopicCard label="Child Care" icon="👶" onClick={handleTopicClick} />
            <TopicCard label="Injuries" icon="🩹" onClick={handleTopicClick} />
            <TopicCard label="Medications" icon="💊" onClick={handleTopicClick} />
            <TopicCard label="Chronic Conditions" icon="❤️" onClick={handleTopicClick} />
            <TopicCard label="Mental Health" icon="🧠" onClick={handleTopicClick} />
            <TopicCard label="Dental Care" icon="🦷" onClick={handleTopicClick} />
            <TopicCard label="Eye Care" icon="👁️" onClick={handleTopicClick} />
            <TopicCard label="Nutrition" icon="🥗" onClick={handleTopicClick} />
            <TopicCard label="Vaccinations" icon="💉" onClick={handleTopicClick} />
          </div>
        </div>

        {/* Featured Guides */}
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            {debouncedQuery.trim() ? `Search Results (${displayGuidelines.length})` : 'Health Guidelines'}
          </h3>

          {loading && displayGuidelines.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted)]">
              <div className="animate-pulse">Loading guidelines...</div>
            </div>
          ) : displayGuidelines.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted)]">
              <p>No guidelines found{debouncedQuery.trim() ? ` for "${debouncedQuery}"` : ''}.</p>
              <p className="text-sm mt-2">Try a different search term.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayGuidelines.slice(0, 8).map((guideline) => (
                <GuideCard
                  key={guideline.id}
                  guideline={guideline}
                  onRead={handleReadGuide}
                  onShare={handleShare}
                  isSelected={selectedGuide?.id === guideline.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Preventive Health Tips */}
        <div className="bg-[var(--brand-soft)] border border-[var(--brand)]/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Preventive Health Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TipCard
              title="Stay Hydrated"
              description="Drink 8-10 glasses of water daily, especially in summer"
              icon="💧"
            />
            <TipCard
              title="Regular Exercise"
              description="30 minutes of moderate activity 5 days a week"
              icon="🏃"
            />
            <TipCard
              title="Balanced Diet"
              description="Include fruits, vegetables, and whole grains daily"
              icon="🥗"
            />
            <TipCard
              title="Annual Checkup"
              description="Get routine health screening every 12 months"
              icon="🩺"
            />
          </div>
        </div>

        {/* Seasonal Alerts */}
        <StatusCard
          title="Seasonal Health Alerts"
          icon="📅"
          status="info"
        >
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent)]">☀️</span>
              <span className="text-[var(--foreground)]"><strong>Summer approaching:</strong> Heat stroke risk increases April-June</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--brand)]">🌧️</span>
              <span className="text-[var(--foreground)]"><strong>Monsoon preparation:</strong> Dengue & malaria peak July-September</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--muted)]">🌫️</span>
              <span className="text-[var(--foreground)]"><strong>Pollution alert:</strong> Air quality drops October-November (stubble burning)</span>
            </li>
          </ul>
        </StatusCard>

        {/* Selected Guideline Detail Modal */}
        {selectedGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-[var(--border)] p-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-[var(--foreground)]">{selectedGuide.condition}</h2>
                <button
                  onClick={() => setSelectedGuide(null)}
                  className="p-2 hover:bg-[var(--surface-strong)] rounded-full transition-colors"
                >
                  <span className="text-xl">✕</span>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Severity & Category */}
                <div className="flex gap-2">
                  <span className={`text-sm px-3 py-1 rounded-full ${
                    selectedGuide.severity === 'emergency' ? 'bg-red-100 text-red-700' :
                    selectedGuide.severity === 'severe' ? 'bg-orange-100 text-orange-700' :
                    selectedGuide.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {selectedGuide.severity.toUpperCase()}
                  </span>
                  <span className="text-sm px-3 py-1 rounded-full bg-[var(--surface-strong)] text-[var(--muted)]">
                    {selectedGuide.category}
                  </span>
                </div>

                {/* Symptoms */}
                {selectedGuide.symptoms?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">Symptoms</h3>
                    <ul className="space-y-1">
                      {selectedGuide.symptoms.map((symptom, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-[var(--muted)]">
                          <span className="text-[var(--danger)]">•</span>
                          {symptom}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Causes */}
                {selectedGuide.causes?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">Causes</h3>
                    <ul className="space-y-1">
                      {selectedGuide.causes.map((cause, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-[var(--muted)]">
                          <span className="text-[var(--accent)]">•</span>
                          {cause}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Prevention */}
                {selectedGuide.prevention?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">Prevention</h3>
                    <ul className="space-y-1">
                      {selectedGuide.prevention.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-[var(--muted)]">
                          <span className="text-[var(--brand)]">✓</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Home Remedies */}
                {selectedGuide.homeRemedies?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">Home Remedies</h3>
                    <ul className="space-y-1">
                      {selectedGuide.homeRemedies.map((remedy, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-[var(--muted)]">
                          <span className="text-[var(--brand)]">🏠</span>
                          {remedy}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* When to Seek Help */}
                {selectedGuide.whenToSeekHelp?.length > 0 && (
                  <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-xl p-4">
                    <h3 className="font-semibold text-[var(--danger)] mb-2">When to Seek Medical Help</h3>
                    <ul className="space-y-1">
                      {selectedGuide.whenToSeekHelp.map((warning, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-[var(--foreground)]">
                          <span className="text-[var(--danger)]">⚠️</span>
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Regional Info */}
                {selectedGuide.regionalInfo && (
                  <div className="bg-[var(--brand-soft)] rounded-xl p-4">
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">Regional Information</h3>
                    <p className="text-sm text-[var(--muted)]">{selectedGuide.regionalInfo.prevalence}</p>
                    {selectedGuide.regionalInfo.seasonality && (
                      <p className="text-sm text-[var(--muted)] mt-1">
                        📅 {selectedGuide.regionalInfo.seasonality}
                      </p>
                    )}
                  </div>
                )}

                <Button variant="primary" fullWidth onClick={() => setSelectedGuide(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function TopicCard({ label, icon, onClick }: { label: string; icon: string; onClick: (label: string) => void }) {
  return (
    <button 
      onClick={() => onClick(label)}
      className="ui-section rounded-[22px] p-4 text-left hover:-translate-y-0.5 transition-transform focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
    >
      <span className="text-2xl mb-2 block">{icon}</span>
      <span className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
    </button>
  );
}

function GuideCard({ guideline, onRead, onShare, isSelected }: {
  guideline: Guideline;
  onRead: (guideline: Guideline) => void;
  onShare: (guideline: Guideline) => void;
  isSelected?: boolean;
}) {
  // Get severity color
  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      'mild': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'moderate': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      'severe': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      'emergency': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return colors[severity] || 'bg-gray-100 text-gray-700';
  };

  // Get display points from guideline data
  const displayPoints = [
    ...(guideline.symptoms?.slice(0, 2) || []),
    ...(guideline.whenToSeekHelp?.slice(0, 1) || []),
  ].slice(0, 3);

  return (
    <div className={`
      ui-section rounded-[26px] p-6 transition-all
      ${isSelected ? 'ring-2 ring-[var(--brand)] shadow-md' : 'hover:shadow-md'}
    `}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-[var(--foreground)] mb-1">{guideline.condition}</h4>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(guideline.severity)}`}>
              {guideline.severity}
            </span>
            <span className="text-xs text-[var(--muted)]">{guideline.category}</span>
          </div>
        </div>
        {isSelected && (
          <span className="text-xs bg-[var(--brand-soft)] text-[var(--brand)] px-2 py-1 rounded-full">
            Selected
          </span>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {displayPoints.map((point, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="text-[var(--brand)] mt-0.5">•</span>
            <p className="text-sm text-[var(--muted)]">{point}</p>
          </div>
        ))}
      </div>

      {guideline.regionalInfo?.prevalence && (
        <p className="text-xs text-[var(--accent)] mb-3">
          📍 {guideline.regionalInfo.prevalence}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          variant="primary"
          className="flex-1"
          onClick={() => onRead(guideline)}
        >
          Read Full Guide
        </Button>
        <Button
          variant="secondary"
          onClick={() => onShare(guideline)}
          icon={<span>📤</span>}
        >
          Share
        </Button>
      </div>
    </div>
  );
}

function TipCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="bg-[var(--surface-strong)] rounded-xl p-4 border border-[var(--brand)]/10">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h4 className="font-medium text-[var(--foreground)] mb-1">{title}</h4>
          <p className="text-sm text-[var(--muted)]">{description}</p>
        </div>
      </div>
    </div>
  );
}
