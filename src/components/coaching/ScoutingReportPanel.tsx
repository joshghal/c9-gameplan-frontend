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
      content: report?.report?.executive_summary,
    },
    {
      id: 'attack_tendencies',
      title: 'Attack Tendencies',
      icon: Target,
      content: report?.report?.attack_tendencies,
    },
    {
      id: 'defense_tendencies',
      title: 'Defense Tendencies',
      icon: Shield,
      content: report?.report?.defense_tendencies,
    },
    {
      id: 'key_players',
      title: 'Key Players',
      icon: Users,
      content: report?.report?.key_players,
    },
    {
      id: 'economic_patterns',
      title: 'Economic Patterns',
      icon: DollarSign,
      content: report?.report?.economic_patterns,
    },
    {
      id: 'recommended_counters',
      title: 'Recommended Counters',
      icon: Swords,
      content: report?.report?.recommended_counters,
    },
  ];

  return (
    <div className={cn(
      "bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Scouting Report
            </h3>
            <p className="text-xs text-gray-400">
              {teamName} {mapName && `on ${mapName}`}
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={generateMutation.isPending}
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
          title="Refresh report"
        >
          <RefreshCw className={cn(
            "w-4 h-4",
            generateMutation.isPending && "animate-spin"
          )} />
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />
            <p className="text-sm text-gray-400">Generating report...</p>
          </div>
        ) : !report ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <FileText className="w-12 h-12 text-gray-500 mb-3" />
            <p className="text-sm text-gray-400 text-center mb-4">
              No report available yet
            </p>
            <button
              onClick={() => generateMutation.mutate({ teamName, mapName })}
              disabled={generateMutation.isPending}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors"
            >
              Generate Report
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
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
        <div className="px-4 py-2 border-t border-white/10 bg-white/5">
          <p className="text-xs text-gray-500">
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
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="flex-1 text-sm font-medium text-white text-left">
          {title}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
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
              <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                {content}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
