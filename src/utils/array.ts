/**
 * Array Utilities
 * Provides functions for array manipulation and operations
 */

/**
 * Remove duplicates from array
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

/**
 * Remove duplicates by key
 */
export function uniqueBy<T>(array: T[], keyFn: (item: T) => any): T[] {
  const seen = new Set();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Group array items by key
 */
export function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Partition array into two arrays based on predicate
 */
export function partition<T>(array: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const truthy: T[] = [];
  const falsy: T[] = [];
  array.forEach(item => {
    if (predicate(item)) {
      truthy.push(item);
    } else {
      falsy.push(item);
    }
  });
  return [truthy, falsy];
}

/**
 * Chunk array into smaller arrays of specified size
 */
export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Flatten nested array
 */
export function flatten<T>(array: (T | T[])[]): T[] {
  return array.reduce((acc, item) => {
    return acc.concat(Array.isArray(item) ? flatten(item) : item);
  }, [] as T[]);
}

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get random item from array
 */
export function randomItem<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get random items from array
 */
export function randomItems<T>(array: T[], count: number): T[] {
  const shuffled = shuffle(array);
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Sort array by key
 */
export function sortBy<T>(array: T[], keyFn: (item: T) => number | string, descending: boolean = false): T[] {
  const sorted = [...array].sort((a, b) => {
    const aVal = keyFn(a);
    const bVal = keyFn(b);
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  });
  return descending ? sorted.reverse() : sorted;
}

/**
 * Get first N items from array
 */
export function take<T>(array: T[], n: number): T[] {
  return array.slice(0, n);
}

/**
 * Get last N items from array
 */
export function takeLast<T>(array: T[], n: number): T[] {
  return array.slice(-n);
}

/**
 * Skip first N items from array
 */
export function skip<T>(array: T[], n: number): T[] {
  return array.slice(n);
}

/**
 * Skip last N items from array
 */
export function skipLast<T>(array: T[], n: number): T[] {
  return array.slice(0, -n);
}

/**
 * Get intersection of two arrays
 */
export function intersection<T>(array1: T[], array2: T[]): T[] {
  const set2 = new Set(array2);
  return array1.filter(item => set2.has(item));
}

/**
 * Get union of two arrays
 */
export function union<T>(array1: T[], array2: T[]): T[] {
  return unique([...array1, ...array2]);
}

/**
 * Get difference of two arrays (items in array1 but not in array2)
 */
export function difference<T>(array1: T[], array2: T[]): T[] {
  const set2 = new Set(array2);
  return array1.filter(item => !set2.has(item));
}

/**
 * Check if array includes item (deep equality)
 */
export function includesDeep<T>(array: T[], item: T): boolean {
  return array.some(arrItem => JSON.stringify(arrItem) === JSON.stringify(item));
}

/**
 * Find index by predicate
 */
export function findIndex<T>(array: T[], predicate: (item: T) => boolean): number {
  return array.findIndex(predicate);
}

/**
 * Find all indices by predicate
 */
export function findAllIndices<T>(array: T[], predicate: (item: T) => boolean): number[] {
  const indices: number[] = [];
  array.forEach((item, index) => {
    if (predicate(item)) {
      indices.push(index);
    }
  });
  return indices;
}

/**
 * Count items matching predicate
 */
export function countBy<T>(array: T[], predicate: (item: T) => boolean): number {
  return array.filter(predicate).length;
}

/**
 * Sum array values
 */
export function sumBy<T>(array: T[], valueFn: (item: T) => number): number {
  return array.reduce((sum, item) => sum + valueFn(item), 0);
}

/**
 * Average array values
 */
export function averageBy<T>(array: T[], valueFn: (item: T) => number): number {
  if (array.length === 0) return 0;
  return sumBy(array, valueFn) / array.length;
}

/**
 * Min value in array
 */
export function minBy<T>(array: T[], valueFn: (item: T) => number): T | undefined {
  if (array.length === 0) return undefined;
  return array.reduce((min, item) => {
    return valueFn(item) < valueFn(min) ? item : min;
  });
}

/**
 * Max value in array
 */
export function maxBy<T>(array: T[], valueFn: (item: T) => number): T | undefined {
  if (array.length === 0) return undefined;
  return array.reduce((max, item) => {
    return valueFn(item) > valueFn(max) ? item : max;
  });
}

/**
 * Zip two arrays together
 */
export function zip<T, U>(array1: T[], array2: U[]): [T, U][] {
  const length = Math.min(array1.length, array2.length);
  const result: [T, U][] = [];
  for (let i = 0; i < length; i++) {
    result.push([array1[i], array2[i]]);
  }
  return result;
}

/**
 * Unzip array of tuples
 */
export function unzip<T, U>(array: [T, U][]): [T[], U[]] {
  const result1: T[] = [];
  const result2: U[] = [];
  array.forEach(([item1, item2]) => {
    result1.push(item1);
    result2.push(item2);
  });
  return [result1, result2];
}

/**
 * Remove item from array
 */
export function remove<T>(array: T[], item: T): T[] {
  return array.filter(arrItem => arrItem !== item);
}

/**
 * Remove item at index
 */
export function removeAt<T>(array: T[], index: number): T[] {
  if (index < 0 || index >= array.length) return array;
  return array.filter((_, i) => i !== index);
}

/**
 * Insert item at index
 */
export function insertAt<T>(array: T[], index: number, item: T): T[] {
  const result = [...array];
  result.splice(index, 0, item);
  return result;
}

/**
 * Replace item at index
 */
export function replaceAt<T>(array: T[], index: number, item: T): T[] {
  if (index < 0 || index >= array.length) return array;
  const result = [...array];
  result[index] = item;
  return result;
}

/**
 * Check if array is empty
 */
export function isEmpty<T>(array: T[]): boolean {
  return array.length === 0;
}

/**
 * Check if array is not empty
 */
export function isNotEmpty<T>(array: T[]): boolean {
  return array.length > 0;
}

/**
 * Get last item in array
 */
export function last<T>(array: T[]): T | undefined {
  return array[array.length - 1];
}

/**
 * Get first item in array
 */
export function first<T>(array: T[]): T | undefined {
  return array[0];
}

/**
 * Create range of numbers
 */
export function range(start: number, end: number, step: number = 1): number[] {
  const result: number[] = [];
  if (step > 0) {
    for (let i = start; i < end; i += step) {
      result.push(i);
    }
  } else if (step < 0) {
    for (let i = start; i > end; i += step) {
      result.push(i);
    }
  }
  return result;
}
