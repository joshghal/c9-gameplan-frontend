'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi, type PredictionData } from '@/lib/api';

interface UsePredictionOptions {
  sessionId: string | null;
  lookaheadMs?: number;
  enabled?: boolean;
  refetchInterval?: number;
}

export function usePrediction({
  sessionId,
  lookaheadMs = 5000,
  enabled = true,
  refetchInterval = 1000,
}: UsePredictionOptions) {
  return useQuery({
    queryKey: ['predictions', sessionId, lookaheadMs],
    queryFn: async () => {
      if (!sessionId) throw new Error('No session ID');
      const response = await analyticsApi.getPredictions(sessionId, lookaheadMs);
      return response.data;
    },
    enabled: enabled && !!sessionId,
    refetchInterval: enabled ? refetchInterval : false,
    staleTime: 500, // Predictions need to be fresh
  });
}

export interface PredictionPoint {
  x: number;
  y: number;
  timestamp_ms: number;
  confidence: number;
}

export interface ProcessedPrediction {
  player_id: string;
  agent: string;
  points: PredictionPoint[];
  overall_confidence: number;
  pathData: string; // SVG path d attribute
}

/**
 * Process prediction data for SVG rendering.
 */
export function processPredictions(
  data: PredictionData,
  canvasWidth: number,
  canvasHeight: number
): ProcessedPrediction[] {
  return data.predictions.map(pred => {
    // Convert normalized coords to pixel coords
    const scaledPoints = pred.points.map(p => ({
      ...p,
      x: p.x * canvasWidth,
      y: p.y * canvasHeight,
    }));

    // Create SVG path
    const pathData = createSmoothPath(scaledPoints);

    return {
      ...pred,
      points: scaledPoints,
      pathData,
    };
  });
}

/**
 * Create a smooth SVG path through points using cubic Bezier curves.
 */
export function createSmoothPath(
  points: Array<{ x: number; y: number }>
): string {
  if (points.length < 2) return '';

  const path = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    // Simple quadratic curve for smoothness
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;

    if (i === 1) {
      path.push(`Q ${prev.x} ${prev.y} ${midX} ${midY}`);
    } else {
      path.push(`T ${midX} ${midY}`);
    }
  }

  // Final point
  const last = points[points.length - 1];
  path.push(`L ${last.x} ${last.y}`);

  return path.join(' ');
}

/**
 * Get color for prediction path based on confidence.
 */
export function getPredictionColor(confidence: number): string {
  // High confidence = more solid, low = more transparent
  const alpha = 0.3 + confidence * 0.5;

  // Color shifts from gray (low) to white (high)
  const gray = Math.round(150 + confidence * 105);

  return `rgba(${gray}, ${gray}, ${gray}, ${alpha})`;
}

/**
 * Get stroke width based on confidence.
 */
export function getPredictionStrokeWidth(confidence: number): number {
  return 2 + confidence * 2;
}

/**
 * Animate prediction path for visual effect.
 */
export function getPathAnimation(index: number): {
  initial: object;
  animate: object;
  transition: object;
} {
  return {
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: {
      pathLength: { duration: 0.8, delay: index * 0.1 },
      opacity: { duration: 0.3 },
    },
  };
}
