'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi, type KillClusterData } from '@/lib/api';

interface UseKillLocationsOptions {
  mapName: string;
  side?: 'attack' | 'defense';
  minKills?: number;
  enabled?: boolean;
}

export function useKillLocations({
  mapName,
  side,
  minKills = 3,
  enabled = true,
}: UseKillLocationsOptions) {
  return useQuery({
    queryKey: ['killClusters', mapName, side, minKills],
    queryFn: async () => {
      const response = await analyticsApi.getKillClusters(mapName, side, minKills);
      return response.data;
    },
    enabled: enabled && !!mapName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export interface ProcessedCluster {
  id: string;
  centerX: number;
  centerY: number;
  radius: number;
  killCount: number;
  deathCount: number;
  dominantSide: 'attack' | 'defense';
  netKills: number; // kills - deaths (positive = good for attacker)
  intensity: number; // 0-1, how active this spot is
}

/**
 * Process kill cluster data for rendering.
 */
export function processKillClusters(
  data: KillClusterData,
  canvasWidth: number,
  canvasHeight: number
): ProcessedCluster[] {
  const maxTotal = Math.max(
    ...data.clusters.map(c => c.kill_count + c.death_count),
    1
  );

  return data.clusters.map((cluster, index) => ({
    id: `cluster-${index}`,
    centerX: cluster.center_x * canvasWidth,
    centerY: cluster.center_y * canvasHeight,
    radius: cluster.radius * Math.min(canvasWidth, canvasHeight),
    killCount: cluster.kill_count,
    deathCount: cluster.death_count,
    dominantSide: cluster.dominant_side as 'attack' | 'defense',
    netKills: cluster.kill_count - cluster.death_count,
    intensity: (cluster.kill_count + cluster.death_count) / maxTotal,
  }));
}

/**
 * Get color for kill marker based on side.
 */
export function getKillColor(side: 'attack' | 'defense', isKill: boolean): string {
  if (side === 'attack') {
    return isKill ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.4)';
  }
  return isKill ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.4)';
}

/**
 * Get cluster color based on which side benefits.
 */
export function getClusterColor(cluster: ProcessedCluster): string {
  const intensity = cluster.intensity;

  if (cluster.dominantSide === 'attack') {
    // Red tones for attack-favorable spots
    return `rgba(239, 68, 68, ${0.2 + intensity * 0.4})`;
  } else {
    // Blue tones for defense-favorable spots
    return `rgba(59, 130, 246, ${0.2 + intensity * 0.4})`;
  }
}

/**
 * Generate tooltip content for a cluster.
 */
export function getClusterTooltip(cluster: ProcessedCluster): string {
  const netKills = cluster.netKills;
  const netSign = netKills > 0 ? '+' : '';

  return `Kills: ${cluster.killCount} | Deaths: ${cluster.deathCount} | Net: ${netSign}${netKills}`;
}

/**
 * Calculate marker size based on event count.
 */
export function getMarkerSize(count: number, maxCount: number): number {
  const minSize = 6;
  const maxSize = 16;
  const normalized = count / Math.max(maxCount, 1);

  return minSize + normalized * (maxSize - minSize);
}
