/**
 * Math Utilities
 * Provides mathematical helper functions
 */

/**
 * Round a number to specified decimal places
 */
export function round(value: number, decimals: number = 0): number {
  if (isNaN(value) || !isFinite(value)) {
    return 0;
  }
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  if (isNaN(value) || !isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * clamp(t, 0, 1);
}

/**
 * Inverse linear interpolation (find t given value)
 */
export function invLerp(start: number, end: number, value: number): number {
  if (end === start) return 0;
  return clamp((value - start) / (end - start), 0, 1);
}

/**
 * Map a value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const t = invLerp(inMin, inMax, value);
  return lerp(outMin, outMax, t);
}

/**
 * Calculate percentage of a value
 */
export function percentOf(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Calculate percentage change
 */
export function percentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue === 0 ? 0 : (newValue > 0 ? 100 : -100);
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Calculate mean (average) of an array
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Calculate median of an array
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(values: number[], useSample: boolean = false): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = mean(squareDiffs);
  const divisor = useSample ? values.length - 1 : values.length;
  return Math.sqrt(avgSquareDiff * values.length / divisor);
}

/**
 * Calculate variance
 */
export function variance(values: number[], useSample: boolean = false): number {
  const stdDev = standardDeviation(values, useSample);
  return stdDev * stdDev;
}

/**
 * Calculate percentile
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  if (p <= 0) return Math.min(...values);
  if (p >= 1) return Math.max(...values);

  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate quartiles (Q1, Q2, Q3)
 */
export function quartiles(values: number[]): { q1: number; q2: number; q3: number } {
  return {
    q1: percentile(values, 0.25),
    q2: percentile(values, 0.5),
    q3: percentile(values, 0.75),
  };
}

/**
 * Calculate min, max, mean, median of an array
 */
export function statistics(values: number[]): {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  q1: number;
  q3: number;
} {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      stdDev: 0,
      q1: 0,
      q3: 0,
    };
  }

  const { q1, q3 } = quartiles(values);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    mean: mean(values),
    median: median(values),
    stdDev: standardDeviation(values),
    q1,
    q3,
  };
}

/**
 * Check if a number is within a range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Calculate sum of an array
 */
export function sum(values: number[]): number {
  return values.reduce((acc, val) => acc + val, 0);
}

/**
 * Calculate product of an array
 */
export function product(values: number[]): number {
  return values.reduce((acc, val) => acc * val, 1);
}

/**
 * Calculate factorial
 */
export function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

/**
 * Check if a number is approximately equal to another (within tolerance)
 */
export function approximatelyEqual(a: number, b: number, tolerance: number = 0.0001): boolean {
  return Math.abs(a - b) < tolerance;
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}
