export type WizardFindingV1 = {
  id: string;
  title: string;
  severity: 'info' | 'warning' | 'critical';
  confidence0to1: number;
  evidenceRefs: string[];
  summaryBullets: string[];
};

export type WizardChartV1 = {
  id: string;
  title: string;
  kind: 'timeseries' | 'bar' | 'table' | 'other';
  datasetRef: string;
};

export type WizardOpportunityV1 = {
  id: string;
  title: string;
  tier?: string;
  confidence0to1: number;
  prerequisites: string[];
  expectedRange?: string;
  risks: string[];
};

export type WizardOutputV1 = {
  wizardOutputHash: string;
  provenance: {
    reportId: string;
    projectId?: string | null;
    generatedAtIso: string;
    runIdsUsed: string[];
    revisionIdsUsed: string[];
    engineVersions: Record<string, string>;
  };
  dataQuality: {
    score0to100: number;
    missingInfoIds: string[];
    warnings: string[];
  };
  findings: WizardFindingV1[];
  charts: WizardChartV1[];
  opportunities: WizardOpportunityV1[];
};

