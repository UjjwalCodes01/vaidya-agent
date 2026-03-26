'use client';

import { AppLayout } from '@/components/layout';
import { StatusCard } from '@/components/shared';
import { useState } from 'react';

export default function GuidesPage() {
  const [searchQuery, setSearchQuery] = useState('');

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
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
          />
        </div>

        {/* Local Alert Banner */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-start gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="text-xl font-bold mb-2">This Week in Noida</h3>
              <p className="mb-3">
                Dengue cases rising sharply - 45 new cases reported this week. Mosquito breeding control measures in effect.
              </p>
              <ul className="text-sm space-y-1 mb-3">
                <li>• Use mosquito repellent</li>
                <li>• Remove standing water</li>
                <li>• Seek immediate care for high fever</li>
              </ul>
              <button className="bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-orange-50 transition-colors">
                Read Dengue Guide →
              </button>
            </div>
          </div>
        </div>

        {/* Topics Grid */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Browse by Topic
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <TopicCard icon="🤒" label="Fever" />
            <TopicCard icon="😷" label="Cough & Cold" />
            <TopicCard icon="👩" label="Women's Health" />
            <TopicCard icon="👶" label="Child Care" />
            <TopicCard icon="💪" label="Injuries" />
            <TopicCard icon="💊" label="Medications" />
            <TopicCard icon="🩺" label="Chronic Conditions" />
            <TopicCard icon="🧠" label="Mental Health" />
            <TopicCard icon="🦷" label="Dental Care" />
            <TopicCard icon="👁️" label="Eye Care" />
            <TopicCard icon="🍽️" label="Nutrition" />
            <TopicCard icon="💉" label="Vaccinations" />
          </div>
        </div>

        {/* Featured Guides */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Featured Health Guides
          </h3>
          <div className="space-y-4">
            <GuideCard 
              title="Dengue Fever: Prevention & Care"
              icon="🦟"
              points={[
                "High fever, severe headache, and body pain are key symptoms",
                "Hydrate frequently and monitor platelet count every 12 hours",
                "Seek immediate care if bleeding, severe abdominal pain, or vomiting"
              ]}
              readTime="5 min read"
            />
            
            <GuideCard 
              title="Managing Seasonal Allergies"
              icon="🤧"
              points={[
                "Spring allergies peak in March-April in North India",
                "Antihistamines and nasal sprays provide quick relief",
                "Avoid outdoor activities during high pollen count hours (6-10 AM)"
              ]}
              readTime="4 min read"
            />
            
            <GuideCard 
              title="Heat Stroke: Recognize & Respond"
              icon="☀️"
              points={[
                "Body temperature above 104°F, confusion, rapid pulse are warning signs",
                "Move to shade immediately, apply cool water, and call emergency",
                "Prevent by staying hydrated and avoiding midday sun (11 AM - 4 PM)"
              ]}
              readTime="3 min read"
            />

            <GuideCard 
              title="Tuberculosis: Early Detection"
              icon="🫁"
              points={[
                "Persistent cough for 2+ weeks, night sweats, and weight loss",
                "Free TB testing and treatment available at government centers",
                "Complete full 6-month treatment course even if feeling better"
              ]}
              readTime="6 min read"
            />
          </div>
        </div>

        {/* Preventive Health Tips */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-4 flex items-center gap-2">
            <span>💚</span>
            Preventive Health Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TipCard 
              title="Stay Hydrated"
              description="Drink 8-10 glasses of water daily, especially in summer"
            />
            <TipCard 
              title="Regular Exercise"
              description="30 minutes of moderate activity 5 days a week"
            />
            <TipCard 
              title="Balanced Diet"
              description="Include fruits, vegetables, and whole grains daily"
            />
            <TipCard 
              title="Annual Checkup"
              description="Get routine health screening every 12 months"
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
              <span>🌡️</span>
              <span><strong>Summer approaching:</strong> Heat stroke risk increases April-June</span>
            </li>
            <li className="flex items-start gap-2">
              <span>🦟</span>
              <span><strong>Monsoon preparation:</strong> Dengue & malaria peak July-September</span>
            </li>
            <li className="flex items-start gap-2">
              <span>🌾</span>
              <span><strong>Pollution alert:</strong> Air quality drops October-November (stubble burning)</span>
            </li>
          </ul>
        </StatusCard>
      </div>
    </AppLayout>
  );
}

function TopicCard({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="flex flex-col items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-750 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500">
      <span className="text-4xl">{icon}</span>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
        {label}
      </span>
    </button>
  );
}

function GuideCard({ title, icon, points, readTime }: {
  title: string;
  icon: string;
  points: string[];
  readTime: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{icon}</span>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h4>
            <span className="text-xs text-gray-500 dark:text-gray-400">{readTime}</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        {points.map((point, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <p className="text-sm text-gray-700 dark:text-gray-300">{point}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
          Read Full Guide →
        </button>
        <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
          📤
        </button>
      </div>
    </div>
  );
}

function TipCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
      <h4 className="font-medium text-gray-900 dark:text-white mb-1">{title}</h4>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}
