'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, ChevronRight, Loader2 } from 'lucide-react';
import { useStrategyStore, PHASES, PHASE_LABELS } from '@/store/strategy';
import { strategyApi } from '@/lib/strategy-api';
import { PhaseTimeline } from './PhaseTimeline';
import { PlayerPlanList } from './PlayerPlanList';
import { WaypointOverlay } from './WaypointOverlay';

// Map data for rendering (same as simulation MapCanvas)
const MAP_DATA: Record<string, {
  sites: Record<string, { center: [number, number]; radius: number }>;
}> = {
  ascent: { sites: { A: { center: [0.29, 0.15], radius: 0.08 }, B: { center: [0.27, 0.79], radius: 0.08 } } },
  bind: { sites: { A: { center: [0.29, 0.27], radius: 0.08 }, B: { center: [0.73, 0.33], radius: 0.08 } } },
  split: { sites: { A: { center: [0.33, 0.09], radius: 0.08 }, B: { center: [0.32, 0.82], radius: 0.08 } } },
  icebox: { sites: { A: { center: [0.61, 0.21], radius: 0.08 }, B: { center: [0.71, 0.81], radius: 0.10 } } },
  breeze: { sites: { A: { center: [0.15, 0.29], radius: 0.09 }, B: { center: [0.87, 0.45], radius: 0.08 } } },
  fracture: { sites: { A: { center: [0.08, 0.45], radius: 0.08 }, B: { center: [0.92, 0.45], radius: 0.08 } } },
  pearl: { sites: { A: { center: [0.18, 0.40], radius: 0.08 }, B: { center: [0.85, 0.31], radius: 0.08 } } },
  sunset: { sites: { A: { center: [0.08, 0.40], radius: 0.08 }, B: { center: [0.82, 0.38], radius: 0.08 } } },
  abyss: { sites: { A: { center: [0.40, 0.19], radius: 0.08 }, B: { center: [0.40, 0.77], radius: 0.08 } } },
  corrode: { sites: { A: { center: [0.40, 0.19], radius: 0.08 }, B: { center: [0.40, 0.77], radius: 0.08 } } },
  haven: { sites: { A: { center: [0.38, 0.14], radius: 0.07 }, B: { center: [0.40, 0.50], radius: 0.07 }, C: { center: [0.36, 0.84], radius: 0.07 } } },
  lotus: { sites: { A: { center: [0.10, 0.45], radius: 0.07 }, B: { center: [0.47, 0.42], radius: 0.07 }, C: { center: [0.87, 0.32], radius: 0.07 } } },
};

export function PlanningWorkspace() {
  const {
    round, currentPhase, setCurrentPhase, selectedPlayerId,
    addWaypoint, waypoints, setPageState, setResult, setIsLoading, setError, isLoading, error, reset,
    showGhosts, toggleGhosts,
  } = useStrategyStore();
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapSize, setMapSize] = useState(600);
  const [clickState, setClickState] = useState<'position' | 'facing'>('position');
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);

  // Dynamic map sizing
  useEffect(() => {
    const updateSize = () => {
      if (mapRef.current) {
        const rect = mapRef.current.getBoundingClientRect();
        const s = Math.min(rect.width, rect.height, window.innerHeight - 120);
        setMapSize(Math.max(400, s));
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleMapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!selectedPlayerId || !round) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      if (x < 0 || x > 1 || y < 0 || y > 1) return;

      if (clickState === 'position') {
        setPendingPos({ x, y });
        setClickState('facing');
      } else if (pendingPos) {
        // Second click: compute facing angle from pending position to this click
        const dx = x - pendingPos.x;
        const dy = y - pendingPos.y;
        const facing = Math.atan2(dy, dx);

        // Compute tick from phase time
        const phaseTimes = round.phase_times[currentPhase];
        const existingWps = waypoints[currentPhase]?.[selectedPlayerId] ?? [];
        const phaseStart = phaseTimes[0];
        const phaseEnd = phaseTimes[1];
        const fraction = existingWps.length / 10; // spread across phase
        const timeSec = phaseStart + (phaseEnd - phaseStart) * Math.min(fraction, 0.95);
        const tick = Math.round(timeSec / 0.128);

        addWaypoint(currentPhase, selectedPlayerId, {
          tick,
          x: Math.round(pendingPos.x * 10000) / 10000,
          y: Math.round(pendingPos.y * 10000) / 10000,
          facing: Math.round(facing * 1000) / 1000,
        });

        setPendingPos(null);
        setClickState('position');
      }
    },
    [selectedPlayerId, round, clickState, pendingPos, currentPhase, waypoints, addWaypoint],
  );

  // Right-click to cancel facing / undo
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (clickState === 'facing') {
        setPendingPos(null);
        setClickState('position');
      }
    },
    [clickState],
  );

  // Phase navigation
  const currentPhaseIdx = PHASES.indexOf(currentPhase);
  const nextPhase = () => {
    if (currentPhaseIdx < PHASES.length - 1) setCurrentPhase(PHASES[currentPhaseIdx + 1]);
  };

  // Execute
  const handleExecute = async () => {
    if (!round) return;
    setIsLoading(true);
    setError(null);
    try {
      const plans: Record<string, Array<{ player_id: string; waypoints: Array<{ tick: number; x: number; y: number; facing: number }> }>> = {};
      for (const phase of PHASES) {
        plans[phase] = round.teammates.map((t) => ({
          player_id: t.player_id,
          waypoints: waypoints[phase]?.[t.player_id] ?? [],
        }));
      }

      const result = await strategyApi.execute({ round_id: round.round_id, side: round.user_side, plans });
      setResult(result);
      setPageState('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!round) return null;

  const mapData = MAP_DATA[round.map_name.toLowerCase()];

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-abyss)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3" style={{
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-default)',
      }}>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="text-sm font-semibold uppercase tracking-wider" style={{
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-rajdhani)',
        }}>
          Tactical Planner
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleGhosts}
            className="text-xs px-2.5 py-1 transition-colors"
            style={{
              background: showGhosts ? 'rgba(185,103,255,0.15)' : 'var(--bg-elevated)',
              border: `1px solid ${showGhosts ? 'var(--neon-purple)' : 'var(--border-default)'}`,
              color: showGhosts ? 'var(--neon-purple)' : 'var(--text-tertiary)',
              clipPath: 'var(--clip-corner-sm)',
              fontFamily: 'var(--font-rajdhani)',
              fontWeight: 600,
            }}
          >
            Pro Paths {showGhosts ? 'ON' : 'OFF'}
          </button>
          <span className="text-sm capitalize" style={{
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-rajdhani)',
          }}>
            {round.map_name} ({round.user_side})
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Phase Timeline */}
        <div className="w-[180px] flex-shrink-0 p-3 overflow-y-auto" style={{ borderRight: '1px solid var(--border-default)' }}>
          <div className="text-xs uppercase tracking-wider mb-2 px-1" style={{
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-rajdhani)',
          }}>Phases</div>
          <PhaseTimeline />
        </div>

        {/* Center: Map */}
        <div ref={mapRef} className="flex-1 flex items-center justify-center p-4 min-w-0 overflow-hidden">
          <div
            className="relative overflow-hidden"
            style={{
              width: mapSize,
              height: mapSize,
              cursor: clickState === 'position' ? 'crosshair' : 'pointer',
              background: 'var(--bg-primary)',
              clipPath: 'var(--clip-corner)',
            }}
            onClick={handleMapClick}
            onContextMenu={handleContextMenu}
          >
            {/* Map image */}
            <img
              src={`/maps/${round.map_name.toLowerCase()}.png`}
              alt={round.map_name}
              className="absolute inset-0 w-full h-full object-contain"
              style={{ filter: 'brightness(0.7)' }}
            />

            {/* Sites */}
            {mapData && Object.entries(mapData.sites).map(([name, site]) => (
              <div
                key={name}
                className="absolute flex items-center justify-center"
                style={{
                  left: `${site.center[0] * 100}%`,
                  top: `${site.center[1] * 100}%`,
                  width: `${site.radius * 2 * 100}%`,
                  height: `${site.radius * 2 * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  border: '2px solid rgba(255,230,0,0.3)',
                  borderRadius: '50%',
                }}
              >
                <span className="text-xs font-bold" style={{ color: 'rgba(255,230,0,0.6)' }}>{name}</span>
              </div>
            ))}

            {/* Pending position indicator */}
            {pendingPos && (
              <div
                className="absolute w-4 h-4 animate-pulse pointer-events-none"
                style={{
                  left: `${pendingPos.x * 100}%`,
                  top: `${pendingPos.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  border: '2px solid var(--text-primary)',
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                }}
              />
            )}

            {/* Waypoints overlay */}
            <WaypointOverlay width={mapSize} height={mapSize} />

            {/* Click mode hint */}
            <div className="absolute bottom-2 left-2 text-xs pointer-events-none" style={{
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-share-tech-mono)',
            }}>
              {clickState === 'position'
                ? 'Click to place position'
                : 'Click to set facing direction (right-click to cancel)'}
            </div>
          </div>
        </div>

        {/* Right: Player List */}
        <div className="w-[200px] flex-shrink-0 p-3 overflow-y-auto" style={{ borderLeft: '1px solid var(--border-default)' }}>
          <div className="text-xs uppercase tracking-wider mb-2 px-1" style={{
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-rajdhani)',
          }}>Players</div>
          <PlayerPlanList />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-5 py-3" style={{
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-default)',
      }}>
        <div className="text-sm" style={{
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-rajdhani)',
        }}>
          Phase {currentPhaseIdx + 1}/4: {PHASE_LABELS[currentPhase]}
        </div>
        <div className="flex items-center gap-3">
          {currentPhaseIdx < PHASES.length - 1 && (
            <button
              onClick={nextPhase}
              className="btn-tactical flex items-center gap-1.5 px-4 py-2 text-sm"
            >
              Next Phase
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleExecute}
            disabled={isLoading}
            className="btn-c9 flex items-center gap-2 px-6 py-2 font-medium disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Execute!
              </>
            )}
          </button>
        </div>
        {error && <div className="text-xs" style={{ color: 'var(--val-red)' }}>{error}</div>}
      </div>
    </div>
  );
}
