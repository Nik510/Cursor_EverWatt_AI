/**
 * String Utilities
 * Provides functions for string manipulation and formatting
 */

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Capitalize first letter of each word
 */
export function capitalizeWords(str: string): string {
  if (!str) return str;
  return str
    .split(/\s+/)
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Convert string to camelCase
 */
export function toCamelCase(str: string): string {
  if (!str) return str;
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}

/**
 * Convert string to kebab-case
 */
export function toKebabCase(str: string): string {
  if (!str) return str;
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert string to snake_case
 */
export function toSnakeCase(str: string): string {
  if (!str) return str;
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * Convert string to PascalCase
 */
export function toPascalCase(str: string): string {
  if (!str) return str;
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, word => word.toUpperCase())
    .replace(/\s+/g, '');
}

/**
 * Truncate string to specified length with ellipsis
 */
export function truncate(str: string, length: number, suffix: string = '...'): string {
  if (!str || str.length <= length) return str;
  return str.slice(0, length - suffix.length) + suffix;
}

/**
 * Remove whitespace from both ends and normalize internal whitespace
 */
export function normalizeWhitespace(str: string): string {
  if (!str) return str;
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Remove all whitespace from string
 */
export function removeWhitespace(str: string): string {
  if (!str) return str;
  return str.replace(/\s+/g, '');
}

/**
 * Pad string to specified length
 */
export function pad(str: string | number, length: number, padChar: string = ' ', padLeft: boolean = false): string {
  const s = String(str);
  if (s.length >= length) return s;
  const padding = padChar.repeat(length - s.length);
  return padLeft ? padding + s : s + padding;
}

/**
 * Pad string with zeros (left pad)
 */
export function padZero(str: string | number, length: number): string {
  return pad(str, length, '0', true);
}

/**
 * Remove HTML tags from string
 */
export function stripHtml(html: string): string {
  if (!html) return html;
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  if (!str) return str;
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return str.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Unescape HTML special characters
 */
export function unescapeHtml(str: string): string {
  if (!str) return str;
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&apos;': "'",
  };
  return str.replace(/&(amp|lt|gt|quot|#039|apos);/g, (m, key) => map[m] || m);
}

/**
 * Extract words from string
 */
export function extractWords(str: string): string[] {
  if (!str) return [];
  return str.match(/\b\w+\b/g) || [];
}

/**
 * Count words in string
 */
export function countWords(str: string): number {
  return extractWords(str).length;
}

/**
 * Count characters in string (excluding spaces)
 */
export function countCharacters(str: string, excludeSpaces: boolean = false): number {
  if (!str) return 0;
  return excludeSpaces ? str.replace(/\s/g, '').length : str.length;
}

/**
 * Check if string starts with substring (case-insensitive)
 */
export function startsWithIgnoreCase(str: string, searchString: string): boolean {
  if (!str || !searchString) return false;
  return str.toLowerCase().startsWith(searchString.toLowerCase());
}

/**
 * Check if string ends with substring (case-insensitive)
 */
export function endsWithIgnoreCase(str: string, searchString: string): boolean {
  if (!str || !searchString) return false;
  return str.toLowerCase().endsWith(searchString.toLowerCase());
}

/**
 * Check if string contains substring (case-insensitive)
 */
export function includesIgnoreCase(str: string, searchString: string): boolean {
  if (!str || !searchString) return false;
  return str.toLowerCase().includes(searchString.toLowerCase());
}

/**
 * Replace all occurrences of a substring
 */
export function replaceAll(str: string, search: string, replace: string): string {
  if (!str) return str;
  return str.split(search).join(replace);
}

/**
 * Generate a random string
 */
export function randomString(length: number = 10, chars: string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a slug from string
 */
export function slugify(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Mask sensitive information (e.g., email, phone)
 */
export function mask(str: string, visibleChars: number = 4, maskChar: string = '*'): string {
  if (!str || str.length <= visibleChars) return maskChar.repeat(str.length);
  const visible = str.slice(-visibleChars);
  return maskChar.repeat(str.length - visibleChars) + visible;
}

/**
 * Mask email address
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  const maskedLocal = mask(local, 2);
  return `${maskedLocal}@${domain}`;
}

/**
 * Extract domain from URL or email
 */
export function extractDomain(str: string): string | null {
  if (!str) return null;
  const urlMatch = str.match(/https?:\/\/([^/]+)/);
  if (urlMatch) return urlMatch[1];
  const emailMatch = str.match(/@([^\s]+)/);
  if (emailMatch) return emailMatch[1];
  return null;
}

/**
 * Check if string is a valid email
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract numbers from string
 */
export function extractNumbers(str: string): number[] {
  if (!str) return [];
  const matches = str.match(/\d+\.?\d*/g);
  return matches ? matches.map(Number) : [];
}

/**
 * Extract first number from string
 */
export function extractFirstNumber(str: string): number | null {
  const numbers = extractNumbers(str);
  return numbers.length > 0 ? numbers[0] : null;
}
