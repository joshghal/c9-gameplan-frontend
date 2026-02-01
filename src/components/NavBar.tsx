'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Simulation' },
  { href: '/strategy', label: 'Strategy' },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="relative z-50" style={{ background: 'var(--bg-primary)' }}>
      {/* Bottom edge: cyan glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--c9-cyan)] to-transparent opacity-50" />

      <div className="max-w-[1800px] mx-auto px-6 h-12 flex items-center">
        {/* Left: C9 Logo + Label */}
        <Link href="/" className="flex items-center gap-3 mr-10 shrink-0 group">
          <img
            src="/cloud9-logo.svg"
            alt="Cloud9"
            className="h-6 w-auto opacity-90 group-hover:opacity-100 transition-opacity"
          />
          <div
            className="h-4 w-px opacity-20"
            style={{ background: 'var(--c9-cyan)' }}
          />
          <span
            className="text-[10px] font-medium uppercase tracking-[0.3em]"
            style={{
              fontFamily: 'var(--font-share-tech-mono)',
              color: 'var(--text-tertiary)',
            }}
          >
            Tactical Vision
          </span>
        </Link>

        {/* Center: Tabs with animated underline */}
        <div className="flex items-center gap-0.5">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] transition-colors"
                style={{
                  fontFamily: 'var(--font-rajdhani)',
                  color: isActive ? 'var(--c9-cyan)' : 'var(--text-tertiary)',
                }}
              >
                {tab.label}
                {/* Active underline */}
                <span
                  className="absolute bottom-0 left-2 right-2 h-[2px] transition-all duration-300"
                  style={{
                    background: isActive ? 'var(--c9-cyan)' : 'transparent',
                    boxShadow: isActive ? '0 0 8px rgba(0,174,239,0.4)' : 'none',
                  }}
                />
              </Link>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: System status */}
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-2 text-[10px] uppercase tracking-wider"
            style={{
              fontFamily: 'var(--font-share-tech-mono)',
              color: 'var(--text-tertiary)',
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: 'var(--val-teal)' }}
            />
            <span>Sys Online</span>
          </div>
          <div
            className="text-[10px] px-2 py-0.5"
            style={{
              fontFamily: 'var(--font-share-tech-mono)',
              color: 'var(--text-tertiary)',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
            }}
          >
            v1.0
          </div>
        </div>
      </div>
    </nav>
  );
}
