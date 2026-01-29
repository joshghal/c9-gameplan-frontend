'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Skull, Target, Bomb, Shield } from 'lucide-react';
import { useSimulationStore } from '@/store/simulation';
import { formatTime } from '@/lib/utils';

export function EventLog() {
  const { events } = useSimulationStore();

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'kill':
        return <Skull className="w-4 h-4 text-red-500" />;
      case 'spike_plant':
        return <Bomb className="w-4 h-4 text-orange-500" />;
      case 'spike_defuse':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <Target className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEventDescription = (event: typeof events[0]) => {
    switch (event.event_type) {
      case 'kill':
        const killerId = String(event.details?.killer_id || 'Unknown');
        const headshot = Boolean(event.details?.headshot);
        return (
          <span>
            <span className="text-blue-400">{killerId}</span>
            {headshot && <span className="text-yellow-400 ml-1">⚡</span>}
            <span className="text-gray-400"> eliminated </span>
            <span className="text-red-400">{event.player_id}</span>
          </span>
        );
      case 'spike_plant':
        const site = String(event.details?.site || 'Unknown');
        return (
          <span>
            <span className="text-red-400">{event.player_id}</span>
            <span className="text-gray-400"> planted spike at </span>
            <span className="text-yellow-400">{site}</span>
          </span>
        );
      case 'spike_defuse':
        return (
          <span>
            <span className="text-blue-400">{event.player_id}</span>
            <span className="text-gray-400"> defused the spike</span>
          </span>
        );
      default:
        return (
          <span className="text-gray-400">
            {event.event_type}
          </span>
        );
    }
  };

  // Sort events by time (newest first)
  const sortedEvents = [...events].sort((a, b) => b.timestamp_ms - a.timestamp_ms);

  return (
    <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <h3 className="text-lg font-semibold text-white mb-4">Event Log</h3>

      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {sortedEvents.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-4">
              No events yet...
            </div>
          ) : (
            sortedEvents.map((event, index) => (
              <motion.div
                key={`${event.timestamp_ms}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex-shrink-0">
                  {getEventIcon(event.event_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">
                    {getEventDescription(event)}
                  </div>
                </div>
                <div className="flex-shrink-0 text-xs text-gray-500 font-mono">
                  {formatTime(event.timestamp_ms)}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Stats Summary */}
      {events.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-red-400">
                {events.filter((e) => e.event_type === 'kill').length}
              </div>
              <div className="text-xs text-gray-500">Kills</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">
                {events.filter((e) => (e.details?.headshot as boolean)).length}
              </div>
              <div className="text-xs text-gray-500">Headshots</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400">
                {events.filter((e) => e.event_type === 'spike_plant').length}
              </div>
              <div className="text-xs text-gray-500">Plants</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
