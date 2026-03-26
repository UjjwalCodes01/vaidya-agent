'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/triage', label: 'Triage' },
  { href: '/records', label: 'Records' },
  { href: '/care-finder', label: 'Care' },
  { href: '/guides', label: 'Guides' },
  { href: '/profile', label: 'Profile' },
] as const;

/**
 * Bottom Navigation
 * Primary navigation for mobile and desktop
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-0 right-0 z-40 px-4">
      <div className="ui-shell mx-auto max-w-4xl rounded-[24px] px-2 py-2">
        <div className="grid h-16 grid-cols-6 items-center gap-1 md:h-[72px]">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex h-full items-center justify-center
                  rounded-2xl px-2 text-center transition-all duration-200
                  ${isActive 
                    ? 'bg-brand text-white shadow-[0_10px_24px_rgba(35,83,71,0.28)]'
                    : 'text-muted hover:bg-black/3 dark:hover:bg-white/4'
                  }
                  focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={`text-[11px] font-semibold tracking-[0.16em] uppercase md:text-xs ${isActive ? 'text-white' : ''}`}>
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
