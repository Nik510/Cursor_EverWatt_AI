/**
 * Training Content Index
 * Export all technology training content
 */

import type { TechPageData } from './lighting-content';
import { lightingContent } from './lighting-content';
import { chillerContent } from './chiller-content';
import { boilerContent } from './boiler-content';
import { vrfContent } from './vrf-content';
import { vfdContent } from './vfd-content';
import { batteryContent } from './battery-content';
import { coolingTowerContent } from './cooling-tower-content';
import { coolingSystemsContent } from './cooling-systems-content';

// EE Measures training data for AI insights
export * from './ee-measures';
export { 
  batteryMeasures, 
  hvacMeasures, 
  analysisSectionContexts,
  getMeasuresByCategory,
  getSectionContext,
  getAllTrainingContent,
} from './ee-measures';

export * from './lighting-content';
export { lightingContent } from './lighting-content';
export { chillerContent } from './chiller-content';
export { boilerContent } from './boiler-content';
export { vrfContent } from './vrf-content';
export { vfdContent } from './vfd-content';
export { batteryContent } from './battery-content';
export { coolingTowerContent } from './cooling-tower-content';
export { coolingSystemsContent } from './cooling-systems-content';

/**
 * Get training content by technology ID
 */
export function getTrainingContent(techId: string): TechPageData | null {
  switch (techId) {
    case 'lighting':
      return lightingContent;
    case 'chillers':
      return chillerContent;
    case 'cooling-systems':
      return coolingSystemsContent;
    case 'boilers':
      return boilerContent;
    case 'vrf':
      return vrfContent;
    case 'vfd':
      return vfdContent;
    case 'battery':
      return batteryContent;
    case 'cooling-tower':
    case 'tower':
      return coolingTowerContent;
    default:
      return null;
  }
}

