import type { UtilityProgram, UtilityProgramCategory, UtilityProgramUtility } from './types';
import { pgePrograms } from './pge-programs';
import { scePrograms } from './sce-programs';
import { sdgePrograms } from './sdge-programs';

export type { UtilityProgram, UtilityProgramCategory, UtilityProgramUtility };

export const utilityPrograms: UtilityProgram[] = [
  ...pgePrograms,
  ...scePrograms,
  ...sdgePrograms,
];
