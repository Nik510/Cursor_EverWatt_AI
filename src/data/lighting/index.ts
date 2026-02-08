/**
 * MASTER LIGHTING DATABASE - INDEX
 * 
 * Complete lighting compendium for auditors, sales, and engineers
 * 
 * Includes:
 * - All bulb types with identification guides
 * - Replacement logic engine
 * - Best practices
 * - Company-specific customization
 */

export * from './bulb-types';
export * from './replacement-logic';
export * from './best-practices';

// Re-export for convenience
import { ALL_BULB_TYPES, findBulbType, getBulbTypesByCategory, getReplacementRecommendation } from './bulb-types';
import { calculateReplacement, calculateReplacementROI, COMPANY_REPLACEMENT_RULES } from './replacement-logic';
import { LIGHTING_BEST_PRACTICES, getBestPracticesByCategory } from './best-practices';

export const LightingDatabase = {
  // Bulb Types
  allBulbTypes: ALL_BULB_TYPES,
  findBulbType,
  getBulbTypesByCategory,
  getReplacementRecommendation,
  
  // Replacement Logic
  calculateReplacement,
  calculateReplacementROI,
  companyRules: COMPANY_REPLACEMENT_RULES,
  
  // Best Practices
  bestPractices: LIGHTING_BEST_PRACTICES,
  getBestPracticesByCategory,
  
  // Statistics
  get stats() {
    return {
      totalBulbTypes: ALL_BULB_TYPES.length,
      categories: Array.from(new Set(ALL_BULB_TYPES.map(b => b.category))),
      incandescent: ALL_BULB_TYPES.filter(b => b.category === 'incandescent').length,
      halogen: ALL_BULB_TYPES.filter(b => b.category === 'halogen').length,
      fluorescent: ALL_BULB_TYPES.filter(b => b.category === 'fluorescent').length,
      led: ALL_BULB_TYPES.filter(b => b.category === 'led').length,
      hid: ALL_BULB_TYPES.filter(b => b.category === 'hid').length,
    };
  },
};

