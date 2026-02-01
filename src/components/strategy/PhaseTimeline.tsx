'use client';

import { useStrategyStore, PHASES, PHASE_LABELS, type Phase } from '@/store/strategy';

const PHASE_COLORS: Record<Phase, string> = {
  setup: 'var(--val-teal)',
  mid_round: 'var(--neon-yellow)',
  execute: 'var(--val-red)',
  post_plant: 'var(--neon-purple)',
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
            className="w-full text-left px-3 py-2.5 transition-all text-sm"
            style={{
              background: isActive ? 'var(--bg-elevated)' : 'transparent',
              border: `1px solid ${isActive ? PHASE_COLORS[phase] : 'transparent'}`,
              clipPath: 'var(--clip-corner-sm)',
              fontFamily: 'var(--font-rajdhani)',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2"
                style={{
                  background: isActive ? PHASE_COLORS[phase] : 'var(--bg-elevated)',
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                  boxShadow: isActive ? `0 0 6px ${PHASE_COLORS[phase]}` : 'none',
                }}
              />
              <span className="font-semibold uppercase tracking-wider" style={{ color: isActive ? PHASE_COLORS[phase] : 'var(--text-secondary)' }}>
                {PHASE_LABELS[phase]}
              </span>
              {totalWps > 0 && (
                <span className="ml-auto text-xs data-readout" style={{ color: 'var(--text-tertiary)' }}>{totalWps}</span>
              )}
            </div>
            {times && (
              <div className="text-xs ml-4 mt-0.5" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                {times[0]}s – {times[1]}s
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
