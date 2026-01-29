'use client';

import { cn } from '@/lib/utils';

interface GradientStop {
  position: number;
  color: string;
}

interface GradientLegendProps {
  gradient: GradientStop[];
  labels?: {
    start?: string;
    middle?: string;
    end?: string;
  };
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function GradientLegend({
  gradient,
  labels = { start: 'Low', end: 'High' },
  orientation = 'horizontal',
  size = 'md',
  className,
}: GradientLegendProps) {
  // Build CSS gradient string
  const gradientStr = gradient
    .map(stop => `${stop.color} ${stop.position * 100}%`)
    .join(', ');

  const isHorizontal = orientation === 'horizontal';

  const sizeClasses = {
    sm: isHorizontal ? 'h-2 w-24' : 'w-2 h-24',
    md: isHorizontal ? 'h-3 w-32' : 'w-3 h-32',
    lg: isHorizontal ? 'h-4 w-40' : 'w-4 h-40',
  };

  return (
    <div className={cn(
      "flex items-center gap-2",
      !isHorizontal && "flex-col",
      className
    )}>
      {/* Start label */}
      <span className="text-[10px] text-gray-400 min-w-[30px]">
        {labels.start}
      </span>

      {/* Gradient bar */}
      <div
        className={cn(
          "rounded-full",
          sizeClasses[size]
        )}
        style={{
          background: isHorizontal
            ? `linear-gradient(to right, ${gradientStr})`
            : `linear-gradient(to bottom, ${gradientStr})`,
        }}
      />

      {/* End label */}
      <span className="text-[10px] text-gray-400 min-w-[30px] text-right">
        {labels.end}
      </span>
    </div>
  );
}

// Preset gradients
export const GRADIENT_PRESETS = {
  heatmap: [
    { position: 0, color: 'rgba(59, 130, 246, 0.2)' },
    { position: 0.5, color: 'rgba(234, 179, 8, 0.6)' },
    { position: 1, color: 'rgba(239, 68, 68, 1)' },
  ],
  attack: [
    { position: 0, color: 'rgba(239, 68, 68, 0.1)' },
    { position: 0.5, color: 'rgba(249, 115, 22, 0.5)' },
    { position: 1, color: 'rgba(239, 68, 68, 1)' },
  ],
  defense: [
    { position: 0, color: 'rgba(59, 130, 246, 0.1)' },
    { position: 0.5, color: 'rgba(99, 102, 241, 0.5)' },
    { position: 1, color: 'rgba(59, 130, 246, 1)' },
  ],
  confidence: [
    { position: 0, color: 'rgba(156, 163, 175, 0.3)' },
    { position: 1, color: 'rgba(255, 255, 255, 0.9)' },
  ],
};
