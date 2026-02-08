/**
 * Battery storage module
 * Main entry point for battery simulation and analysis
 * 
 * @see EVERWATT_AI_CORE_VISION.md - All features must align with vendor-agnostic optimization
 * This module provides rate-aware dispatch optimization that works with any utility/BMS system.
 */

// Core types and logic (primary implementation)
export * from './types';
export * from './logic';

// Additional utilities (legacy/complementary)
export * from './degradation';
export * from './peak-shaving';
export * from './efficiency-diagnostics';
export * from './peak-pattern-analysis';
export * from './usage-optimization';
export * from './optimal-sizing';
// Note: battery library data is managed via the API (/api/library/batteries)
// to support admin CRUD and persistence. Avoid importing Node-only fs/path into the client bundle.

