'use client';

import { useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSimulationStore } from '@/store/simulation';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  timestamp_ms: number;
  type: string;
  label?: string;
  color?: string;
}

interface TimelineBarProps {
  events: TimelineEvent[];
  duration?: number;
  height?: number;
  showMarkers?: boolean;
  onSeek?: (timestamp: number) => void;
  className?: string;
}

export function TimelineBar({
  events,
  duration = 100000, // 100 seconds default
  height = 40,
  showMarkers = true,
  onSeek,
  className,
}: TimelineBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentTime, status } = useSimulationStore();

  const progress = Math.min(1, currentTime / duration);

  // Group events by type
  const eventGroups = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    events.forEach(event => {
      if (!groups[event.type]) groups[event.type] = [];
      groups[event.type].push(event);
    });
    return groups;
  }, [events]);

  const handleClick = (e: React.MouseEvent) => {
    if (!containerRef.current || !onSeek) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    onSeek(Math.round(percent * duration));
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full rounded-lg overflow-hidden cursor-pointer",
        className
      )}
      style={{ height }}
      onClick={handleClick}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-white/5" />

      {/* Time markers */}
      {showMarkers && (
        <div className="absolute inset-0 flex justify-between px-2 pointer-events-none">
          {[0, 0.25, 0.5, 0.75, 1].map(pos => (
            <div
              key={pos}
              className="flex flex-col items-center"
              style={{ position: 'absolute', left: `${pos * 100}%` }}
            >
              <div className="w-px h-2 bg-white/20" />
              <span className="text-[8px] text-gray-500 mt-0.5">
                {Math.round(pos * duration / 1000)}s
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Event markers */}
      {events.map((event, index) => {
        const position = (event.timestamp_ms / duration) * 100;
        return (
          <motion.div
            key={`${event.type}-${index}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full cursor-pointer hover:scale-150 transition-transform z-10"
            style={{
              left: `${position}%`,
              backgroundColor: event.color || getEventColor(event.type),
            }}
            title={event.label || event.type}
          />
        );
      })}

      {/* Progress indicator */}
      <motion.div
        className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-blue-500/30 to-blue-400/20"
        initial={{ width: 0 }}
        animate={{ width: `${progress * 100}%` }}
        transition={{ type: 'tween', duration: 0.1 }}
      />

      {/* Current position marker */}
      <motion.div
        className="absolute top-0 bottom-0 w-0.5 bg-blue-400 z-20"
        initial={{ left: 0 }}
        animate={{ left: `${progress * 100}%` }}
        transition={{ type: 'tween', duration: 0.1 }}
      >
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full" />
      </motion.div>
    </div>
  );
}

function getEventColor(type: string): string {
  const colors: Record<string, string> = {
    kill: '#ef4444',
    death: '#6b7280',
    plant: '#f59e0b',
    defuse: '#22c55e',
    ability: '#8b5cf6',
    damage: '#f97316',
    default: '#60a5fa',
  };
  return colors[type.toLowerCase()] || colors.default;
}
