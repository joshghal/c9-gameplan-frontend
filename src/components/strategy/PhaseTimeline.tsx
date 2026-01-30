'use client';

import { useStrategyStore, PHASES, PHASE_LABELS, type Phase } from '@/store/strategy';

const PHASE_COLORS: Record<Phase, string> = {
  setup: 'bg-emerald-500',
  mid_round: 'bg-yellow-500',
  execute: 'bg-red-500',
  post_plant: 'bg-purple-500',
};

export function PhaseTimeline() {
  const { round, currentPhase, setCurrentPhase, waypoints } = useStrategyStore();
  const phaseTimes = round?.phase_times;

  return (
    <div className="space-y-1">
      {PHASES.map((phase) => {
        const isActive = phase === currentPhase;
        const times = phaseTimes?.[phase];
        const phaseWps = waypoints[phase] ?? {};
        const totalWps = Object.values(phaseWps).reduce((sum, wps) => sum + wps.length, 0);

        return (
          <button
            key={phase}
            onClick={() => setCurrentPhase(phase)}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm ${
              isActive
                ? 'bg-white/10 border border-white/20 text-white'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-300 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isActive ? PHASE_COLORS[phase] : 'bg-white/20'}`} />
              <span className="font-medium">{PHASE_LABELS[phase]}</span>
              {totalWps > 0 && (
                <span className="ml-auto text-xs text-gray-500">{totalWps}</span>
              )}
            </div>
            {times && (
              <div className="text-xs text-gray-500 ml-4.5 mt-0.5">
                {times[0]}s – {times[1]}s
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
