'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, BookOpen, Cpu, Crosshair, Database, Layers, Users } from 'lucide-react';
import { Markdown } from '@/components/ui/Markdown';
import { DOC_SECTIONS, type DocSection } from './docs-content';

const SECTION_ICONS: Record<string, React.ReactNode> = {
  overview: <BookOpen className="w-4 h-4" />,
  features: <Layers className="w-4 h-4" />,
  engine: <Crosshair className="w-4 h-4" />,
  data: <Database className="w-4 h-4" />,
  architecture: <Cpu className="w-4 h-4" />,
  'c9-realism': <Users className="w-4 h-4" />,
};

const HERO_STATS = [
  { label: 'Accuracy', value: '86%' },
  { label: 'VCT Samples', value: '592K' },
  { label: 'Kills Analyzed', value: '12K' },
  { label: 'Maps', value: '11' },
  { label: 'Pro Players', value: '85' },
  { label: 'Abilities', value: '43' },
];

export function DocsView() {
  const [activeSection, setActiveSection] = useState('overview-intro');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(DOC_SECTIONS.map((s) => s.id)),
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Scroll-spy: track which subsection is visible
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      { root: content, rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    );

    const headings = content.querySelectorAll('[data-doc-section]');
    headings.forEach((el) => observerRef.current!.observe(el));

    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el && contentRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  }, []);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="h-[calc(100vh-48px)] flex" style={{ background: 'var(--bg-abyss)' }}>
      {/* ── Sidebar ── */}
      <aside
        className="w-[260px] flex-shrink-0 overflow-y-auto custom-scrollbar border-r"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)' }}
      >
        {/* Sidebar header */}
        <div className="px-5 pt-6 pb-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5" style={{ background: 'var(--c9-cyan)' }} />
            <span
              className="text-xs font-bold uppercase tracking-[0.2em]"
              style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--c9-cyan)' }}
            >
              Documentation
            </span>
          </div>
          <p className="text-[11px] ml-3" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-rajdhani)' }}>
            C9 Gameplan v1.0
          </p>
        </div>

        {/* Section list */}
        <nav className="py-3">
          {DOC_SECTIONS.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            const hasActiveSub = section.subsections.some((s) => s.id === activeSection);
            return (
              <div key={section.id} className="mb-1">
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center gap-2 px-5 py-2 text-left transition-colors hover:brightness-125"
                  style={{
                    color: hasActiveSub ? 'var(--c9-cyan)' : 'var(--text-secondary)',
                  }}
                >
                  <span style={{ color: hasActiveSub ? 'var(--c9-cyan)' : 'var(--text-tertiary)' }}>
                    {SECTION_ICONS[section.id] || <BookOpen className="w-4 h-4" />}
                  </span>
                  <span
                    className="flex-1 text-xs font-semibold uppercase tracking-wider"
                    style={{ fontFamily: 'var(--font-rajdhani)' }}
                  >
                    {section.title}
                  </span>
                  <ChevronRight
                    className="w-3 h-3 transition-transform"
                    style={{
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      color: 'var(--text-tertiary)',
                    }}
                  />
                </button>

                {/* Subsections */}
                {isExpanded && (
                  <div className="ml-7 border-l" style={{ borderColor: 'var(--border-default)' }}>
                    {section.subsections.map((sub) => {
                      const isActive = activeSection === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => scrollTo(sub.id)}
                          className="w-full text-left px-4 py-2 text-xs transition-colors hover:brightness-125"
                          style={{
                            fontFamily: 'var(--font-rajdhani)',
                            color: isActive ? 'var(--c9-cyan)' : 'var(--text-secondary)',
                            borderLeft: isActive ? '2px solid var(--c9-cyan)' : '2px solid transparent',
                            marginLeft: '-1px',
                            background: isActive ? 'rgba(0,174,239,0.05)' : 'transparent',
                          }}
                        >
                          {sub.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── Content ── */}
      <main ref={contentRef} className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-12 pt-10 pb-8"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-4">
              <img src="/cloud9-logo.svg" alt="Cloud9" className="h-8 w-auto opacity-90" />
              <div className="h-6 w-px" style={{ background: 'rgba(0,174,239,0.3)' }} />
              <h1
                className="text-3xl font-bold uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}
              >
                Gameplan
              </h1>
            </div>
            <p
              className="text-sm leading-relaxed max-w-2xl mb-6"
              style={{ color: 'var(--text-secondary)' }}
            >
              Professional-grade VALORANT tactical simulation and analysis platform.
              Simulate full rounds with VCT-calibrated mechanics, plan tactics against real pro data,
              and receive AI-powered coaching insights — all in one integrated tool.
            </p>

            {/* Stats badges */}
            <div className="flex flex-wrap gap-3">
              {HERO_STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="px-3 py-2"
                  style={{
                    background: 'rgba(0,174,239,0.06)',
                    border: '1px solid rgba(0,174,239,0.15)',
                    clipPath: 'var(--clip-corner-sm)',
                  }}
                >
                  <div
                    className="text-lg font-bold"
                    style={{ fontFamily: 'var(--font-share-tech-mono)', color: 'var(--c9-cyan)' }}
                  >
                    {stat.value}
                  </div>
                  <div
                    className="text-[10px] uppercase tracking-wider"
                    style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-tertiary)' }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Sections */}
        <div className="px-12 py-8">
          <div className="max-w-4xl space-y-16">
            {DOC_SECTIONS.map((section, si) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: si * 0.05 }}
              >
                {/* Section title */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6" style={{ background: 'var(--c9-cyan)' }} />
                  <span style={{ color: 'var(--c9-cyan)' }}>
                    {SECTION_ICONS[section.id] || <BookOpen className="w-5 h-5" />}
                  </span>
                  <h2
                    className="text-xl font-bold uppercase tracking-wider"
                    style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}
                  >
                    {section.title}
                  </h2>
                </div>

                {/* Subsections */}
                <div className="space-y-12">
                  {section.subsections.map((sub) => (
                    <div
                      key={sub.id}
                      id={sub.id}
                      data-doc-section
                      className="scroll-mt-8"
                    >
                      <div
                        className="mb-4 pb-2"
                        style={{ borderBottom: '1px solid var(--border-default)' }}
                      >
                        <h3
                          className="text-base font-bold uppercase tracking-wider"
                          style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}
                        >
                          {sub.title}
                        </h3>
                      </div>
                      <Markdown>{sub.content}</Markdown>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}

            {/* Footer */}
            <div
              className="text-center py-12 text-xs"
              style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-rajdhani)' }}
            >
              <div className="flex items-center justify-center gap-3 mb-2">
                <img src="/cloud9-logo.svg" alt="Cloud9" className="h-4 w-auto opacity-50" />
                <span>×</span>
                <img src="/jetbrains-logo-white.svg" alt="JetBrains" className="h-3 w-auto opacity-50" />
                <img src="/junie-logo.svg" alt="Junie" className="h-3 w-auto opacity-50" />
              </div>
              C9 Gameplan — Sky&apos;s the Limit Hackathon 2026
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
