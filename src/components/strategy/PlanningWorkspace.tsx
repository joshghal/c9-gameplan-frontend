'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Play, Loader2, Check } from 'lucide-react';
import { useStrategyStore, PHASES, PHASE_LABELS } from '@/store/strategy';
import { PlayerPlanList, PLAYER_COLORS } from './PlayerPlanList';
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

// Side color helper
function sideColor(side: string) {
  return side === 'attack' ? 'var(--val-red)' : 'var(--neon-cyan)';
}

export function PlanningWorkspace() {
  const {
    round, activePhase, currentPhase, selectedPlayerId,
    addWaypoint, waypoints, isLoading, error, reset,
    showGhosts, toggleGhosts, executePhase, executedPhases,
    currentCheckpoint,
  } = useStrategyStore();
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapSize, setMapSize] = useState(600);

  // Dynamic map sizing
  useEffect(() => {
    const updateSize = () => {
      if (mapRef.current) {
        const rect = mapRef.current.getBoundingClientRect();
        const s = Math.min(rect.width, rect.height, window.innerHeight - 180);
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

      const phaseTimes = round.phase_times[currentPhase];
      const existingWps = waypoints[currentPhase]?.[selectedPlayerId] ?? [];
      const phaseStart = phaseTimes[0];
      const phaseEnd = phaseTimes[1];
      const fraction = existingWps.length / 10;
      const timeSec = phaseStart + (phaseEnd - phaseStart) * Math.min(fraction, 0.95);
      const tick = Math.round(timeSec / 0.128);

      addWaypoint(currentPhase, selectedPlayerId, {
        tick,
        x: Math.round(x * 10000) / 10000,
        y: Math.round(y * 10000) / 10000,
        facing: 0, // Auto-determined by engine
      });
    },
    [selectedPlayerId, round, currentPhase, waypoints, addWaypoint],
  );

  if (!round) return null;

  const mapData = MAP_DATA[round.map_name.toLowerCase()];
  const phaseIdx = PHASES.indexOf(activePhase);

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

      {/* Phase progress bar */}
      <div className="flex items-center gap-0 px-5 py-2" style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-default)',
      }}>
        {PHASES.map((phase, idx) => {
          const isCompleted = executedPhases.includes(phase);
          const isActive = phase === activePhase;
          const isPast = idx < phaseIdx;
          return (
            <div key={phase} className="flex items-center">
              {idx > 0 && (
                <div className="w-8 h-px mx-1" style={{
                  background: isPast || isCompleted ? 'var(--c9-blue)' : 'var(--border-default)',
                }} />
              )}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm" style={{
                background: isActive ? 'rgba(0,180,216,0.12)' : 'transparent',
                border: isActive ? '1px solid var(--c9-blue)' : '1px solid transparent',
              }}>
                <div className="w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold" style={{
                  background: isCompleted ? 'var(--c9-blue)' : isActive ? 'rgba(0,180,216,0.3)' : 'var(--bg-elevated)',
                  color: isCompleted || isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  border: isActive && !isCompleted ? '1px solid var(--c9-blue)' : 'none',
                }}>
                  {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
                </div>
                <span className="text-xs font-semibold" style={{
                  color: isActive ? 'var(--c9-blue)' : isCompleted ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                  fontFamily: 'var(--font-rajdhani)',
                }}>
                  {PHASE_LABELS[phase]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center: Map */}
        <div ref={mapRef} className="flex-1 flex items-center justify-center p-4 min-w-0 overflow-hidden">
          <div
            className="relative overflow-hidden"
            style={{
              width: mapSize,
              height: mapSize,
              cursor: 'crosshair',
              background: 'var(--bg-primary)',
              clipPath: 'var(--clip-corner)',
            }}
            onClick={handleMapClick}
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

            {/* Spawn positions (phase 1, no checkpoint) */}
            {!currentCheckpoint && round.teammates.map((t, i) => {
              const color = PLAYER_COLORS[i];
              return (
                <div
                  key={`spawn-${t.player_id}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${t.spawn[0] * 100}%`,
                    top: `${t.spawn[1] * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                  }}
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{
                    background: color,
                    border: i === 0 && round.user_side === 'attack' ? '2px solid var(--val-red)' : '2px solid white',
                    boxShadow: `0 0 8px ${color}88`,
                  }}>
                    {i === 0 && round.user_side === 'attack' && (
                      <span className="text-[7px] font-bold" style={{ color: 'white' }}>S</span>
                    )}
                  </div>
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[9px] whitespace-nowrap font-semibold" style={{
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-share-tech-mono)',
                    textShadow: '0 0 4px rgba(0,0,0,0.9)',
                  }}>
                    {t.name}
                  </div>
                </div>
              );
            })}

            {/* Inherited positions from checkpoint (phases 2-4) */}
            {currentCheckpoint && currentCheckpoint.players.map((p) => {
              if (p.side !== round.user_side) return null;
              const playerIdx = round.teammates.findIndex((t) => t.player_id === p.player_id);
              const color = playerIdx >= 0 ? PLAYER_COLORS[playerIdx] : sideColor(p.side);
              return (
                <div
                  key={`inherited-${p.player_id}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${p.x * 100}%`,
                    top: `${p.y * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                    opacity: p.is_alive ? 1 : 0.4,
                  }}
                >
                  {/* Outer glow ring (alive only) */}
                  {p.is_alive && (
                    <div className="absolute inset-0 w-7 h-7 rounded-full" style={{
                      background: `radial-gradient(circle, ${color}44 0%, transparent 70%)`,
                      transform: 'translate(-50%, -50%) translate(50%, 50%)',
                    }} />
                  )}
                  {/* Main dot */}
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{
                    background: p.is_alive ? color : 'var(--bg-elevated)',
                    border: p.is_alive ? '2px solid white' : '2px solid var(--val-red)',
                    boxShadow: p.is_alive ? `0 0 8px ${color}88` : 'none',
                  }}>
                    {!p.is_alive && (
                      <span className="text-[8px] font-bold" style={{ color: 'var(--val-red)' }}>X</span>
                    )}
                  </div>
                  {/* Spike carrier badge */}
                  {p.has_spike && p.is_alive && (
                    <div className="absolute -top-2 -right-2 text-[8px] font-bold leading-none"
                      style={{ color: '#ffe600', textShadow: '0 0 4px rgba(0,0,0,0.9)' }}>
                      ⬡
                    </div>
                  )}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[9px] whitespace-nowrap font-semibold" style={{
                    color: p.is_alive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontFamily: 'var(--font-share-tech-mono)',
                    textShadow: '0 0 4px rgba(0,0,0,0.9)',
                    textDecoration: p.is_alive ? 'none' : 'line-through',
                  }}>
                    {p.name || p.player_id.slice(0, 6)}
                  </div>
                </div>
              );
            })}

            {/* Planted spike indicator from checkpoint */}
            {currentCheckpoint?.spike_planted && currentCheckpoint.spike_site && mapData?.sites[currentCheckpoint.spike_site] && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${mapData.sites[currentCheckpoint.spike_site].center[0] * 100}%`,
                  top: `${mapData.sites[currentCheckpoint.spike_site].center[1] * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 20,
                }}
              >
                <div className="text-lg animate-pulse" style={{
                  color: '#ff6b00',
                  textShadow: '0 0 12px rgba(255,107,0,0.8)',
                }}>⬡</div>
                <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[8px] uppercase font-bold whitespace-nowrap tracking-wider"
                  style={{ color: '#ff6b00', fontFamily: 'var(--font-rajdhani)', textShadow: '0 0 4px rgba(0,0,0,0.9)' }}>
                  Planted
                </div>
              </div>
            )}

            {/* Waypoints overlay */}
            <WaypointOverlay width={mapSize} height={mapSize} />

            {/* Click hint */}
            <div className="absolute bottom-2 left-2 text-xs pointer-events-none" style={{
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-share-tech-mono)',
            }}>
              Click to place waypoint
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
          Phase {phaseIdx + 1}/4: {PHASE_LABELS[activePhase]}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={executePhase}
            disabled={isLoading}
            className="btn-c9 flex items-center gap-2 px-6 py-2 font-medium disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Execute Phase
              </>
            )}
          </button>
        </div>
        {error && <div className="text-xs" style={{ color: 'var(--val-red)' }}>{error}</div>}
      </div>
    </div>
  );
}
