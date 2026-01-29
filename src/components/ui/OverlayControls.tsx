'use client';

import { motion } from 'framer-motion';
import {
  Map,
  GitBranch,
  Crosshair,
  DollarSign,
  Sparkles,
  Eye,
  EyeOff,
  Settings,
} from 'lucide-react';
import { useVisualizationStore, type OverlayType } from '@/store/visualization';
import { cn } from '@/lib/utils';

interface OverlayControlsProps {
  className?: string;
  compact?: boolean;
}

export function OverlayControls({ className, compact = false }: OverlayControlsProps) {
  const { overlays, toggleOverlay, heatmapSide, setHeatmapSide } = useVisualizationStore();

  const overlayOptions: Array<{
    id: OverlayType;
    label: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      id: 'heatmap',
      label: 'Heatmap',
      icon: <Map className="w-4 h-4" />,
      color: 'from-orange-500 to-red-500',
    },
    {
      id: 'predictions',
      label: 'Predictions',
      icon: <GitBranch className="w-4 h-4" />,
      color: 'from-purple-500 to-blue-500',
    },
    {
      id: 'kills',
      label: 'Kill Zones',
      icon: <Crosshair className="w-4 h-4" />,
      color: 'from-red-500 to-pink-500',
    },
  ];

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {overlayOptions.map(option => (
          <motion.button
            key={option.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleOverlay(option.id)}
            className={cn(
              "p-2 rounded-lg transition-all",
              overlays[option.id]
                ? `bg-gradient-to-br ${option.color} text-white`
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
            )}
            title={option.label}
          >
            {option.icon}
          </motion.button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-4",
      className
    )}>
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-4 h-4 text-gray-400" />
        <h4 className="text-sm font-medium text-white">Overlays</h4>
      </div>

      <div className="space-y-2">
        {overlayOptions.map(option => (
          <motion.button
            key={option.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => toggleOverlay(option.id)}
            className={cn(
              "w-full flex items-center gap-3 p-2 rounded-lg transition-all",
              overlays[option.id]
                ? "bg-white/10"
                : "hover:bg-white/5"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              overlays[option.id]
                ? `bg-gradient-to-br ${option.color}`
                : "bg-white/10"
            )}>
              {option.icon}
            </div>
            <span className={cn(
              "flex-1 text-sm text-left",
              overlays[option.id] ? "text-white" : "text-gray-400"
            )}>
              {option.label}
            </span>
            {overlays[option.id] ? (
              <Eye className="w-4 h-4 text-green-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-500" />
            )}
          </motion.button>
        ))}
      </div>

      {/* Heatmap side toggle when heatmap is active */}
      {overlays.heatmap && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="mt-3 pt-3 border-t border-white/10"
        >
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-3 h-3 text-gray-500" />
            <span className="text-xs text-gray-400">Heatmap Side</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setHeatmapSide('attack')}
              className={cn(
                "flex-1 py-1.5 text-xs rounded-lg transition-all",
                heatmapSide === 'attack'
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
              )}
            >
              Attack
            </button>
            <button
              onClick={() => setHeatmapSide('defense')}
              className={cn(
                "flex-1 py-1.5 text-xs rounded-lg transition-all",
                heatmapSide === 'defense'
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
              )}
            >
              Defense
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
