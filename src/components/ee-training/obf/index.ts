/**
 * OBF (On-Bill Financing) Components
 * Components for displaying and filtering OBF eligibility
 */

export { OBFBadge, OBFBadgeWithDetails } from './OBFBadge';
export type { OBFBadgeProps, OBFBadgeWithDetailsProps } from './OBFBadge';

export { OBFFilter, OBFQuickFilter } from './OBFFilter';
export type { OBFFilterProps, OBFFilterValue } from './OBFFilter';

// Re-export data types and utilities
export type { 
  OBFEligibility, 
  UtilityProvider, 
  UtilityOBFProgram 
} from '../../../data/obf/obf-eligibility';

export { 
  getOBFEligibility,
  getMeasuresByEligibility,
  getEligibleMeasuresByUtility,
  getCategoryEligibility,
  obfEligibilityRules,
  obfEligibilityByCategory,
  defaultUtilityPrograms,
} from '../../../data/obf/obf-eligibility';
