'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrediction, processPredictions, getPredictionColor, getPredictionStrokeWidth } from '@/hooks/usePrediction';
import { useVisualizationStore } from '@/store/visualization';
import { useSimulationStore } from '@/store/simulation';
import { AGENT_COLORS } from '@/lib/utils';

interface PredictionOverlayProps {
  width: number;
  height: number;
}

function PredictionOverlayComponent({ width, height }: PredictionOverlayProps) {
  const { sessionId, status } = useSimulationStore();
  const { overlays, predictionConfidenceThreshold, showPredictionPaths } = useVisualizationStore();

  const { data, isLoading } = usePrediction({
    sessionId,
    enabled: overlays.predictions && status === 'running',
    refetchInterval: 1000,
  });

  if (!overlays.predictions || !data) return null;

  const predictions = processPredictions(data, width, height)
    .filter(p => p.overall_confidence >= predictionConfidenceThreshold);

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        {/* Gradient definitions for path fading */}
        {predictions.map(pred => (
          <linearGradient
            key={`grad-${pred.player_id}`}
            id={`prediction-gradient-${pred.player_id}`}
            gradientUnits="userSpaceOnUse"
            x1={pred.points[0]?.x || 0}
            y1={pred.points[0]?.y || 0}
            x2={pred.points[pred.points.length - 1]?.x || 0}
            y2={pred.points[pred.points.length - 1]?.y || 0}
          >
            <stop offset="0%" stopColor={AGENT_COLORS[pred.agent.toLowerCase()] || '#fff'} stopOpacity="0.8" />
            <stop offset="100%" stopColor={AGENT_COLORS[pred.agent.toLowerCase()] || '#fff'} stopOpacity="0.1" />
          </linearGradient>
        ))}

        {/* Arrow marker */}
        <marker
          id="prediction-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="8"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L8,4 L0,8 Z"
            fill="rgba(255,255,255,0.6)"
          />
        </marker>
      </defs>

      <AnimatePresence>
        {showPredictionPaths && predictions.map((pred, index) => (
          <motion.g key={pred.player_id}>
            {/* Path line */}
            <motion.path
              d={pred.pathData}
              fill="none"
              stroke={`url(#prediction-gradient-${pred.player_id})`}
              strokeWidth={getPredictionStrokeWidth(pred.overall_confidence)}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="8 4"
              markerEnd="url(#prediction-arrow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                pathLength: { duration: 0.6, delay: index * 0.1 },
                opacity: { duration: 0.2 },
              }}
            />

            {/* Confidence circles at waypoints */}
            {pred.points.slice(1).map((point, pointIndex) => (
              <motion.circle
                key={`${pred.player_id}-point-${pointIndex}`}
                cx={point.x}
                cy={point.y}
                r={4 + point.confidence * 4}
                fill="none"
                stroke={getPredictionColor(point.confidence)}
                strokeWidth={1}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: point.confidence }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ delay: 0.3 + pointIndex * 0.15 }}
              />
            ))}

            {/* End point marker */}
            {pred.points.length > 0 && (
              <motion.g
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ delay: 0.5 }}
              >
                <circle
                  cx={pred.points[pred.points.length - 1].x}
                  cy={pred.points[pred.points.length - 1].y}
                  r={6}
                  fill={AGENT_COLORS[pred.agent.toLowerCase()] || '#fff'}
                  opacity={0.6}
                />
                <circle
                  cx={pred.points[pred.points.length - 1].x}
                  cy={pred.points[pred.points.length - 1].y}
                  r={3}
                  fill="white"
                  opacity={0.8}
                />
              </motion.g>
            )}
          </motion.g>
        ))}
      </AnimatePresence>

      {/* Loading indicator */}
      {isLoading && (
        <motion.text
          x={10}
          y={20}
          fill="rgba(255,255,255,0.5)"
          fontSize={12}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          Calculating predictions...
        </motion.text>
      )}
    </svg>
  );
}

export const PredictionOverlay = memo(PredictionOverlayComponent);
