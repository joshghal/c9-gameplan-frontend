'use client';

import { useStrategyStore, PHASES } from '@/store/strategy';

const PLAYER_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'];

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
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm ${
              isSelected
                ? 'bg-white/10 border border-white/20'
                : 'hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: PLAYER_COLORS[i] }}
              />
              <div className="min-w-0 flex-1">
                <div className={`font-medium truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                  {t.name}
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {t.agent} · {t.role}
                </div>
              </div>
              <div className="text-xs text-gray-500 flex-shrink-0">
                {phaseWps.length > 0 && (
                  <span className="text-white bg-white/10 px-1.5 py-0.5 rounded">{phaseWps.length}</span>
                )}
                {totalWps > 0 && phaseWps.length === 0 && (
                  <span className="text-gray-500">{totalWps}</span>
                )}
              </div>
            </div>
          </button>
        );
      })}

      {/* Adopt Pro Paths */}
      <button
        onClick={adoptAllGhostPaths}
        className="w-full mt-2 py-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors border border-purple-500/20"
      >
        Adopt All Pro Paths
      </button>
      {selectedPlayerId && (
        <button
          onClick={() => adoptGhostPath(selectedPlayerId)}
          className="w-full mt-1 py-2 text-xs text-purple-400/60 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors"
        >
          Adopt Pro Path (selected)
        </button>
      )}

      {/* Undo button */}
      {selectedPlayerId && (waypoints[currentPhase]?.[selectedPlayerId]?.length ?? 0) > 0 && (
        <button
          onClick={() => removeLastWaypoint(currentPhase, selectedPlayerId)}
          className="w-full mt-1 py-2 text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          Undo Last Waypoint
        </button>
      )}
    </div>
  );
}

export { PLAYER_COLORS };
