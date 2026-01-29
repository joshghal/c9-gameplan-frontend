'use client';

import { useRef, useEffect, memo } from 'react';
import { useHeatmapData, processHeatmapData } from '@/hooks/useHeatmapData';
import { useVisualizationStore } from '@/store/visualization';
import { useSimulationStore } from '@/store/simulation';
import {
  prepareHeatmapCanvas,
  renderHeatmap,
  drawHeatmapLegend,
  ATTACK_GRADIENT,
  DEFENSE_GRADIENT,
} from '@/lib/canvas/heatmap';

interface HeatmapLayerProps {
  width: number;
  height: number;
}

function HeatmapLayerComponent({ width, height }: HeatmapLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { mapName } = useSimulationStore();
  const { overlays, heatmapSide, heatmapOpacity } = useVisualizationStore();

  const { data, isLoading } = useHeatmapData({
    mapName,
    side: heatmapSide,
    enabled: overlays.heatmap,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || !overlays.heatmap) return;

    const ctx = prepareHeatmapCanvas(canvas, width, height);
    if (!ctx) return;

    // Process and render heatmap
    const processed = processHeatmapData(data, width, height);

    renderHeatmap(ctx, {
      grid: processed.normalizedGrid,
      width,
      height,
    }, {
      opacity: heatmapOpacity * 0.5,  // Reduce opacity to let map show through
      side: heatmapSide,
      blur: 4,  // Increased blur for smoother rendering on 20x20 grid
    });

    // Draw legend
    const gradient = heatmapSide === 'attack' ? ATTACK_GRADIENT : DEFENSE_GRADIENT;
    drawHeatmapLegend(ctx, 10, height - 30, 150, 20, gradient, {
      low: 'Rare',
      high: 'Frequent',
    });
  }, [data, width, height, overlays.heatmap, heatmapOpacity, heatmapSide]);

  // Clear canvas when heatmap is disabled
  useEffect(() => {
    if (!overlays.heatmap && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
      }
    }
  }, [overlays.heatmap, width, height]);

  if (!overlays.heatmap) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        width,
        height,
        opacity: isLoading ? 0.5 : 1,
        transition: 'opacity 0.3s ease',
      }}
    />
  );
}

export const HeatmapLayer = memo(HeatmapLayerComponent);
