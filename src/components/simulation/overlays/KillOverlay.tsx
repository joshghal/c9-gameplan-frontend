'use client';

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKillLocations, processKillClusters, getClusterColor } from '@/hooks/useKillLocations';
import { useVisualizationStore } from '@/store/visualization';
import { useSimulationStore } from '@/store/simulation';
import { Skull, Target, X } from 'lucide-react';

interface KillOverlayProps {
  width: number;
  height: number;
}

function KillOverlayComponent({ width, height }: KillOverlayProps) {
  const { mapName } = useSimulationStore();
  const { overlays, showKills, showDeaths, killClusterRadius } = useVisualizationStore();
  const [hoveredCluster, setHoveredCluster] = useState<string | null>(null);

  const { data, isLoading } = useKillLocations({
    mapName,
    enabled: overlays.kills,
  });

  if (!overlays.kills || !data) return null;

  const clusters = processKillClusters(data, width, height);

  return (
    <svg
      className="absolute inset-0"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ pointerEvents: 'none' }}
    >
      <defs>
        {/* Glow filters */}
        <filter id="kill-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="death-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <AnimatePresence>
        {clusters.map((cluster) => (
          <motion.g
            key={cluster.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ pointerEvents: 'all' }}
            onMouseEnter={() => setHoveredCluster(cluster.id)}
            onMouseLeave={() => setHoveredCluster(null)}
          >
            {/* Cluster area */}
            <motion.circle
              cx={cluster.centerX}
              cy={cluster.centerY}
              r={cluster.radius}
              fill={getClusterColor(cluster)}
              stroke={cluster.dominantSide === 'attack' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)'}
              strokeWidth={2}
              strokeDasharray="4 2"
              animate={{
                scale: hoveredCluster === cluster.id ? 1.1 : 1,
              }}
              transition={{ duration: 0.2 }}
            />

            {/* Kill markers */}
            {showKills && (
              <motion.g
                filter="url(#kill-glow)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <circle
                  cx={cluster.centerX - 10}
                  cy={cluster.centerY}
                  r={6 + cluster.killCount * 0.5}
                  fill="rgba(239, 68, 68, 0.8)"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth={1}
                />
                <text
                  x={cluster.centerX - 10}
                  y={cluster.centerY + 3}
                  fill="white"
                  fontSize={8}
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {cluster.killCount}
                </text>
              </motion.g>
            )}

            {/* Death markers */}
            {showDeaths && (
              <motion.g
                filter="url(#death-glow)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <circle
                  cx={cluster.centerX + 10}
                  cy={cluster.centerY}
                  r={6 + cluster.deathCount * 0.5}
                  fill="rgba(107, 114, 128, 0.8)"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth={1}
                />
                <text
                  x={cluster.centerX + 10}
                  y={cluster.centerY + 3}
                  fill="white"
                  fontSize={8}
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {cluster.deathCount}
                </text>
              </motion.g>
            )}

            {/* Tooltip */}
            <AnimatePresence>
              {hoveredCluster === cluster.id && (
                <motion.g
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <rect
                    x={cluster.centerX - 60}
                    y={cluster.centerY - cluster.radius - 40}
                    width={120}
                    height={30}
                    rx={4}
                    fill="rgba(0, 0, 0, 0.9)"
                  />
                  <text
                    x={cluster.centerX}
                    y={cluster.centerY - cluster.radius - 28}
                    fill="white"
                    fontSize={10}
                    textAnchor="middle"
                  >
                    K: {cluster.killCount} | D: {cluster.deathCount}
                  </text>
                  <text
                    x={cluster.centerX}
                    y={cluster.centerY - cluster.radius - 16}
                    fill={cluster.netKills > 0 ? '#22c55e' : '#ef4444'}
                    fontSize={10}
                    textAnchor="middle"
                  >
                    Net: {cluster.netKills > 0 ? '+' : ''}{cluster.netKills}
                  </text>
                </motion.g>
              )}
            </AnimatePresence>
          </motion.g>
        ))}
      </AnimatePresence>

      {/* Legend */}
      <g transform={`translate(${width - 100}, 10)`}>
        <rect x={0} y={0} width={90} height={50} rx={4} fill="rgba(0,0,0,0.6)" />
        <circle cx={15} cy={15} r={5} fill="rgba(239, 68, 68, 0.8)" />
        <text x={25} y={18} fill="white" fontSize={10}>Kills</text>
        <circle cx={15} cy={35} r={5} fill="rgba(107, 114, 128, 0.8)" />
        <text x={25} y={38} fill="white" fontSize={10}>Deaths</text>
      </g>
    </svg>
  );
}

export const KillOverlay = memo(KillOverlayComponent);
