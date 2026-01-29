/**
 * Color gradient utilities for heatmap visualization.
 */

export interface ColorStop {
  position: number; // 0-1
  color: string;    // hex or rgba
}

/**
 * Default heatmap color gradient (blue -> green -> yellow -> red)
 */
export const HEATMAP_GRADIENT: ColorStop[] = [
  { position: 0.0, color: 'rgba(0, 0, 255, 0)' },
  { position: 0.2, color: 'rgba(0, 0, 255, 0.4)' },
  { position: 0.4, color: 'rgba(0, 255, 0, 0.6)' },
  { position: 0.6, color: 'rgba(255, 255, 0, 0.7)' },
  { position: 0.8, color: 'rgba(255, 128, 0, 0.8)' },
  { position: 1.0, color: 'rgba(255, 0, 0, 1.0)' },
];

/**
 * Attack-focused gradient (cool blue to hot red)
 */
export const ATTACK_GRADIENT: ColorStop[] = [
  { position: 0.0, color: 'rgba(239, 68, 68, 0)' },
  { position: 0.3, color: 'rgba(239, 68, 68, 0.3)' },
  { position: 0.5, color: 'rgba(249, 115, 22, 0.5)' },
  { position: 0.7, color: 'rgba(234, 179, 8, 0.7)' },
  { position: 1.0, color: 'rgba(239, 68, 68, 1.0)' },
];

/**
 * Defense-focused gradient (blue tones)
 */
export const DEFENSE_GRADIENT: ColorStop[] = [
  { position: 0.0, color: 'rgba(59, 130, 246, 0)' },
  { position: 0.3, color: 'rgba(59, 130, 246, 0.3)' },
  { position: 0.5, color: 'rgba(99, 102, 241, 0.5)' },
  { position: 0.7, color: 'rgba(139, 92, 246, 0.7)' },
  { position: 1.0, color: 'rgba(59, 130, 246, 1.0)' },
];

/**
 * Confidence gradient for predictions (gray to white)
 */
export const CONFIDENCE_GRADIENT: ColorStop[] = [
  { position: 0.0, color: 'rgba(156, 163, 175, 0.2)' },
  { position: 0.5, color: 'rgba(209, 213, 219, 0.5)' },
  { position: 1.0, color: 'rgba(255, 255, 255, 0.9)' },
];

/**
 * Parse a color string to RGBA components
 */
export function parseColor(color: string): { r: number; g: number; b: number; a: number } {
  // Handle rgba format
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]),
      g: parseInt(rgbaMatch[2]),
      b: parseInt(rgbaMatch[3]),
      a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
    };
  }

  // Handle hex format
  const hexMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (hexMatch) {
    return {
      r: parseInt(hexMatch[1], 16),
      g: parseInt(hexMatch[2], 16),
      b: parseInt(hexMatch[3], 16),
      a: 1,
    };
  }

  // Default to transparent
  return { r: 0, g: 0, b: 0, a: 0 };
}

/**
 * Interpolate between two colors
 */
export function lerpColor(
  color1: string,
  color2: string,
  t: number
): string {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);

  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  const a = c1.a + (c2.a - c1.a) * t;

  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

/**
 * Get color from gradient at a specific position (0-1)
 */
export function getGradientColor(gradient: ColorStop[], position: number): string {
  // Clamp position
  const p = Math.max(0, Math.min(1, position));

  // Find the two color stops to interpolate between
  let startStop = gradient[0];
  let endStop = gradient[gradient.length - 1];

  for (let i = 0; i < gradient.length - 1; i++) {
    if (p >= gradient[i].position && p <= gradient[i + 1].position) {
      startStop = gradient[i];
      endStop = gradient[i + 1];
      break;
    }
  }

  // Calculate interpolation factor
  const range = endStop.position - startStop.position;
  const t = range === 0 ? 0 : (p - startStop.position) / range;

  return lerpColor(startStop.color, endStop.color, t);
}

/**
 * Create a canvas gradient from color stops
 */
export function createCanvasGradient(
  ctx: CanvasRenderingContext2D,
  gradient: ColorStop[],
  x0: number,
  y0: number,
  x1: number,
  y1: number
): CanvasGradient {
  const canvasGradient = ctx.createLinearGradient(x0, y0, x1, y1);

  for (const stop of gradient) {
    canvasGradient.addColorStop(stop.position, stop.color);
  }

  return canvasGradient;
}

/**
 * Create a radial gradient for heatmap points
 */
export function createRadialGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  intensity: number = 1,
  gradient: ColorStop[] = HEATMAP_GRADIENT
): CanvasGradient {
  const radialGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

  for (const stop of gradient) {
    const color = parseColor(stop.color);
    const adjustedAlpha = color.a * intensity;
    radialGradient.addColorStop(
      stop.position,
      `rgba(${color.r}, ${color.g}, ${color.b}, ${adjustedAlpha})`
    );
  }

  return radialGradient;
}

/**
 * Generate legend data for a gradient
 */
export function generateLegendSteps(
  gradient: ColorStop[],
  steps: number = 5
): Array<{ label: string; color: string }> {
  const result = [];
  for (let i = 0; i < steps; i++) {
    const position = i / (steps - 1);
    result.push({
      label: `${Math.round(position * 100)}%`,
      color: getGradientColor(gradient, position),
    });
  }
  return result;
}
