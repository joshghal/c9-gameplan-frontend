'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi, type HeatmapData } from '@/lib/api';

interface UseHeatmapDataOptions {
  mapName: string;
  side: 'attack' | 'defense';
  teamId?: string;
  phase?: string;
  enabled?: boolean;
}

export function useHeatmapData({
  mapName,
  side,
  teamId,
  phase,
  enabled = true,
}: UseHeatmapDataOptions) {
  return useQuery({
    queryKey: ['heatmap', mapName, side, teamId, phase],
    queryFn: async () => {
      const response = await analyticsApi.getHeatmap(mapName, side, teamId, phase);
      return response.data;
    },
    enabled: enabled && !!mapName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Process raw heatmap grid data for canvas rendering.
 * Normalizes values and upscales to canvas resolution.
 */
export function processHeatmapData(
  data: HeatmapData,
  canvasWidth: number,
  canvasHeight: number
): {
  grid: number[][];
  normalizedGrid: number[][];
  maxValue: number;
} {
  const { grid } = data;

  // Find max value for normalization
  let maxValue = 0;
  for (const row of grid) {
    for (const val of row) {
      maxValue = Math.max(maxValue, val);
    }
  }

  // Normalize to 0-1
  const normalizedGrid = grid.map(row =>
    row.map(val => (maxValue > 0 ? val / maxValue : 0))
  );

  return {
    grid,
    normalizedGrid,
    maxValue,
  };
}

/**
 * Convert normalized coordinates to grid cell indices.
 */
export function coordsToGridCell(
  x: number,
  y: number,
  gridSize: number
): { row: number; col: number } {
  const col = Math.floor(x * gridSize);
  const row = Math.floor(y * gridSize);

  return {
    row: Math.max(0, Math.min(gridSize - 1, row)),
    col: Math.max(0, Math.min(gridSize - 1, col)),
  };
}

/**
 * Get the heat value at a specific normalized position.
 */
export function getHeatAtPosition(
  grid: number[][],
  x: number,
  y: number
): number {
  if (!grid.length) return 0;

  const gridSize = grid.length;
  const { row, col } = coordsToGridCell(x, y, gridSize);

  return grid[row]?.[col] ?? 0;
}
