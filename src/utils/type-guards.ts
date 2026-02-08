/**
 * Type Guard Utilities
 * Provides type checking and validation functions
 */

/**
 * Check if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is null
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Check if value is undefined
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

/**
 * Check if value is null or undefined
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if value is an array
 */
export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Check if value is an object (and not array or null)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Check if value is a function
 */
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

/**
 * Check if value is a Date object
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Check if value is a plain object (not class instance)
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isObject(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (isString(value) || isArray(value)) return value.length === 0;
  if (isObject(value)) return Object.keys(value).length === 0;
  return false;
}

/**
 * Check if value is not empty
 */
export function isNotEmpty(value: unknown): boolean {
  return !isEmpty(value);
}

/**
 * Check if value is a positive number
 */
export function isPositive(value: number): boolean {
  return isNumber(value) && value > 0;
}

/**
 * Check if value is a negative number
 */
export function isNegative(value: number): boolean {
  return isNumber(value) && value < 0;
}

/**
 * Check if value is an integer
 */
export function isInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value);
}

/**
 * Check if value is a float
 */
export function isFloat(value: unknown): value is number {
  return isNumber(value) && !Number.isInteger(value);
}

/**
 * Check if value is within range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return isNumber(value) && value >= min && value <= max;
}

/**
 * Check if value is a valid email
 */
export function isValidEmail(value: unknown): value is string {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Check if value is a valid URL
 */
export function isValidUrl(value: unknown): value is string {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if value is a valid JSON string
 */
export function isValidJson(value: unknown): boolean {
  if (!isString(value)) return false;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if value is a valid UUID
 */
export function isValidUuid(value: unknown): value is string {
  if (!isString(value)) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Check if value is a valid phone number (US format)
 */
export function isValidPhoneNumber(value: unknown): value is string {
  if (!isString(value)) return false;
  const phoneRegex = /^[\d\s\-\(\)]+$/;
  const digits = value.replace(/\D/g, '');
  return phoneRegex.test(value) && digits.length >= 10 && digits.length <= 11;
}

/**
 * Check if value is a valid credit card number (Luhn algorithm)
 */
export function isValidCreditCard(value: unknown): value is string {
  if (!isString(value)) return false;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Assert that value is defined, throw if not
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (!isDefined(value)) {
    throw new Error(message || 'Value is not defined');
  }
}

/**
 * Assert that value is a number, throw if not
 */
export function assertNumber(value: unknown, message?: string): asserts value is number {
  if (!isNumber(value)) {
    throw new Error(message || 'Value is not a number');
  }
}

/**
 * Assert that value is a string, throw if not
 */
export function assertString(value: unknown, message?: string): asserts value is string {
  if (!isString(value)) {
    throw new Error(message || 'Value is not a string');
  }
}

/**
 * Assert that value is an array, throw if not
 */
export function assertArray<T>(value: unknown, message?: string): asserts value is T[] {
  if (!isArray(value)) {
    throw new Error(message || 'Value is not an array');
  }
}

/**
 * Assert that value is an object, throw if not
 */
export function assertObject(value: unknown, message?: string): asserts value is Record<string, unknown> {
  if (!isObject(value)) {
    throw new Error(message || 'Value is not an object');
  }
}
