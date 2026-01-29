'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Zap, Shield, Eye, Wind } from 'lucide-react';
import { useSimulationStore } from '@/store/simulation';
import { analyticsApi, type AbilityEvent } from '@/lib/api';
import { cn, AGENT_COLORS } from '@/lib/utils';
import { TimelineBar } from './TimelineBar';

interface AbilityTimelineProps {
  className?: string;
  showDetails?: boolean;
}

// Ability icon mapping
const ABILITY_ICONS: Record<string, React.ReactNode> = {
  smoke: <Wind className="w-3 h-3" />,
  flash: <Zap className="w-3 h-3" />,
  recon: <Eye className="w-3 h-3" />,
  wall: <Shield className="w-3 h-3" />,
  default: <Sparkles className="w-3 h-3" />,
};

function getAbilityIcon(ability: string): React.ReactNode {
  const lower = ability.toLowerCase();
  for (const [key, icon] of Object.entries(ABILITY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return ABILITY_ICONS.default;
}

export function AbilityTimeline({ className, showDetails = true }: AbilityTimelineProps) {
  const { sessionId, currentTime } = useSimulationStore();

  const { data, isLoading } = useQuery({
    queryKey: ['abilityTimeline', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('No session');
      const response = await analyticsApi.getAbilityTimeline(sessionId);
      return response.data;
    },
    enabled: !!sessionId,
    staleTime: 30000,
  });

  const events = data?.events || [];

  // Group by agent
  const groupedByAgent = useMemo(() => {
    const groups: Record<string, AbilityEvent[]> = {};
    events.forEach(event => {
      if (!groups[event.agent]) groups[event.agent] = [];
      groups[event.agent].push(event);
    });
    return groups;
  }, [events]);

  // Recent abilities (within 5 seconds of current time)
  const recentAbilities = useMemo(() => {
    return events.filter(e =>
      e.timestamp_ms <= currentTime &&
      e.timestamp_ms >= currentTime - 5000
    );
  }, [events, currentTime]);

  // Convert to timeline events
  const timelineEvents = events.map(e => ({
    timestamp_ms: e.timestamp_ms,
    type: 'ability',
    label: `${e.agent}: ${e.ability}`,
    color: AGENT_COLORS[e.agent.toLowerCase()] || '#8b5cf6',
  }));

  return (
    <div className={cn(
      "bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-4",
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <h4 className="text-sm font-medium text-white">Abilities</h4>
        <span className="text-xs text-gray-400 ml-auto">
          {events.length} total
        </span>
      </div>

      {/* Timeline bar */}
      <TimelineBar
        events={timelineEvents}
        duration={100000}
        height={30}
        showMarkers={true}
        className="mb-4"
      />

      {/* Recent abilities */}
      <AnimatePresence>
        {recentAbilities.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-4"
          >
            <div className="text-xs text-gray-400 mb-2">Recent</div>
            <div className="flex flex-wrap gap-2">
              {recentAbilities.map((event, index) => (
                <motion.div
                  key={`${event.timestamp_ms}-${index}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5"
                >
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center"
                    style={{ backgroundColor: AGENT_COLORS[event.agent.toLowerCase()] || '#8b5cf6' }}
                  >
                    {getAbilityIcon(event.ability)}
                  </div>
                  <span className="text-xs text-white">{event.ability}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent breakdown */}
      {showDetails && (
        <div className="space-y-2">
          {Object.entries(groupedByAgent).map(([agent, abilities]) => (
            <div
              key={agent}
              className="flex items-center gap-2 py-1"
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold"
                style={{ backgroundColor: AGENT_COLORS[agent.toLowerCase()] || '#6b7280' }}
              >
                {agent.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-gray-400 flex-1 capitalize">{agent}</span>
              <div className="flex gap-1">
                {abilities.slice(0, 5).map((ability, index) => (
                  <div
                    key={index}
                    className="w-4 h-4 rounded bg-white/10 flex items-center justify-center"
                    title={ability.ability}
                  >
                    {getAbilityIcon(ability.ability)}
                  </div>
                ))}
                {abilities.length > 5 && (
                  <span className="text-xs text-gray-500">+{abilities.length - 5}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
