'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useSimulationStore } from '@/store/simulation';
import { useCameraStore } from '@/store/camera';
import { normalizedToPixel } from '@/lib/utils';
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
  ascent: {
    sites: {
      A: { center: [0.29, 0.15], radius: 0.08 },
      B: { center: [0.27, 0.79], radius: 0.08 },
    },
    spawns: { attack: [0.85, 0.58], defense: [0.15, 0.42] },
  },
  bind: {
    sites: {
      A: { center: [0.29, 0.27], radius: 0.08 },
      B: { center: [0.73, 0.33], radius: 0.08 },
    },
    spawns: { attack: [0.55, 0.90], defense: [0.55, 0.15] },
  },
  split: {
    sites: {
      A: { center: [0.33, 0.09], radius: 0.08 },
      B: { center: [0.32, 0.82], radius: 0.08 },
    },
    spawns: { attack: [0.82, 0.55], defense: [0.15, 0.55] },
  },
  icebox: {
    sites: {
      A: { center: [0.61, 0.21], radius: 0.08 },
      B: { center: [0.71, 0.81], radius: 0.10 },
    },
    spawns: { attack: [0.12, 0.58], defense: [0.92, 0.55] },
  },
  breeze: {
    sites: {
      A: { center: [0.15, 0.29], radius: 0.09 },
      B: { center: [0.87, 0.45], radius: 0.08 },
    },
    spawns: { attack: [0.50, 0.85], defense: [0.50, 0.20] },
  },
  fracture: {
    sites: {
      A: { center: [0.08, 0.45], radius: 0.08 },
      B: { center: [0.92, 0.45], radius: 0.08 },
    },
    spawns: { attack: [0.48, 0.87], defense: [0.60, 0.42] },
  },
  pearl: {
    sites: {
      A: { center: [0.18, 0.40], radius: 0.08 },
      B: { center: [0.85, 0.31], radius: 0.08 },
    },
    spawns: { attack: [0.52, 0.90], defense: [0.52, 0.10] },
  },
  sunset: {
    sites: {
      A: { center: [0.08, 0.40], radius: 0.08 },
      B: { center: [0.82, 0.38], radius: 0.08 },
    },
    spawns: { attack: [0.55, 0.93], defense: [0.55, 0.12] },
  },
  abyss: {
    sites: {
      A: { center: [0.40, 0.19], radius: 0.08 },
      B: { center: [0.40, 0.77], radius: 0.08 },
    },
    spawns: { attack: [0.88, 0.42], defense: [0.12, 0.45] },
  },
  corrode: {
    sites: {
      A: { center: [0.40, 0.19], radius: 0.08 },
      B: { center: [0.40, 0.77], radius: 0.08 },
    },
    spawns: { attack: [0.85, 0.50], defense: [0.10, 0.50] },
  },
  // === 3-SITE MAPS ===
  haven: {
    sites: {
      A: { center: [0.38, 0.14], radius: 0.07 },
      B: { center: [0.40, 0.50], radius: 0.07 },
      C: { center: [0.36, 0.84], radius: 0.07 },
    },
    spawns: { attack: [0.87, 0.55], defense: [0.12, 0.40] },
  },
  lotus: {
    sites: {
      A: { center: [0.10, 0.45], radius: 0.07 },
      B: { center: [0.47, 0.42], radius: 0.07 },
      C: { center: [0.87, 0.32], radius: 0.07 },
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
  const mapLayerRef = useRef<HTMLDivElement>(null);
  const { positions, spikePlanted, spikeSite, droppedSpikePosition, mapName, phase, status } = useSimulationStore();
  const { x: camX, y: camY, zoom, isTheaterMode, highlightedPlayers } = useCameraStore();
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);
  const [mapImageLoaded, setMapImageLoaded] = useState(false);

  // GSAP camera animation — only transforms the map layer
  useEffect(() => {
    if (!mapLayerRef.current || !isTheaterMode) return;
    gsap.to(mapLayerRef.current, {
      scale: zoom,
      x: (0.5 - camX) * width,
      y: (0.5 - camY) * height,
      duration: 0.8,
      ease: 'power2.inOut',
    });
  }, [camX, camY, zoom, isTheaterMode, width, height]);

  // Reset when leaving theater mode
  useEffect(() => {
    if (!mapLayerRef.current || isTheaterMode) return;
    gsap.to(mapLayerRef.current, { scale: 1, x: 0, y: 0, duration: 0.5, ease: 'power2.out' });
  }, [isTheaterMode]);

  const hasDimming = isTheaterMode && highlightedPlayers.length > 0;

  // Get map-specific data
  const mapData = MAP_DATA[mapName.toLowerCase()] || DEFAULT_MAP_DATA;

  // Map image URL (from public/maps folder)
  const mapImageUrl = `/maps/${mapName.toLowerCase()}.png`;

  return (
    // Outer container: clips zoomed content, holds HUD overlay
    <div
      className="relative rounded-xl overflow-hidden"
      style={{ width, height, background: 'rgba(10,14,23,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      {/* Transformable map layer — GSAP zooms/pans this */}
      <div
        ref={mapLayerRef}
        className="absolute inset-0"
        style={{ transformOrigin: 'center center' }}
      >
        {/* Map background image */}
        <img
          src={mapImageUrl}
          alt={`${mapName} map`}
          className="absolute inset-0 w-full h-full object-contain"
          style={{ filter: 'brightness(0.7)' }}
          onLoad={() => setMapImageLoaded(true)}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />

        {/* Fallback gradient background */}
        {!mapImageLoaded && (
          <div className="absolute inset-0" style={{ background: 'rgba(10,14,23,0.5)' }} />
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
          const sizePercent = siteData.radius * 200;
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

        {/* Dropped spike indicator */}
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
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.6, 0.2, 0.6],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute w-10 h-10 border-2 border-yellow-400 rounded-full"
              />
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

        {/* FOV Cones */}
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
            const fovHalf = Math.PI / 4;

            const leftAngle = player.facing_angle - fovHalf;
            const rightAngle = player.facing_angle + fovHalf;
            const leftX = px + Math.cos(leftAngle) * coneLength;
            const leftY = py + Math.sin(leftAngle) * coneLength;
            const rightX = px + Math.cos(rightAngle) * coneLength;
            const rightY = py + Math.sin(rightAngle) * coneLength;

            const fillColor = player.side === 'attack'
              ? 'rgba(239, 68, 68, 0.15)'
              : 'rgba(59, 130, 246, 0.15)';
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
            const teamColor = player.side === 'attack' ? 'var(--val-red)' : 'var(--val-teal)';

            return (
              <motion.div
                key={player.player_id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  x: pixel.x - (player.is_alive ? 8 : 16),
                  y: pixel.y - (player.is_alive ? 8 : 16),
                  scale: player.is_alive ? 1 : 0.5,
                  opacity: !player.is_alive
                    ? 0.3
                    : hasDimming && !highlightedPlayers.includes(player.player_id)
                      ? 0.3
                      : 1,
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
                <div className="relative">
                  {player.is_alive ? (
                    <div
                      className="w-4 h-4"
                      style={{
                        backgroundColor: teamColor,
                        border: '2px solid var(--text-primary)',
                        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                      }}
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: '#6b7280',
                        border: '3px solid #4b5563',
                      }}
                    >
                      <span className="text-white font-bold text-xs">✕</span>
                    </div>
                  )}

                  {/* Spike indicator */}
                  {player.has_spike && (
                    <div
                      className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-yellow-400 rounded-sm"
                      style={{ boxShadow: '0 0 6px rgba(250, 204, 21, 0.8)' }}
                    />
                  )}

                  {/* Highlight ring */}
                  {highlightedPlayers.includes(player.player_id) && (
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0.3, 0.8] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute -inset-1.5 border-2 border-purple-400 rounded-full"
                    />
                  )}
                </div>

                {/* Player name */}
                <div
                  className="absolute top-5 left-1/2 -translate-x-1/2 text-[9px] whitespace-nowrap"
                  style={{
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-share-tech-mono)',
                  }}
                >
                  {player.name ?? player.player_id}
                </div>

                {/* Tooltip on hover */}
                <AnimatePresence>
                  {hoveredPlayer === player.player_id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute left-1/2 -translate-x-1/2 -top-14 bg-black/90 backdrop-blur-sm px-3 py-2 rounded-lg whitespace-nowrap z-50"
                    >
                      <div className="text-sm font-semibold text-white">
                        {player.name ?? player.player_id}
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
      </div>
      {/* END transformable map layer */}

      {/* HUD overlay — NOT affected by GSAP zoom/pan */}
      <div className="absolute inset-0 pointer-events-none z-30">
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
        <div className="absolute bottom-3 right-3 px-2.5 py-1" style={{
          background: 'rgba(6,8,13,0.6)',
          backdropFilter: 'blur(8px)',
          clipPath: 'var(--clip-corner-sm)',
        }}>
          <div className="text-xs font-bold uppercase tracking-wider capitalize" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>{mapName}</div>
        </div>

        {/* Status badges */}
        {(status === 'idle' || status === 'created') && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
            <div className="bg-black/70 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-gray-300">
              Press Play to start
            </div>
          </div>
        )}
        {status === 'completed' && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
            <div className="text-xs uppercase tracking-widest px-3 py-1.5" style={{
              fontFamily: 'var(--font-rajdhani)',
              color: 'var(--c9-cyan)',
              background: 'rgba(6,8,13,0.6)',
              backdropFilter: 'blur(8px)',
              clipPath: 'var(--clip-corner-sm)',
            }}>
              Round Complete
            </div>
          </div>
        )}
        {status === 'paused' && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2">
            <div className="bg-black/70 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-gray-300">
              Paused
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
