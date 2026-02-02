'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, Skull, ArrowLeft, Film } from 'lucide-react';
import { useStrategyStore, PHASE_LABELS } from '@/store/strategy';

export function FinalResultsView() {
  const router = useRouter();
  const { round, phaseResults, executedPhases, reset } = useStrategyStore();

  // Determine winner from the last executed phase
  const lastPhase = executedPhases[executedPhases.length - 1];
  const lastResult = lastPhase ? phaseResults[lastPhase] : null;
  const winner = lastResult?.winner;
  const userWon = winner === round?.user_side;

  // Aggregate all events across phases
  const allEvents = executedPhases.flatMap((phase) => {
    const r = phaseResults[phase];
    return r ? r.events.map((e) => ({ ...e, phase })) : [];
  });

  const kills = allEvents.filter((e) => e.event_type === 'kill');

  const handleWatchReplay = useCallback(() => {
    if (!round) return;
    router.push(`/matches?id=${round.round_id}`);
  }, [round, router]);

  if (!round) return null;

  return (
    <div className="flex flex-col h-screen items-center justify-center" style={{ background: 'var(--bg-abyss)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl p-8"
        style={{
          background: 'var(--bg-primary)',
          border: `1px solid ${userWon ? 'rgba(18,212,180,0.3)' : 'rgba(255,70,84,0.3)'}`,
          clipPath: 'var(--clip-corner)',
        }}
      >
        {/* Winner banner */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <Trophy className="w-8 h-8" style={{ color: userWon ? 'var(--val-teal)' : 'var(--val-red)' }} />
          <span className="text-3xl font-bold uppercase tracking-wider" style={{
            fontFamily: 'var(--font-rajdhani)',
            color: userWon ? 'var(--val-teal)' : 'var(--val-red)',
          }}>
            {winner ? (userWon ? 'Victory' : 'Defeat') : 'Round Complete'}
          </span>
        </div>

        {/* Round info */}
        <div className="text-center text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          <span className="capitalize">{round.map_name}</span>
          <span className="mx-2" style={{ color: 'var(--border-default)' }}>·</span>
          <span className="capitalize">{round.user_side} side</span>
          {winner && (
            <>
              <span className="mx-2" style={{ color: 'var(--border-default)' }}>·</span>
              <span className="capitalize">{winner} wins</span>
            </>
          )}
        </div>

        {/* Phase breakdown */}
        <div className="space-y-2 mb-6">
          <div className="text-xs uppercase tracking-wider mb-1" style={{
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-rajdhani)',
          }}>
            Phase Breakdown
          </div>
          {executedPhases.map((phase) => {
            const r = phaseResults[phase];
            if (!r) return null;
            const phaseKills = r.events.filter((e) => e.event_type === 'kill').length;
            return (
              <div key={phase} className="flex items-center justify-between px-3 py-2 text-xs" style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
              }}>
                <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-rajdhani)', fontWeight: 600 }}>
                  {PHASE_LABELS[phase]}
                </span>
                <div className="flex items-center gap-3">
                  <span style={{ color: 'var(--text-tertiary)' }}>
                    {phaseKills} kill{phaseKills !== 1 ? 's' : ''}
                  </span>
                  {r.round_ended && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold" style={{
                      background: 'rgba(255,70,84,0.15)',
                      color: 'var(--val-red)',
                      border: '1px solid rgba(255,70,84,0.3)',
                    }}>
                      ROUND ENDED
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* All kills */}
        {kills.length > 0 && (
          <div className="mb-6">
            <div className="text-xs uppercase tracking-wider mb-1" style={{
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-rajdhani)',
            }}>
              Kill Feed
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {kills.map((k, i) => (
                <div key={i} className="text-xs flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <span className="data-readout flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                    {(k.time_ms / 1000).toFixed(0)}s
                  </span>
                  <Skull className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--val-red)' }} />
                  <span style={{ color: 'var(--text-primary)' }}>{String(k.details?.killer_name ?? '')}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>&rarr;</span>
                  <span style={{ color: 'var(--text-primary)' }}>{String(k.details?.victim_name ?? '')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="btn-tactical flex-1 flex items-center justify-center gap-2 py-2.5 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            New Plan
          </button>
          <button
            onClick={handleWatchReplay}
            className="btn-c9 flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium"
          >
            <Film className="w-4 h-4" />
            Watch Real Match
          </button>
        </div>
      </motion.div>
    </div>
  );
}
