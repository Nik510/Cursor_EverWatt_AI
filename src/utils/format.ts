/**
 * Formatting Utilities
 * Provides functions for formatting numbers, currency, dates, and percentages
 */

/**
 * Format a number with specified decimal places
 */
export function formatNumber(
  value: number,
  decimals: number = 2,
  options?: {
    useGrouping?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  if (isNaN(value) || !isFinite(value)) {
    return 'N/A';
  }

  const {
    useGrouping = true,
    minimumFractionDigits = decimals,
    maximumFractionDigits = decimals,
  } = options || {};

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping,
  }).format(value);
}

/**
 * Format a number as currency
 */
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  decimals: number = 2
): string {
  if (isNaN(value) || !isFinite(value)) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a number as a percentage
 */
export function formatPercent(
  value: number,
  decimals: number = 1
): string {
  if (isNaN(value) || !isFinite(value)) {
    return 'N/A';
  }

  return `${formatNumber(value * 100, decimals)}%`;
}

/**
 * Format a number with unit suffix (K, M, B for thousands, millions, billions)
 */
export function formatNumberWithUnit(
  value: number,
  decimals: number = 2,
  unit: string = ''
): string {
  if (isNaN(value) || !isFinite(value)) {
    return 'N/A';
  }

  const absValue = Math.abs(value);
  let formatted: string;
  let suffix = '';

  if (absValue >= 1_000_000_000) {
    formatted = formatNumber(value / 1_000_000_000, decimals);
    suffix = 'B';
  } else if (absValue >= 1_000_000) {
    formatted = formatNumber(value / 1_000_000, decimals);
    suffix = 'M';
  } else if (absValue >= 1_000) {
    formatted = formatNumber(value / 1_000, decimals);
    suffix = 'K';
  } else {
    formatted = formatNumber(value, decimals);
  }

  return unit ? `${formatted}${suffix} ${unit}` : `${formatted}${suffix}`;
}

/**
 * Format energy values (kW, MW, kWh, MWh) with appropriate units
 */
export function formatEnergy(
  value: number,
  unit: 'kW' | 'MW' | 'kWh' | 'MWh',
  decimals: number = 2
): string {
  if (isNaN(value) || !isFinite(value)) {
    return 'N/A';
  }

  // Auto-scale if value is very large or small
  if (unit === 'kW' && value >= 1000) {
    return `${formatNumber(value / 1000, decimals)} MW`;
  }
  if (unit === 'MW' && value < 1 && value > 0) {
    return `${formatNumber(value * 1000, decimals)} kW`;
  }
  if (unit === 'kWh' && value >= 1000) {
    return `${formatNumber(value / 1000, decimals)} MWh`;
  }
  if (unit === 'MWh' && value < 1 && value > 0) {
    return `${formatNumber(value * 1000, decimals)} kWh`;
  }

  return `${formatNumber(value, decimals)} ${unit}`;
}

/**
 * Format a date
 */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return new Intl.DateTimeFormat('en-US', options || defaultOptions).format(dateObj);
}

/**
 * Format a date and time
 */
export function formatDateTime(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  return new Intl.DateTimeFormat('en-US', options || defaultOptions).format(dateObj);
}

/**
 * Format a time (HH:MM or HH:MM:SS)
 */
export function formatTime(
  date: Date | string,
  includeSeconds: boolean = false
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Invalid Time';
  }

  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  const seconds = includeSeconds ? `:${dateObj.getSeconds().toString().padStart(2, '0')}` : '';

  return `${hours}:${minutes}${seconds}`;
}

/**
 * Format a duration in seconds to human-readable format
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
    return 'N/A';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Format file size in bytes to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (isNaN(bytes) || !isFinite(bytes) || bytes < 0) {
    return 'N/A';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${formatNumber(size, unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

/**
 * Format a phone number (US format)
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone;
}

/**
 * Format a large number with commas
 */
export function formatWithCommas(value: number | string): string {
  if (typeof value === 'string') {
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  return formatNumber(value, 0, { useGrouping: true });
}
