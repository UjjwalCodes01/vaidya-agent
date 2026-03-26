'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/triage', label: 'Triage', icon: '🤖' },
  { href: '/records', label: 'Records', icon: '📋' },
  { href: '/care-finder', label: 'Care', icon: '🏥' },
  { href: '/guides', label: 'Guides', icon: '📚' },
  { href: '/profile', label: 'Profile', icon: '👤' },
] as const;

/**
 * Bottom Navigation
 * Primary navigation for mobile and desktop
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex justify-around items-center h-16 md:h-20">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col items-center justify-center gap-1
                  min-w-[64px] md:min-w-[80px] px-2 py-2
                  rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="text-2xl md:text-3xl" role="img" aria-label={item.label}>
                  {item.icon}
                </span>
                <span className={`text-xs md:text-sm font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
