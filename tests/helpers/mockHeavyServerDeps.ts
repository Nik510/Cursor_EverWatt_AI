import { vi } from 'vitest';

// Many endpoint tests only need tariff/program/registry routes.
// `src/server.ts` currently imports battery/optimization modules that pull in heavy deps.
// Mock them so importing the server doesn't load those modules (and doesn't blow memory).

function notInThisTest(name: string) {
  return () => {
    throw new Error(`Unexpected call to ${name} in endpoint test`);
  };
}

vi.mock('../../src/modules/battery/logic', () => ({
  simulatePeakShaving: notInThisTest('simulatePeakShaving'),
  detectPeakEvents: notInThisTest('detectPeakEvents'),
  optimizeThresholdForValue: notInThisTest('optimizeThresholdForValue'),
}));

vi.mock('../../src/modules/battery/efficiency-diagnostics', () => ({
  analyzeBatteryEfficiency: notInThisTest('analyzeBatteryEfficiency'),
}));

vi.mock('../../src/modules/battery/peak-pattern-analysis', () => ({
  classifyPeakPatterns: notInThisTest('classifyPeakPatterns'),
  analyzeEventFrequency: notInThisTest('analyzeEventFrequency'),
}));

vi.mock('../../src/modules/battery/usage-optimization', () => ({
  buildUsageOptimization: notInThisTest('buildUsageOptimization'),
}));

vi.mock('../../src/modules/battery/optimal-sizing', () => ({
  recommendOptimalSizing: notInThisTest('recommendOptimalSizing'),
}));

vi.mock('../../src/modules/battery/multi-tier-analysis', () => ({
  generateBestRecommendation: notInThisTest('generateBestRecommendation'),
}));

vi.mock('../../src/modules/battery/dr-panel', () => ({
  computeDrPanel: notInThisTest('computeDrPanel'),
}));

vi.mock('../../src/modules/battery/dr-panel-adapter', () => ({
  toDrPanelV2: notInThisTest('toDrPanelV2'),
}));

vi.mock('../../src/modules/battery/optimal-selection', () => ({
  computeCapDiscoveryAcrossMonths: notInThisTest('computeCapDiscoveryAcrossMonths'),
  selectOptimalBatteries: notInThisTest('selectOptimalBatteries'),
}));

vi.mock('../../src/utils/battery/s-rate-calculations', () => ({
  calculateOptionSDemandCharges: notInThisTest('calculateOptionSDemandCharges'),
  DEFAULT_OPTION_S_RATES_2025_SECONDARY: {},
}));

vi.mock('../../src/modules/battery/dispatch', () => ({
  runOptionSDispatch: notInThisTest('runOptionSDispatch'),
  runStandardPeakShavingDispatch: notInThisTest('runStandardPeakShavingDispatch'),
}));

vi.mock('../../src/utils/economics/battery-economics', () => ({
  gradeBatteryEconomics: notInThisTest('gradeBatteryEconomics'),
}));

