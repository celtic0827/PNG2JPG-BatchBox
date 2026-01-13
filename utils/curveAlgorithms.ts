
import { CurvePoint } from '../types';

/**
 * Calculates a monotonic cubic spline interpolation for the given points.
 * Returns a Lookup Table (LUT) array of 256 integers (0-255).
 */
export const generateCurveLUT = (points: CurvePoint[]): number[] => {
  // 1. Sort points by X
  const sortedPoints = [...points].sort((a, b) => a.x - b.x);

  // Ensure start (0,0) and end (255,255) logical bounds if not present?
  // Usually curve tools imply extension to bounds. 
  // For simplicity, if the user doesn't define 0 or 255, we clamp or extend.
  // But strictly, we interpolate between the defined points and clamp outside.
  
  const xs = sortedPoints.map(p => p.x);
  const ys = sortedPoints.map(p => p.y);
  const n = sortedPoints.length;

  if (n < 2) {
    // Linear fallback or identity if only 1 point
    const lut = [];
    for (let i = 0; i < 256; i++) lut[i] = i;
    return lut;
  }

  // Monotone Cubic Spline Interpolation
  // Calculate secants and tangents
  const m = new Array(n).fill(0);
  const dxs = [];
  const dys = [];

  for (let i = 0; i < n - 1; i++) {
    const dx = xs[i + 1] - xs[i];
    const dy = ys[i + 1] - ys[i];
    dxs.push(dx);
    dys.push(dy);
  }

  const ms = [];
  for (let i = 0; i < n - 1; i++) {
    ms.push(dys[i] / dxs[i]);
  }

  // Determine tangents at data points
  const c1s = [ms[0]];
  for (let i = 0; i < n - 2; i++) {
    if (ms[i] * ms[i+1] <= 0) {
      c1s.push(0);
    } else {
      // Standard average
      c1s.push((ms[i] + ms[i+1]) / 2); 
    }
  }
  c1s.push(ms[n - 2]);

  // Generate LUT
  const lut = new Array(256).fill(0);

  // Helper to get Y for specific X
  const getY = (targetX: number) => {
    // Find segment
    let i = 0;
    if (targetX <= xs[0]) return ys[0];
    if (targetX >= xs[n - 1]) return ys[n - 1];

    for (let j = 0; j < n - 1; j++) {
      if (targetX >= xs[j] && targetX < xs[j + 1]) {
        i = j;
        break;
      }
    }

    // Hermite basis functions
    const h = xs[i + 1] - xs[i];
    const t = (targetX - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;

    const p0 = ys[i];
    const p1 = ys[i + 1];
    const m0 = c1s[i];
    const m1 = c1s[i + 1];

    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    const y = h00 * p0 + h10 * h * m0 + h01 * p1 + h11 * h * m1;
    return Math.max(0, Math.min(255, Math.round(y)));
  };

  for (let i = 0; i < 256; i++) {
    lut[i] = getY(i);
  }

  return lut;
};
