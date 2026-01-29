/**
 * Canvas-based heatmap rendering utilities.
 */

import {
  HEATMAP_GRADIENT,
  ATTACK_GRADIENT,
  DEFENSE_GRADIENT,
  getGradientColor,
  type ColorStop,
} from './gradient';
import {
  normalizeGrid,
  gaussianBlur,
  kernelDensityEstimate,
  upscaleGrid,
  type HeatmapGrid,
} from './interpolation';

export interface HeatmapOptions {
  gradient?: ColorStop[];
  opacity?: number;
  blur?: number;
  radius?: number;
  side?: 'attack' | 'defense';
}

export interface HeatmapData {
  grid: number[][];
  width: number;
  height: number;
}

/**
 * Render a heatmap to a canvas context.
 */
export function renderHeatmap(
  ctx: CanvasRenderingContext2D,
  data: HeatmapData,
  options: HeatmapOptions = {}
): void {
  const {
    gradient = options.side === 'defense' ? DEFENSE_GRADIENT : ATTACK_GRADIENT,
    opacity = 0.6,
    blur = 2,
  } = options;

  const { grid, width, height } = data;

  if (!grid.length || !grid[0].length) return;

  // Upscale the grid for smoother rendering (from 20x20 to 100x100)
  const upscaleSize = 100;
  const upscaledGrid = upscaleGrid(grid, upscaleSize, upscaleSize);

  // Apply blur for smoother visualization (increased for upscaled grid)
  const blurRadius = Math.max(1, Math.floor(blur * 2));
  const blurredGrid = blurRadius > 0 ? gaussianBlur(upscaledGrid, blurRadius) : upscaledGrid;

  // Find min/max for normalization
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (const row of blurredGrid) {
    for (const val of row) {
      minVal = Math.min(minVal, val);
      maxVal = Math.max(maxVal, val);
    }
  }

  const range = maxVal - minVal || 1;

  // Scale factors for upscaled grid
  const scaleX = width / upscaleSize;
  const scaleY = height / upscaleSize;

  // Render each cell with transparency for low values
  for (let y = 0; y < blurredGrid.length; y++) {
    for (let x = 0; x < blurredGrid[y].length; x++) {
      const normalizedValue = (blurredGrid[y][x] - minVal) / range;

      // Skip very low values to let map show through
      if (normalizedValue > 0.05) {
        const color = getGradientColor(gradient, normalizedValue);

        ctx.fillStyle = color;
        // Exponential falloff for more transparency at lower values
        ctx.globalAlpha = opacity * Math.pow(normalizedValue, 1.5);
        ctx.fillRect(
          Math.floor(x * scaleX),
          Math.floor(y * scaleY),
          Math.ceil(scaleX) + 1,
          Math.ceil(scaleY) + 1
        );
      }
    }
  }

  ctx.globalAlpha = 1;
}

/**
 * Render a heatmap from position data using kernel density estimation.
 */
export function renderPositionHeatmap(
  ctx: CanvasRenderingContext2D,
  positions: Array<{ x: number; y: number }>,
  canvasWidth: number,
  canvasHeight: number,
  options: HeatmapOptions = {}
): void {
  const {
    gradient = options.side === 'defense' ? DEFENSE_GRADIENT : ATTACK_GRADIENT,
    opacity = 0.6,
    radius = 30,
  } = options;

  if (!positions.length) return;

  // Create density grid at lower resolution for performance
  const gridSize = 40;
  const density = kernelDensityEstimate(
    positions.map(p => ({
      x: (p.x * gridSize),
      y: (p.y * gridSize),
    })),
    gridSize,
    gridSize,
    radius / 10
  );

  // Apply blur
  const blurredData = gaussianBlur(density.data, 2);

  // Normalize
  const normalizedData = normalizeGrid({
    ...density,
    data: blurredData,
  });

  // Render
  renderHeatmap(ctx, {
    grid: normalizedData,
    width: canvasWidth,
    height: canvasHeight,
  }, { gradient, opacity });
}

/**
 * Render radial gradients at specific points (good for sparse data).
 */
export function renderPointHeatmap(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number; intensity?: number }>,
  canvasWidth: number,
  canvasHeight: number,
  options: HeatmapOptions = {}
): void {
  const {
    gradient = HEATMAP_GRADIENT,
    opacity = 0.6,
    radius = 40,
  } = options;

  if (!points.length) return;

  ctx.globalCompositeOperation = 'lighter';

  for (const point of points) {
    const intensity = point.intensity ?? 1;
    const x = point.x * canvasWidth;
    const y = point.y * canvasHeight;

    const radialGradient = ctx.createRadialGradient(
      x, y, 0,
      x, y, radius
    );

    // Use gradient colors
    const centerColor = getGradientColor(gradient, 1);
    const edgeColor = getGradientColor(gradient, 0);

    radialGradient.addColorStop(0, centerColor);
    radialGradient.addColorStop(1, edgeColor);

    ctx.globalAlpha = opacity * intensity;
    ctx.fillStyle = radialGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

/**
 * Clear and prepare canvas for heatmap rendering.
 */
export function prepareHeatmapCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Set canvas size if different
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  return ctx;
}

/**
 * Draw a legend for the heatmap.
 */
export function drawHeatmapLegend(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  gradient: ColorStop[] = HEATMAP_GRADIENT,
  labels?: { low: string; high: string }
): void {
  // Draw gradient bar
  const barWidth = width - 40;
  const barHeight = 12;
  const barX = x + 20;
  const barY = y;

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(x, y - 5, width, height + 10);

  // Gradient bar
  const linearGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
  for (const stop of gradient) {
    linearGradient.addColorStop(stop.position, stop.color);
  }

  ctx.fillStyle = linearGradient;
  ctx.fillRect(barX, barY, barWidth, barHeight);

  // Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  // Labels
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';

  ctx.fillText(labels?.low || 'Low', barX, barY + barHeight + 12);
  ctx.fillText(labels?.high || 'High', barX + barWidth, barY + barHeight + 12);
}

export { HEATMAP_GRADIENT, ATTACK_GRADIENT, DEFENSE_GRADIENT };
