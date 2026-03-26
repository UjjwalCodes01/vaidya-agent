'use client';

import { StatusCard } from '@/components/shared';
import Link from 'next/link';

/**
 * Home Page Features
 */
export function HomeFeatures() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back! 👋
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          How can Vaidya help you today?
        </p>
      </div>

      {/* Primary Action */}
      <Link
        href="/triage"
        className="block bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl p-8 shadow-lg transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-2">Start Triage</h3>
            <p className="text-blue-100">Talk to Vaidya about your symptoms</p>
          </div>
          <span className="text-5xl">🤖</span>
        </div>
      </Link>

      {/* Health Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatusCard
          title="Last Triage"
          icon="📝"
          status="info"
          action={{
            label: 'View Details',
            onClick: () => (window.location.href = '/records')
          }}
        >
          <p className="text-sm">No recent triage sessions</p>
          <p className="text-xs text-gray-500 mt-1">Start your first consultation</p>
        </StatusCard>

        <StatusCard
          title="ABHA Status"
          icon="🔗"
          status="warning"
          action={{
            label: 'Link ABHA',
            onClick: () => (window.location.href = '/profile')
          }}
        >
          <p className="text-sm">Not linked</p>
          <p className="text-xs text-gray-500 mt-1">Link your ABHA for seamless health records</p>
        </StatusCard>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <QuickActionCard href="/records" icon="📋" label="View Records" />
          <QuickActionCard href="/care-finder" icon="🏥" label="Find Hospital" />
          <QuickActionCard href="/guides" icon="📚" label="Health Guides" />
        </div>
      </div>

      {/* Local Health Alert */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
              This Week in Your Region
            </h4>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Dengue cases increasing. Stay hydrated and use mosquito repellent.
            </p>
            <Link 
              href="/guides?topic=dengue" 
              className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline mt-2 inline-block"
            >
              Learn more →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <span className="text-3xl">{icon}</span>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
        {label}
      </span>
    </Link>
  );
}
