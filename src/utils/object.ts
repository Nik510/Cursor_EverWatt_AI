/**
 * Object Utilities
 * Provides functions for object manipulation and operations
 */

/**
 * Get nested property value by path
 */
export function get<T>(obj: unknown, path: string, defaultValue?: T): T | undefined {
  const keys = path.split('.');
  let result: unknown = obj;
  
  for (const key of keys) {
    if (result == null) {
      return defaultValue;
    }
    if (typeof result !== 'object' || Array.isArray(result)) return defaultValue;
    result = (result as Record<string, unknown>)[key];
  }
  
  return (result as T | undefined) !== undefined ? (result as T) : defaultValue;
}

/**
 * Set nested property value by path
 */
export function set(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let current: Record<string, unknown> = obj;
  
  for (const key of keys) {
    const existing = current[key];
    if (existing == null || typeof existing !== 'object' || Array.isArray(existing)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  
  current[lastKey] = value;
  return obj;
}

/**
 * Check if object has nested property
 */
export function has(obj: unknown, path: string): boolean {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current == null || typeof current !== 'object' || Array.isArray(current) || !(key in (current as object))) {
      return false;
    }
    current = (current as Record<string, unknown>)[key];
  }
  
  return true;
}

/**
 * Omit properties from object
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
}

/**
 * Pick properties from object
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) return target;
  const source = sources.shift();
  
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      const v = source[key];
      if (isObject(v)) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key] as Record<string, unknown>, v as Record<string, unknown>);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  
  return deepMerge(target, ...sources);
}

/**
 * Check if value is an object
 */
function isObject(item: unknown): item is Record<string, unknown> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Flatten nested object
 */
export function flattenObject(obj: unknown, prefix: string = '', separator: string = '.'): Record<string, unknown> {
  const flattened: Record<string, unknown> = {};
  
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) return flattened;

  for (const key in obj as Record<string, unknown>) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = prefix ? `${prefix}${separator}${key}` : key;
      const value = (obj as Record<string, unknown>)[key];
      
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flattened, flattenObject(value, newKey, separator));
      } else {
        flattened[newKey] = value;
      }
    }
  }
  
  return flattened;
}

/**
 * Check if object is empty
 */
export function isEmpty(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * Check if object is not empty
 */
export function isNotEmpty(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length > 0;
}

/**
 * Get object keys
 */
export function keys<T extends Record<string, unknown>>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/**
 * Get object values
 */
export function values<T extends Record<string, unknown>>(obj: T): T[keyof T][] {
  return Object.values(obj);
}

/**
 * Get object entries
 */
export function entries<T extends Record<string, unknown>>(obj: T): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}

/**
 * Invert object (swap keys and values)
 */
export function invert<T extends Record<string, string | number>>(obj: T): Record<string, string> {
  const inverted: Record<string, string> = {};
  for (const key in obj) {
    inverted[String(obj[key])] = key;
  }
  return inverted;
}

/**
 * Map object values
 */
export function mapValues<T, U>(
  obj: Record<string, T>,
  fn: (value: T, key: string) => U
): Record<string, U> {
  const result: Record<string, U> = {};
  for (const key in obj) {
    result[key] = fn(obj[key], key);
  }
  return result;
}

/**
 * Map object keys
 */
export function mapKeys<T>(
  obj: Record<string, T>,
  fn: (key: string, value: T) => string
): Record<string, T> {
  const result: Record<string, T> = {};
  for (const key in obj) {
    result[fn(key, obj[key])] = obj[key];
  }
  return result;
}

/**
 * Filter object by predicate
 */
export function filterObject<T extends Record<string, unknown>>(
  obj: T,
  predicate: (value: T[keyof T], key: keyof T) => boolean
): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (predicate(obj[key], key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Check if objects are deeply equal
 */
export function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    const av = (a as Record<string, unknown>)[key];
    const bv = (b as Record<string, unknown>)[key];
    if (!isEqual(av, bv)) return false;
  }
  
  return true;
}

/**
 * Create object from array of key-value pairs
 */
export function fromEntries<T>(entries: [string, T][]): Record<string, T> {
  const result: Record<string, T> = {};
  entries.forEach(([key, value]) => {
    result[key] = value;
  });
  return result;
}

/**
 * Get size of object (number of keys)
 */
export function size(obj: Record<string, unknown>): number {
  return Object.keys(obj).length;
}
