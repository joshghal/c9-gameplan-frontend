/**
 * Interpolation utilities for heatmap data processing.
 */

export interface GridPoint {
  x: number;
  y: number;
  value: number;
}

export interface HeatmapGrid {
  data: number[][];
  width: number;
  height: number;
  minValue: number;
  maxValue: number;
}

/**
 * Bilinear interpolation for smooth heatmap rendering.
 * Given a 2D grid and floating-point coordinates, returns interpolated value.
 */
export function bilinearInterpolate(
  grid: number[][],
  x: number,
  y: number
): number {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  if (rows === 0 || cols === 0) return 0;

  // Clamp coordinates
  const clampedX = Math.max(0, Math.min(cols - 1, x));
  const clampedY = Math.max(0, Math.min(rows - 1, y));

  // Get the four surrounding integer coordinates
  const x0 = Math.floor(clampedX);
  const x1 = Math.min(x0 + 1, cols - 1);
  const y0 = Math.floor(clampedY);
  const y1 = Math.min(y0 + 1, rows - 1);

  // Get fractional parts
  const xFrac = clampedX - x0;
  const yFrac = clampedY - y0;

  // Get values at four corners
  const v00 = grid[y0][x0];
  const v01 = grid[y0][x1];
  const v10 = grid[y1][x0];
  const v11 = grid[y1][x1];

  // Interpolate along x axis first
  const v0 = v00 * (1 - xFrac) + v01 * xFrac;
  const v1 = v10 * (1 - xFrac) + v11 * xFrac;

  // Interpolate along y axis
  return v0 * (1 - yFrac) + v1 * yFrac;
}

/**
 * Upscale a heatmap grid using bilinear interpolation.
 */
export function upscaleGrid(
  grid: number[][],
  targetWidth: number,
  targetHeight: number
): number[][] {
  const sourceHeight = grid.length;
  const sourceWidth = grid[0]?.length || 0;

  if (sourceHeight === 0 || sourceWidth === 0) return [];

  const result: number[][] = [];

  for (let y = 0; y < targetHeight; y++) {
    const row: number[] = [];
    const sourceY = (y / targetHeight) * sourceHeight;

    for (let x = 0; x < targetWidth; x++) {
      const sourceX = (x / targetWidth) * sourceWidth;
      row.push(bilinearInterpolate(grid, sourceX, sourceY));
    }

    result.push(row);
  }

  return result;
}

/**
 * Convert sparse points to a grid using inverse distance weighting (IDW).
 */
export function pointsToGrid(
  points: GridPoint[],
  gridWidth: number,
  gridHeight: number,
  power: number = 2,
  searchRadius: number = Infinity
): HeatmapGrid {
  const grid: number[][] = [];
  let minValue = Infinity;
  let maxValue = -Infinity;

  for (let y = 0; y < gridHeight; y++) {
    const row: number[] = [];

    for (let x = 0; x < gridWidth; x++) {
      let value = 0;
      let totalWeight = 0;

      for (const point of points) {
        const dx = x - point.x;
        const dy = y - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= searchRadius) {
          if (distance < 0.0001) {
            // Exact point
            value = point.value;
            totalWeight = 1;
            break;
          }

          const weight = 1 / Math.pow(distance, power);
          value += point.value * weight;
          totalWeight += weight;
        }
      }

      const finalValue = totalWeight > 0 ? value / totalWeight : 0;
      row.push(finalValue);

      minValue = Math.min(minValue, finalValue);
      maxValue = Math.max(maxValue, finalValue);
    }

    grid.push(row);
  }

  return {
    data: grid,
    width: gridWidth,
    height: gridHeight,
    minValue: minValue === Infinity ? 0 : minValue,
    maxValue: maxValue === -Infinity ? 0 : maxValue,
  };
}

/**
 * Normalize a grid to 0-1 range.
 */
export function normalizeGrid(grid: HeatmapGrid): number[][] {
  const range = grid.maxValue - grid.minValue;
  if (range === 0) return grid.data;

  return grid.data.map(row =>
    row.map(value => (value - grid.minValue) / range)
  );
}

/**
 * Apply Gaussian blur to a grid for smoother visualization.
 */
export function gaussianBlur(
  grid: number[][],
  radius: number = 1
): number[][] {
  const height = grid.length;
  const width = grid[0]?.length || 0;

  if (height === 0 || width === 0) return grid;

  // Generate Gaussian kernel
  const kernelSize = radius * 2 + 1;
  const kernel: number[][] = [];
  const sigma = radius / 3;
  let kernelSum = 0;

  for (let y = -radius; y <= radius; y++) {
    const row: number[] = [];
    for (let x = -radius; x <= radius; x++) {
      const value = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
      row.push(value);
      kernelSum += value;
    }
    kernel.push(row);
  }

  // Normalize kernel
  for (let y = 0; y < kernelSize; y++) {
    for (let x = 0; x < kernelSize; x++) {
      kernel[y][x] /= kernelSum;
    }
  }

  // Apply convolution
  const result: number[][] = [];

  for (let y = 0; y < height; y++) {
    const row: number[] = [];

    for (let x = 0; x < width; x++) {
      let sum = 0;

      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const sampleY = Math.max(0, Math.min(height - 1, y + ky));
          const sampleX = Math.max(0, Math.min(width - 1, x + kx));
          sum += grid[sampleY][sampleX] * kernel[ky + radius][kx + radius];
        }
      }

      row.push(sum);
    }

    result.push(row);
  }

  return result;
}

/**
 * Calculate density at a point given a set of position samples.
 */
export function kernelDensityEstimate(
  positions: Array<{ x: number; y: number }>,
  gridWidth: number,
  gridHeight: number,
  bandwidth: number = 20
): HeatmapGrid {
  const grid: number[][] = [];
  let maxValue = 0;

  for (let y = 0; y < gridHeight; y++) {
    const row: number[] = [];

    for (let x = 0; x < gridWidth; x++) {
      let density = 0;

      for (const pos of positions) {
        const dx = (x - pos.x) / bandwidth;
        const dy = (y - pos.y) / bandwidth;
        // Gaussian kernel
        density += Math.exp(-0.5 * (dx * dx + dy * dy));
      }

      row.push(density);
      maxValue = Math.max(maxValue, density);
    }

    grid.push(row);
  }

  return {
    data: grid,
    width: gridWidth,
    height: gridHeight,
    minValue: 0,
    maxValue,
  };
}
