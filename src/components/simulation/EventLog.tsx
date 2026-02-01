'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, Target, Bomb, Shield } from 'lucide-react';
import { useSimulationStore } from '@/store/simulation';
import { formatTime } from '@/lib/utils';

interface EventLogProps {
  variant?: 'full' | 'compact';
}

export function EventLog({ variant = 'full' }: EventLogProps) {
  const { events, positions } = useSimulationStore();

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'kill':
        return <Skull className="w-4 h-4" style={{ color: 'var(--val-red)' }} />;
      case 'spike_plant':
        return <Bomb className="w-4 h-4" style={{ color: 'var(--val-red)' }} />;
      case 'spike_defuse':
        return <Shield className="w-4 h-4" style={{ color: 'var(--val-teal)' }} />;
      default:
        return <Target className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />;
    }
  };

  const resolvePlayerName = (playerId: string | null) => {
    if (!playerId) return 'Unknown';
    const player = positions.find(p => p.player_id === playerId);
    return player?.name ?? playerId;
  };

  const getEventDescription = (event: typeof events[0]) => {
    switch (event.event_type) {
      case 'kill':
        const killerId = String(event.details?.killer_id || 'Unknown');
        const killerName = resolvePlayerName(killerId);
        const victimName = resolvePlayerName(event.player_id);
        const headshot = Boolean(event.details?.headshot);
        return (
          <span>
            <span style={{ color: 'var(--val-teal)' }}>{killerName}</span>
            {headshot && <span className="ml-1" style={{ color: 'var(--val-red)' }}>HS</span>}
            <span style={{ color: 'var(--text-tertiary)' }}> eliminated </span>
            <span style={{ color: 'var(--val-red)' }}>{victimName}</span>
          </span>
        );
      case 'spike_plant':
        const site = String(event.details?.site || 'Unknown');
        return (
          <span>
            <span style={{ color: 'var(--val-red)' }}>{resolvePlayerName(event.player_id)}</span>
            <span style={{ color: 'var(--text-tertiary)' }}> planted spike at </span>
            <span style={{ color: 'var(--text-primary)' }}>{site}</span>
          </span>
        );
      case 'spike_defuse':
        return (
          <span>
            <span style={{ color: 'var(--val-teal)' }}>{resolvePlayerName(event.player_id)}</span>
            <span style={{ color: 'var(--text-tertiary)' }}> defused the spike</span>
          </span>
        );
      default:
        return (
          <span style={{ color: 'var(--text-tertiary)' }}>
            {event.event_type}
          </span>
        );
    }
  };

  // Sort events by time (oldest first — chronological)
  const sortedEvents = [...events].sort((a, b) => a.timestamp_ms - b.timestamp_ms);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  // ─── COMPACT VARIANT (kill-feed overlay) ───
  if (variant === 'compact') {
    const recentEvents = sortedEvents.slice(-6);
    return (
      <div className="space-y-1.5">
        <AnimatePresence mode="popLayout">
          {recentEvents.map((event, index) => (
            <motion.div
              key={`${event.timestamp_ms}-${index}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="frosted-glass flex items-center gap-2.5 px-3 py-2"
              style={{
                borderLeft: `2px solid ${event.event_type === 'kill' ? 'var(--val-red)' : event.event_type === 'spike_defuse' ? 'var(--val-teal)' : 'var(--c9-cyan)'}`,
              }}
            >
              <div className="flex-shrink-0">{getEventIcon(event.event_type)}</div>
              <div className="flex-1 min-w-0 text-sm truncate">{getEventDescription(event)}</div>
              <div className="flex-shrink-0 data-readout text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                {formatTime(event.timestamp_ms)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {recentEvents.length === 0 && (
          <div className="frosted-glass px-3 py-2 text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
            Awaiting events...
          </div>
        )}
      </div>
    );
  }

  // ─── FULL VARIANT ───
  return (
    <div className="hud-panel hud-panel-cyan p-5">
      <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--c9-cyan)' }}>Event Log</h3>

      <div ref={scrollRef} className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {sortedEvents.length === 0 ? (
            <div className="text-xs text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
              No events yet...
            </div>
          ) : (
            sortedEvents.map((event, index) => (
              <motion.div
                key={`${event.timestamp_ms}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 p-2 transition-colors"
                style={{
                  background: 'var(--bg-elevated)',
                  borderLeft: `2px solid ${event.event_type === 'kill' ? 'var(--val-red)' : event.event_type === 'spike_defuse' ? 'var(--val-teal)' : 'var(--c9-cyan)'}`,
                }}
              >
                <div className="flex-shrink-0">
                  {getEventIcon(event.event_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">
                    {getEventDescription(event)}
                  </div>
                </div>
                <div className="flex-shrink-0 data-readout text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {formatTime(event.timestamp_ms)}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Stats Summary */}
      {events.length > 0 && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="data-readout-lg" style={{ color: 'var(--val-red)' }}>
                {events.filter((e) => e.event_type === 'kill').length}
              </div>
              <div className="text-xs uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-tertiary)' }}>Kills</div>
            </div>
            <div>
              <div className="data-readout-lg" style={{ color: 'var(--c9-cyan-light)' }}>
                {events.filter((e) => (e.details?.headshot as boolean)).length}
              </div>
              <div className="text-xs uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-tertiary)' }}>Headshots</div>
            </div>
            <div>
              <div className="data-readout-lg" style={{ color: 'var(--c9-cyan-light)' }}>
                {events.filter((e) => e.event_type === 'spike_plant').length}
              </div>
              <div className="text-xs uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-tertiary)' }}>Plants</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
