import type {
  DRMoney,
  DRPanelV2,
  DRProgramResult,
} from '../modules/battery/dr-panel-adapter';

// Frontend-friendly exports for DR data returned by the API.
export type DRPanel = DRPanelV2;
export type { DRProgramResult, DRMoney };
