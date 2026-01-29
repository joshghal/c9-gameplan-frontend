'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useSimulationStore } from '@/store/simulation';
import { analyticsApi, type EconomyEvent } from '@/lib/api';
import { cn } from '@/lib/utils';

interface EconomyTimelineProps {
  className?: string;
  compact?: boolean;
}

export function EconomyTimeline({ className, compact = false }: EconomyTimelineProps) {
  const { sessionId } = useSimulationStore();

  const { data, isLoading } = useQuery({
    queryKey: ['economyTimeline', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('No session');
      const response = await analyticsApi.getEconomyTimeline(sessionId);
      return response.data;
    },
    enabled: !!sessionId,
    staleTime: 30000,
  });

  const events = data?.events || [];

  // Calculate stats
  const stats = useMemo(() => {
    if (!events.length) return null;

    const fullBuys = events.filter(e => e.buy_type === 'full_buy').length;
    const ecos = events.filter(e => e.buy_type === 'save').length;
    const forces = events.filter(e => e.buy_type === 'force').length;
    const avgCredits = Math.round(
      events.reduce((sum, e) => sum + e.total_credits, 0) / events.length
    );

    return { fullBuys, ecos, forces, avgCredits };
  }, [events]);

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-4 px-3 py-2 bg-white/5 rounded-lg",
        className
      )}>
        <DollarSign className="w-4 h-4 text-green-400" />
        <div className="flex gap-3 text-xs">
          <span className="text-gray-400">
            Full: <span className="text-white">{stats?.fullBuys || 0}</span>
          </span>
          <span className="text-gray-400">
            Force: <span className="text-yellow-400">{stats?.forces || 0}</span>
          </span>
          <span className="text-gray-400">
            Eco: <span className="text-red-400">{stats?.ecos || 0}</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-4",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <h4 className="text-sm font-medium text-white">Economy</h4>
        </div>
        {stats && (
          <span className="text-xs text-gray-400">
            Avg: ${stats.avgCredits.toLocaleString()}
          </span>
        )}
      </div>

      {/* Round bars */}
      <div className="space-y-2">
        {events.slice(0, 6).map((event, index) => (
          <EconomyRoundBar key={index} event={event} roundNumber={index + 1} />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/10">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs text-gray-400">Full Buy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-xs text-gray-400">Force</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs text-gray-400">Eco</span>
        </div>
      </div>
    </div>
  );
}

interface EconomyRoundBarProps {
  event: EconomyEvent;
  roundNumber: number;
}

function EconomyRoundBar({ event, roundNumber }: EconomyRoundBarProps) {
  const maxCredits = 9000;
  const percentage = Math.min(100, (event.total_credits / maxCredits) * 100);

  const buyTypeColors = {
    full_buy: 'from-green-500 to-emerald-400',
    force: 'from-yellow-500 to-amber-400',
    save: 'from-red-500 to-rose-400',
    pistol: 'from-purple-500 to-violet-400',
  };

  const buyTypeLabels = {
    full_buy: 'Full',
    force: 'Force',
    save: 'Eco',
    pistol: 'Pistol',
  };

  return (
    <div className="flex items-center gap-3">
      {/* Round number */}
      <span className="w-6 text-xs text-gray-500 text-right">R{roundNumber}</span>

      {/* Bar */}
      <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={cn(
            "h-full rounded-full bg-gradient-to-r",
            buyTypeColors[event.buy_type as keyof typeof buyTypeColors] || buyTypeColors.save
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, delay: roundNumber * 0.1 }}
        />
      </div>

      {/* Buy type badge */}
      <span className={cn(
        "text-[10px] font-medium px-1.5 py-0.5 rounded",
        event.buy_type === 'full_buy' && "bg-green-500/20 text-green-400",
        event.buy_type === 'force' && "bg-yellow-500/20 text-yellow-400",
        event.buy_type === 'save' && "bg-red-500/20 text-red-400",
        event.buy_type === 'pistol' && "bg-purple-500/20 text-purple-400"
      )}>
        {buyTypeLabels[event.buy_type as keyof typeof buyTypeLabels] || event.buy_type}
      </span>

      {/* Credits */}
      <span className="w-14 text-xs text-gray-400 text-right">
        ${event.total_credits.toLocaleString()}
      </span>
    </div>
  );
}
