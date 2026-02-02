'use client';

import { useStrategyStore, PHASES, type Phase } from '@/store/strategy';
import { PLAYER_COLORS } from './PlayerPlanList';
import type { Waypoint, PhaseCheckpoint } from '@/lib/strategy-api';

interface WaypointOverlayProps {
  width: number;
  height: number;
}

const PHASE_OPACITY: Record<Phase, number> = {
  setup: 1,
  mid_round: 0.7,
  execute: 0.5,
  post_plant: 0.3,
};

export function WaypointOverlay({ width, height }: WaypointOverlayProps) {
  const { round, waypoints, currentPhase, selectedPlayerId, showGhosts, currentCheckpoint } = useStrategyStore();

  if (!round) return null;

  const toPixel = (x: number, y: number) => [x * width, y * height];

  // Build dead player set from checkpoint
  const deadPlayerIds = new Set<string>();
  if (currentCheckpoint) {
    for (const p of currentCheckpoint.players) {
      if (!p.is_alive) deadPlayerIds.add(p.player_id);
    }
  }

  // Draw all phases, current phase on top
  const phasesToDraw = [...PHASES].sort((a, b) => {
    if (a === currentPhase) return 1;
    if (b === currentPhase) return -1;
    return 0;
  });

  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height}>
      {phasesToDraw.map((phase) => {
        const isCurrentPhase = phase === currentPhase;
        const phaseWps = waypoints[phase] ?? {};

        return round.teammates.map((t, playerIdx) => {
          // Skip dead players
          if (deadPlayerIds.has(t.player_id)) return null;

          const wps = phaseWps[t.player_id] ?? [];
          if (wps.length === 0) return null;

          const color = PLAYER_COLORS[playerIdx];
          const isSelected = t.player_id === selectedPlayerId;
          const opacity = isCurrentPhase ? 1 : PHASE_OPACITY[phase] * 0.5;

          // Get previous phase's last waypoint, checkpoint position, or spawn as start
          const prevPos = getPreviousPosition(t, phase, waypoints, round.teammates[playerIdx].spawn, currentCheckpoint);
          const allPoints = [prevPos, ...wps];

          return (
            <g key={`${phase}-${t.player_id}`} opacity={opacity}>
              {/* Path lines */}
              {allPoints.length > 1 && (
                <polyline
                  points={allPoints.map((p) => toPixel(p.x, p.y).join(',')).join(' ')}
                  fill="none"
                  stroke={color}
                  strokeWidth={isSelected && isCurrentPhase ? 2.5 : 1.5}
                  strokeDasharray={isCurrentPhase ? 'none' : '4,4'}
                  strokeOpacity={0.6}
                />
              )}

              {/* Waypoint dots */}
              {wps.map((wp, i) => {
                const [px, py] = toPixel(wp.x, wp.y);
                return (
                  <g key={i}>
                    <circle
                      cx={px}
                      cy={py}
                      r={isSelected && isCurrentPhase ? 6 : 4}
                      fill={color}
                      stroke="white"
                      strokeWidth={1}
                    />
                    {/* Index label */}
                    {isCurrentPhase && isSelected && (
                      <text
                        x={px + 9}
                        y={py - 9}
                        fontSize={10}
                        fill="white"
                        fontWeight="bold"
                      >
                        {i + 1}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        });
      })}

      {/* Ghost paths (all phases, current phase highlighted) */}
      {showGhosts && round.ghost_paths?.map((ghost, playerIdx) => {
        const color = PLAYER_COLORS[playerIdx];
        return phasesToDraw.map((phase) => {
          const seg = ghost.segments[phase] ?? [];
          if (seg.length < 2) return null;
          const isCurrentPhase = phase === currentPhase;
          const opacity = isCurrentPhase ? 0.4 : PHASE_OPACITY[phase] * 0.2;

          // Connect to previous phase's last point for continuity
          const phaseIdx = PHASES.indexOf(phase);
          let connectPoint: { x: number; y: number } | null = null;
          if (phaseIdx > 0) {
            for (let i = phaseIdx - 1; i >= 0; i--) {
              const prevSeg = ghost.segments[PHASES[i]] ?? [];
              if (prevSeg.length > 0) {
                connectPoint = prevSeg[prevSeg.length - 1];
                break;
              }
            }
          }
          const allPoints = connectPoint ? [connectPoint, ...seg] : seg;

          return (
            <g key={`ghost-${ghost.player_id}-${phase}`} opacity={opacity}>
              <polyline
                points={allPoints.map((p) => toPixel(p.x, p.y).join(',')).join(' ')}
                fill="none"
                stroke={color}
                strokeWidth={isCurrentPhase ? 2 : 1.5}
                strokeDasharray={isCurrentPhase ? '6,4' : '3,6'}
              />
              {isCurrentPhase && seg.filter((_, i) => i % 2 === 0).map((p, i) => {
                const [px, py] = toPixel(p.x, p.y);
                return (
                  <circle key={i} cx={px} cy={py} r={2.5} fill={color} opacity={0.5} />
                );
              })}
            </g>
          );
        });
      })}

    </svg>
  );
}

function getPreviousPosition(
  teammate: { player_id: string; spawn: [number, number] },
  currentPhase: Phase,
  waypoints: Record<string, Record<string, Waypoint[]>>,
  spawn: [number, number],
  checkpoint: PhaseCheckpoint | null,
): { x: number; y: number } {
  const phaseIdx = PHASES.indexOf(currentPhase);

  // Look backwards through previous phases for the last waypoint
  for (let i = phaseIdx - 1; i >= 0; i--) {
    const prevPhaseWps = waypoints[PHASES[i]]?.[teammate.player_id];
    if (prevPhaseWps && prevPhaseWps.length > 0) {
      const last = prevPhaseWps[prevPhaseWps.length - 1];
      return { x: last.x, y: last.y };
    }
  }

  // Use checkpoint position if available (from previous phase execution)
  if (checkpoint) {
    const cp = checkpoint.players.find((p) => p.player_id === teammate.player_id);
    if (cp) return { x: cp.x, y: cp.y };
  }

  // Fallback to spawn
  return { x: spawn[0], y: spawn[1] };
}
