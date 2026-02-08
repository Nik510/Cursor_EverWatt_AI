/**
 * Utility Rate Management System
 * Comprehensive rate storage, calculation, and management
 */

// Types
export * from './types';

// Storage and management
export * from './storage';

// Calculation functions
export * from './calculations';

// Helper functions
export * from './helpers';

// Rate explanations
export * from './rate-explanations';

// Tariff tables (raw XLSX ingestion)
export * from './tariff-tables';

// Research notes (DOCX ingestion)
export * from './research-notes';

// Pre-populated rate data
export * from './rate-data';

// Initialize default rates on import
import { initializeDefaultRates } from './rate-data';
initializeDefaultRates();
