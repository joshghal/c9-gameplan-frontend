'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Target,
  Shield,
  Users,
  DollarSign,
  Swords,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useScoutingReport, useGenerateScoutingReport } from '@/hooks/useCoaching';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/ui/Markdown';

interface ScoutingReportPanelProps {
  teamName: string;
  mapName?: string;
  className?: string;
}

export function ScoutingReportPanel({
  teamName,
  mapName,
  className,
}: ScoutingReportPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['executive_summary'])
  );

  const { data: report, isLoading, refetch } = useScoutingReport(teamName, mapName);
  const generateMutation = useGenerateScoutingReport();

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleRefresh = async () => {
    await generateMutation.mutateAsync({ teamName, mapName, forceRefresh: true });
    refetch();
  };

  const sections = [
    {
      id: 'executive_summary',
      title: 'Executive Summary',
      icon: FileText,
    },
    {
      id: 'attack_tendencies',
      title: 'Attack Tendencies',
      icon: Target,
    },
    {
      id: 'defense_tendencies',
      title: 'Defense Tendencies',
      icon: Shield,
    },
    {
      id: 'key_players',
      title: 'Key Players',
      icon: Users,
    },
    {
      id: 'economic_patterns',
      title: 'Economic Patterns',
      icon: DollarSign,
    },
    {
      id: 'recommended_counters',
      title: 'Recommended Counters',
      icon: Swords,
    },
  ].map(s => ({ ...s, content: report?.report?.[s.id as keyof typeof report.report] as string | undefined }));

  return (
    <div className={cn(
      "hud-panel overflow-hidden",
      className
    )} style={{ borderTopColor: 'var(--neon-yellow)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 flex items-center justify-center" style={{
            background: 'var(--neon-yellow)',
            clipPath: 'var(--clip-corner-sm)',
          }}>
            <FileText className="w-3.5 h-3.5 text-black" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--neon-yellow)' }}>
              Scouting Report
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {teamName} {mapName && `on ${mapName}`}
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={generateMutation.isPending}
          className="btn-tactical p-2 disabled:opacity-50"
          title="Refresh report"
        >
          <RefreshCw className={cn(
            "w-4 h-4",
            generateMutation.isPending && "animate-spin"
          )} />
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mb-3" style={{ color: 'var(--c9-cyan)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Generating report...</p>
          </div>
        ) : !report ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <FileText className="w-12 h-12 mb-3" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-sm text-center mb-4" style={{ color: 'var(--text-secondary)' }}>
              No report available yet
            </p>
            <button
              onClick={() => generateMutation.mutate({ teamName, mapName })}
              disabled={generateMutation.isPending}
              className="btn-c9 px-4 py-2 text-sm"
            >
              Generate Report
            </button>
          </div>
        ) : (
          <div>
            {sections.map(section => (
              <ReportSection
                key={section.id}
                {...section}
                isExpanded={expandedSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {report && (
        <div className="px-4 py-2" style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-share-tech-mono)' }}>
            Generated: {new Date(report.generated_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

interface ReportSectionProps {
  id: string;
  title: string;
  icon: React.ElementType;
  content?: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function ReportSection({
  title,
  icon: Icon,
  content,
  isExpanded,
  onToggle,
}: ReportSectionProps) {
  if (!content) return null;

  return (
    <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:opacity-80"
        style={{ background: isExpanded ? 'var(--bg-elevated)' : 'transparent' }}
      >
        <Icon className="w-4 h-4" style={{ color: 'var(--neon-yellow)' }} />
        <span className="flex-1 text-sm font-semibold text-left uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>
          {title}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        ) : (
          <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pl-11">
              <Markdown>{content}</Markdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
