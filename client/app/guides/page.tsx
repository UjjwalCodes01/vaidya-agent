'use client';

import { AppLayout } from '@/components/layout';
import { StatusCard, Button } from '@/components/shared';
import { useToast } from '@/components/shared/Toast';
import { useState } from 'react';

export default function GuidesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleReadGuide = (title: string) => {
    setSelectedGuide(title);
    showToast(`Opening: ${title}`, 'info');
    // In production: Navigate to full guide page or open modal
  };

  const handleShare = async (title: string) => {
    const shareData = {
      title: `Health Guide: ${title}`,
      text: `Check out this health guide from Vaidya: ${title}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showToast('Guide shared successfully!', 'success');
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        showToast('Link copied to clipboard!', 'success');
      }
    } catch {
      showToast('Share cancelled', 'info');
    }
  };

  const handleTopicClick = (topic: string) => {
    setSearchQuery(topic);
    showToast(`Showing guides for: ${topic}`, 'info');
  };

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
                onClick={() => handleReadGuide('Dengue Fever: Prevention & Care')}
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
            Featured Health Guides
          </h3>
          <div className="space-y-4">
            <GuideCard 
              title="Dengue Fever: Prevention & Care"
              points={[
                "High fever, severe headache, and body pain are key symptoms",
                "Hydrate frequently and monitor platelet count every 12 hours",
                "Seek immediate care if bleeding, severe abdominal pain, or vomiting"
              ]}
              readTime="5 min read"
              onRead={handleReadGuide}
              onShare={handleShare}
              isSelected={selectedGuide === 'Dengue Fever: Prevention & Care'}
            />
            
            <GuideCard 
              title="Managing Seasonal Allergies"
              points={[
                "Spring allergies peak in March-April in North India",
                "Antihistamines and nasal sprays provide quick relief",
                "Avoid outdoor activities during high pollen count hours (6-10 AM)"
              ]}
              readTime="4 min read"
              onRead={handleReadGuide}
              onShare={handleShare}
              isSelected={selectedGuide === 'Managing Seasonal Allergies'}
            />
            
            <GuideCard 
              title="Heat Stroke: Recognize & Respond"
              points={[
                "Body temperature above 104°F, confusion, rapid pulse are warning signs",
                "Move to shade immediately, apply cool water, and call emergency",
                "Prevent by staying hydrated and avoiding midday sun (11 AM - 4 PM)"
              ]}
              readTime="3 min read"
              onRead={handleReadGuide}
              onShare={handleShare}
              isSelected={selectedGuide === 'Heat Stroke: Recognize & Respond'}
            />

            <GuideCard 
              title="Tuberculosis: Early Detection"
              points={[
                "Persistent cough for 2+ weeks, night sweats, and weight loss",
                "Free TB testing and treatment available at government centers",
                "Complete full 6-month treatment course even if feeling better"
              ]}
              readTime="6 min read"
              onRead={handleReadGuide}
              onShare={handleShare}
              isSelected={selectedGuide === 'Tuberculosis: Early Detection'}
            />
          </div>
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

function GuideCard({ title, points, readTime, onRead, onShare, isSelected }: {
  title: string;
  points: string[];
  readTime: string;
  onRead: (title: string) => void;
  onShare: (title: string) => void;
  isSelected?: boolean;
}) {
  return (
    <div className={`
      ui-section rounded-[26px] p-6 transition-all
      ${isSelected ? 'ring-2 ring-[var(--brand)] shadow-md' : 'hover:shadow-md'}
    `}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-[var(--foreground)] mb-1">{title}</h4>
          <span className="text-xs text-[var(--muted)]">{readTime}</span>
        </div>
        {isSelected && (
          <span className="text-xs bg-[var(--brand-soft)] text-[var(--brand)] px-2 py-1 rounded-full">
            Selected
          </span>
        )}
      </div>
      
      <div className="space-y-2 mb-4">
        {points.map((point, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="text-[var(--brand)] mt-0.5">•</span>
            <p className="text-sm text-[var(--muted)]">{point}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button 
          variant="primary" 
          className="flex-1"
          onClick={() => onRead(title)}
        >
          Read Full Guide
        </Button>
        <Button 
          variant="secondary"
          onClick={() => onShare(title)}
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
