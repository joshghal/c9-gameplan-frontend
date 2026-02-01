'use client';

import { useStrategyStore, PHASES } from '@/store/strategy';

const PLAYER_COLORS = ['#ff4654', '#ffe600', '#12d4b4', '#00AEEF', '#b967ff'];

export function PlayerPlanList() {
  const { round, selectedPlayerId, setSelectedPlayerId, waypoints, currentPhase, removeLastWaypoint, adoptGhostPath, adoptAllGhostPaths } = useStrategyStore();

  if (!round) return null;

  return (
    <div className="space-y-1">
      {round.teammates.map((t, i) => {
        const isSelected = t.player_id === selectedPlayerId;
        const phaseWps = waypoints[currentPhase]?.[t.player_id] ?? [];
        const totalWps = PHASES.reduce(
          (sum, p) => sum + (waypoints[p]?.[t.player_id]?.length ?? 0),
          0,
        );

        return (
          <button
            key={t.player_id}
            onClick={() => setSelectedPlayerId(t.player_id)}
            className="w-full text-left px-3 py-2.5 transition-all text-sm"
            style={{
              background: isSelected ? 'var(--bg-elevated)' : 'transparent',
              border: `1px solid ${isSelected ? PLAYER_COLORS[i] : 'transparent'}`,
              clipPath: 'var(--clip-corner-sm)',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 flex-shrink-0"
                style={{
                  backgroundColor: PLAYER_COLORS[i],
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate" style={{
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-rajdhani)',
                }}>
                  {t.name}
                </div>
                <div className="text-xs capitalize" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-rajdhani)' }}>
                  {t.agent} · {t.role}
                </div>
              </div>
              <div className="text-xs flex-shrink-0">
                {phaseWps.length > 0 && (
                  <span className="px-1.5 py-0.5 data-readout" style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    clipPath: 'var(--clip-corner-sm)',
                  }}>{phaseWps.length}</span>
                )}
                {totalWps > 0 && phaseWps.length === 0 && (
                  <span className="data-readout" style={{ color: 'var(--text-tertiary)' }}>{totalWps}</span>
                )}
              </div>
            </div>
          </button>
        );
      })}

      {/* Adopt Pro Paths */}
      <button
        onClick={adoptAllGhostPaths}
        className="w-full mt-2 py-2 text-xs transition-all"
        style={{
          color: 'var(--neon-purple)',
          border: '1px solid rgba(185,103,255,0.2)',
          clipPath: 'var(--clip-corner-sm)',
          fontFamily: 'var(--font-rajdhani)',
          fontWeight: 600,
        }}
      >
        Adopt All Pro Paths
      </button>
      {selectedPlayerId && (
        <button
          onClick={() => adoptGhostPath(selectedPlayerId)}
          className="w-full mt-1 py-2 text-xs transition-all"
          style={{
            color: 'rgba(185,103,255,0.6)',
            fontFamily: 'var(--font-rajdhani)',
          }}
        >
          Adopt Pro Path (selected)
        </button>
      )}

      {/* Undo button */}
      {selectedPlayerId && (waypoints[currentPhase]?.[selectedPlayerId]?.length ?? 0) > 0 && (
        <button
          onClick={() => removeLastWaypoint(currentPhase, selectedPlayerId)}
          className="w-full mt-1 py-2 text-xs transition-all"
          style={{
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-rajdhani)',
          }}
        >
          Undo Last Waypoint
        </button>
      )}
    </div>
  );
}

export { PLAYER_COLORS };
