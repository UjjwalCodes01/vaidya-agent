'use client';

import { AppLayout } from '@/components/layout';
import { useState } from 'react';

export default function ProfilePage() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* User Identity Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-4xl">
              👤
            </div>
            <div>
              <h2 className="text-2xl font-bold">Guest User</h2>
              <p className="text-blue-100">guest@vaidya.health</p>
            </div>
          </div>
          <button className="bg-white text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
            Edit Profile
          </button>
        </div>

        {/* ABHA Account Management */}
        <Section title="ABHA Health ID" icon="🔗">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                  ABHA not linked
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Link your ABHA to access complete health records across all healthcare facilities
                </p>
              </div>
            </div>
          </div>
          <button className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500">
            Link ABHA Account →
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            You will be redirected to ABDM portal for secure authentication
          </p>
        </Section>

        {/* Language & Region */}
        <Section title="Language & Region" icon="🌐">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Primary Language
              </label>
              <select className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="bn">বাংলা (Bengali)</option>
                <option value="mr">मराठी (Marathi)</option>
                <option value="gu">ગુજરાતી (Gujarati)</option>
                <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Region
              </label>
              <select className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Delhi NCR</option>
                <option>Mumbai</option>
                <option>Bangalore</option>
                <option>Hyderabad</option>
                <option>Chennai</option>
                <option>Kolkata</option>
                <option>Pune</option>
                <option>Other</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon="🔔">
          <div className="space-y-3">
            <Toggle 
              label="Health alerts & local outbreaks" 
              description="Get notified about disease outbreaks in your region"
              defaultChecked={true}
            />
            <Toggle 
              label="Appointment reminders" 
              description="Reminders 1 day before scheduled appointments"
              defaultChecked={true}
            />
            <Toggle 
              label="Medication reminders" 
              description="Alerts for prescription refills and doses"
              defaultChecked={false}
            />
            <Toggle 
              label="Triage follow-ups" 
              description="Check-in messages after triage sessions"
              defaultChecked={true}
            />
          </div>
        </Section>

        {/* Privacy & Consent */}
        <Section title="Privacy & Consent" icon="🔐">
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-650 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
              <span className="font-medium text-gray-700 dark:text-gray-300">Manage consent settings</span>
              <span>→</span>
            </button>
            
            <button className="w-full flex items-center justify-between bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-650 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
              <span className="font-medium text-gray-700 dark:text-gray-300">View data access history</span>
              <span>→</span>
            </button>
            
            <button className="w-full flex items-center justify-between bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-650 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
              <span className="font-medium text-gray-700 dark:text-gray-300">Download my data</span>
              <span>📥</span>
            </button>
          </div>
        </Section>

        {/* Accessibility */}
        <Section title="Accessibility" icon="♿">
          <div className="space-y-3">
            <Toggle 
              label="Large text" 
              description="Increase font size for better readability"
              defaultChecked={false}
            />
            <Toggle 
              label="High contrast mode" 
              description="Enhance visual contrast for visibility"
              defaultChecked={false}
            />
            <Toggle 
              label="Screen reader support" 
              description="Optimize for screen reader navigation"
              defaultChecked={false}
            />
            <Toggle 
              label="Reduce animations" 
              description="Minimize motion for sensitive users"
              defaultChecked={false}
            />
          </div>
        </Section>

        {/* Security */}
        <Section title="Security" icon="🔒">
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-650 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
              <span className="font-medium text-gray-700 dark:text-gray-300">Change password</span>
              <span>→</span>
            </button>
            
            <button className="w-full flex items-center justify-between bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-650 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
              <span className="font-medium text-gray-700 dark:text-gray-300">Active sessions</span>
              <span>→</span>
            </button>
          </div>
        </Section>

        {/* About */}
        <Section title="About" icon="ℹ️">
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>Build:</strong> March 2026</p>
            <div className="pt-2 space-x-3">
              <button className="text-blue-600 dark:text-blue-400 hover:underline">Terms of Service</button>
              <button className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</button>
              <button className="text-blue-600 dark:text-blue-400 hover:underline">Help & Support</button>
            </div>
          </div>
        </Section>

        {/* Logout */}
        <button className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500">
          🚪 Logout
        </button>

        {/* Danger Zone */}
        <div className="border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Danger Zone</h3>
          <button className="text-sm text-red-600 dark:text-red-400 hover:underline">
            Delete my account permanently
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Toggle({ label, description, defaultChecked }: { 
  label: string; 
  description?: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked ?? false);

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="font-medium text-gray-700 dark:text-gray-300">{label}</p>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}
        `}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
}
