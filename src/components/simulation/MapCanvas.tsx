'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulationStore } from '@/store/simulation';
import { normalizedToPixel, TEAM_COLORS, AGENT_COLORS } from '@/lib/utils';
import type { PlayerPosition } from '@/lib/api';

interface MapCanvasProps {
  width?: number;
  height?: number;
}

// Map data matching backend simulation_engine.py MAP_DATA exactly
// Source: backend/app/services/simulation_engine.py lines 338-498
const MAP_DATA: Record<string, {
  sites: Record<string, { center: [number, number]; radius: number }>;
  spawns: { attack: [number, number]; defense: [number, number] };
}> = {
  // === 2-SITE MAPS ===
  // Site coordinates visually verified against map images (olive/green markers)
  ascent: {
    sites: {
      A: { center: [0.29, 0.15], radius: 0.08 },  // A site top-left
      B: { center: [0.27, 0.79], radius: 0.08 },  // B site bottom-left
    },
    spawns: { attack: [0.85, 0.58], defense: [0.15, 0.42] },
  },
  bind: {
    sites: {
      A: { center: [0.29, 0.27], radius: 0.08 },  // A site upper-left
      B: { center: [0.73, 0.33], radius: 0.08 },  // B site upper-right
    },
    spawns: { attack: [0.55, 0.90], defense: [0.55, 0.15] },
  },
  split: {
    sites: {
      A: { center: [0.33, 0.09], radius: 0.08 },  // A site top
      B: { center: [0.32, 0.82], radius: 0.08 },  // B site bottom
    },
    spawns: { attack: [0.82, 0.55], defense: [0.15, 0.55] },
  },
  icebox: {
    sites: {
      A: { center: [0.61, 0.21], radius: 0.08 },  // A site upper-right
      B: { center: [0.71, 0.81], radius: 0.10 },  // B site lower-right
    },
    spawns: { attack: [0.12, 0.58], defense: [0.92, 0.55] },
  },
  breeze: {
    sites: {
      A: { center: [0.15, 0.29], radius: 0.09 },  // A site left
      B: { center: [0.87, 0.45], radius: 0.08 },  // B site right
    },
    spawns: { attack: [0.50, 0.85], defense: [0.50, 0.20] },
  },
  fracture: {
    sites: {
      A: { center: [0.08, 0.45], radius: 0.08 },  // A site far-left
      B: { center: [0.92, 0.45], radius: 0.08 },  // B site far-right
    },
    spawns: { attack: [0.48, 0.87], defense: [0.60, 0.42] },
  },
  pearl: {
    sites: {
      A: { center: [0.18, 0.40], radius: 0.08 },  // A site left
      B: { center: [0.85, 0.31], radius: 0.08 },  // B site upper-right
    },
    spawns: { attack: [0.52, 0.90], defense: [0.52, 0.10] },
  },
  sunset: {
    sites: {
      A: { center: [0.08, 0.40], radius: 0.08 },  // A site far-left
      B: { center: [0.82, 0.38], radius: 0.08 },  // B site right
    },
    spawns: { attack: [0.55, 0.93], defense: [0.55, 0.12] },
  },
  abyss: {
    sites: {
      A: { center: [0.40, 0.19], radius: 0.08 },  // A site top
      B: { center: [0.40, 0.77], radius: 0.08 },  // B site bottom
    },
    spawns: { attack: [0.88, 0.42], defense: [0.12, 0.45] },
  },
  corrode: {
    sites: {
      A: { center: [0.40, 0.19], radius: 0.08 },  // A site top
      B: { center: [0.40, 0.77], radius: 0.08 },  // B site bottom
    },
    spawns: { attack: [0.85, 0.50], defense: [0.10, 0.50] },
  },
  // === 3-SITE MAPS ===
  haven: {
    sites: {
      A: { center: [0.38, 0.14], radius: 0.07 },  // A site top
      B: { center: [0.40, 0.50], radius: 0.07 },  // B site middle
      C: { center: [0.36, 0.84], radius: 0.07 },  // C site bottom
    },
    spawns: { attack: [0.87, 0.55], defense: [0.12, 0.40] },
  },
  lotus: {
    sites: {
      A: { center: [0.10, 0.45], radius: 0.07 },  // A site left
      B: { center: [0.47, 0.42], radius: 0.07 },  // B site middle
      C: { center: [0.87, 0.32], radius: 0.07 },  // C site right
    },
    spawns: { attack: [0.50, 0.85], defense: [0.55, 0.15] },
  },
};

// Default map data for unknown maps (matches backend DEFAULT_MAP_DATA)
const DEFAULT_MAP_DATA = {
  sites: {
    A: { center: [0.3, 0.3] as [number, number], radius: 0.08 },
    B: { center: [0.7, 0.3] as [number, number], radius: 0.08 },
  },
  spawns: { attack: [0.15, 0.8] as [number, number], defense: [0.65, 0.2] as [number, number] },
};

export function MapCanvas({ width = 800, height = 800 }: MapCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { positions, spikePlanted, spikeSite, droppedSpikePosition, mapName, phase, status } = useSimulationStore();
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);
  const [mapImageLoaded, setMapImageLoaded] = useState(false);

  // Get map-specific data
  const mapData = MAP_DATA[mapName.toLowerCase()] || DEFAULT_MAP_DATA;

  // Map image URL (from public/maps folder)
  const mapImageUrl = `/maps/${mapName.toLowerCase()}.png`;

  return (
    <div
      ref={canvasRef}
      className="relative rounded-xl overflow-hidden bg-slate-900"
      style={{ width, height }}
    >
      {/* Map background image */}
      <img
        src={mapImageUrl}
        alt={`${mapName} map`}
        className="absolute inset-0 w-full h-full object-contain"
        style={{ filter: 'brightness(0.7)' }}
        onLoad={() => setMapImageLoaded(true)}
        onError={(e) => {
          // Fallback to gradient if image fails to load
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />

      {/* Fallback gradient background */}
      {!mapImageLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
      )}

      {/* Grid overlay - subtle */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Spawn area indicators */}
      <div
        className="absolute w-16 h-16 border-2 border-dashed border-red-500/30 rounded-full flex items-center justify-center"
        style={{
          left: `${mapData.spawns.attack[0] * 100}%`,
          top: `${mapData.spawns.attack[1] * 100}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <span className="text-red-500/50 text-xs font-bold">ATK</span>
      </div>
      <div
        className="absolute w-16 h-16 border-2 border-dashed border-blue-500/30 rounded-full flex items-center justify-center"
        style={{
          left: `${mapData.spawns.defense[0] * 100}%`,
          top: `${mapData.spawns.defense[1] * 100}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <span className="text-blue-500/50 text-xs font-bold">DEF</span>
      </div>

      {/* Site indicators - dynamic based on map */}
      {Object.entries(mapData.sites).map(([siteName, siteData]) => {
        const [x, y] = siteData.center;
        const sizePercent = siteData.radius * 200; // Convert radius to diameter percentage
        return (
          <div
            key={siteName}
            className="absolute border-2 border-dashed border-yellow-500/50 rounded-lg flex items-center justify-center"
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${Math.max(sizePercent, 8)}%`,
              height: `${Math.max(sizePercent, 8)}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <span className="text-yellow-500 font-bold text-2xl">{siteName}</span>
          </div>
        );
      })}

      {/* Planted spike indicator */}
      <AnimatePresence>
        {spikePlanted && spikeSite && mapData.sites[spikeSite] && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute flex items-center justify-center"
            style={{
              left: `${mapData.sites[spikeSite].center[0] * 100}%`,
              top: `${mapData.sites[spikeSite].center[1] * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 20px rgba(239, 68, 68, 0.5)',
                  '0 0 40px rgba(239, 68, 68, 0.8)',
                  '0 0 20px rgba(239, 68, 68, 0.5)',
                ],
              }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="w-8 h-8 bg-red-500 rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropped spike indicator - spike on ground waiting to be picked up */}
      <AnimatePresence>
        {droppedSpikePosition && !spikePlanted && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute flex items-center justify-center z-20"
            style={{
              left: `${droppedSpikePosition[0] * 100}%`,
              top: `${droppedSpikePosition[1] * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Outer pulsing ring */}
            <motion.div
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.6, 0.2, 0.6],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute w-10 h-10 border-2 border-yellow-400 rounded-full"
            />
            {/* Spike icon */}
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 10px rgba(250, 204, 21, 0.5)',
                  '0 0 20px rgba(250, 204, 21, 0.8)',
                  '0 0 10px rgba(250, 204, 21, 0.5)',
                ],
              }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="w-6 h-6 bg-yellow-400 rounded-sm rotate-45 flex items-center justify-center"
            >
              <span className="text-black font-bold text-xs -rotate-45">S</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOV Cones - rendered as SVG for smooth triangles */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={width}
        height={height}
        style={{ zIndex: 5 }}
      >
        {positions.map((player) => {
          if (!player.is_alive || player.facing_angle === undefined) return null;

          const px = player.x * width;
          const py = player.y * height;
          const coneLength = Math.max(width, height) * 0.075;
          const fovHalf = Math.PI / 4; // 45 degrees = 90 degree FOV

          // Calculate cone endpoints
          const leftAngle = player.facing_angle - fovHalf;
          const rightAngle = player.facing_angle + fovHalf;
          const leftX = px + Math.cos(leftAngle) * coneLength;
          const leftY = py + Math.sin(leftAngle) * coneLength;
          const rightX = px + Math.cos(rightAngle) * coneLength;
          const rightY = py + Math.sin(rightAngle) * coneLength;

          // Color based on side
          const fillColor = player.side === 'attack'
            ? 'rgba(239, 68, 68, 0.15)'  // Red for attack
            : 'rgba(59, 130, 246, 0.15)'; // Blue for defense
          const strokeColor = player.side === 'attack'
            ? 'rgba(239, 68, 68, 0.4)'
            : 'rgba(59, 130, 246, 0.4)';

          return (
            <polygon
              key={`fov-${player.player_id}`}
              points={`${px},${py} ${leftX},${leftY} ${rightX},${rightY}`}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1"
            />
          );
        })}
      </svg>

      {/* Player positions */}
      <AnimatePresence>
        {positions.map((player) => {
          const pixel = normalizedToPixel(player.x, player.y, width, height);
          const color = TEAM_COLORS[player.side] || TEAM_COLORS.attack;
          const agentName = player.agent?.toLowerCase() || 'unknown';
          const agentColor = AGENT_COLORS[agentName] || AGENT_COLORS.unknown;

          return (
            <motion.div
              key={player.player_id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                x: pixel.x - 16,
                y: pixel.y - 16,
                scale: player.is_alive ? 1 : 0.5,
                opacity: player.is_alive ? 1 : 0.3,
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 20,
              }}
              className="absolute cursor-pointer z-10"
              onMouseEnter={() => setHoveredPlayer(player.player_id)}
              onMouseLeave={() => setHoveredPlayer(null)}
            >
              {/* Player marker */}
              <div
                className="relative w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: player.is_alive ? agentColor : '#6b7280',
                  border: `3px solid ${color.primary}`,
                  boxShadow: player.is_alive
                    ? `0 0 15px ${color.primary}40, inset 0 0 10px rgba(255,255,255,0.2)`
                    : 'none',
                }}
              >
                {/* Agent initial */}
                <span className="text-white font-bold text-xs">
                  {player.is_alive ? (agentName[0]?.toUpperCase() || '?') : '✕'}
                </span>

                {/* Spike carrier indicator */}
                {player.has_spike && (
                  <div
                    className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-sm"
                    style={{
                      boxShadow: '0 0 6px rgba(250, 204, 21, 0.8)',
                    }}
                  />
                )}
              </div>

              {/* Health bar */}
              {player.is_alive && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: player.health > 50 ? '#22c55e' : player.health > 25 ? '#eab308' : '#ef4444',
                    }}
                    initial={{ width: '100%' }}
                    animate={{ width: `${player.health}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}

              {/* Tooltip */}
              <AnimatePresence>
                {hoveredPlayer === player.player_id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute left-1/2 -translate-x-1/2 -top-16 bg-black/90 backdrop-blur-sm px-3 py-2 rounded-lg whitespace-nowrap z-50"
                  >
                    <div className="text-sm font-semibold text-white">
                      {player.player_id}
                    </div>
                    <div className="text-xs text-gray-400">
                      {player.agent || 'Unknown'} • {player.health} HP
                    </div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-black/90" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Phase indicator */}
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2">
        <div className="text-xs text-gray-400 uppercase tracking-wider">Phase</div>
        <div className="text-lg font-bold text-white capitalize">{phase.replaceAll('_', ' ')}</div>
      </div>

      {/* Player count indicator */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 flex gap-4">
        <div className="text-center">
          <div className="text-xs text-red-400">ATK</div>
          <div className="text-lg font-bold text-white">
            {positions.filter(p => p.side === 'attack' && p.is_alive).length}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-blue-400">DEF</div>
          <div className="text-lg font-bold text-white">
            {positions.filter(p => p.side === 'defense' && p.is_alive).length}
          </div>
        </div>
      </div>

      {/* Map name */}
      <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2">
        <div className="text-2xl font-bold text-white capitalize">{mapName}</div>
      </div>

      {/* Status indicator - show when not running */}
      {status !== 'running' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/70 backdrop-blur-sm rounded-xl px-8 py-4 text-center">
            <div className="text-xl font-bold text-white mb-2">
              {status === 'idle' ? 'Ready to Simulate' :
               status === 'created' ? 'Simulation Created' :
               status === 'completed' ? 'Round Complete' :
               status === 'paused' ? 'Paused' : status}
            </div>
            <div className="text-sm text-gray-400">
              {status === 'idle' ? 'Configure settings and press Play' :
               status === 'created' ? 'Press Play to start' :
               status === 'completed' ? 'Press Reset to try again' :
               ''}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
