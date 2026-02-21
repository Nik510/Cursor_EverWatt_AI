import { auditDrawerV1VersionTag } from './constants';

export type AuditDrawerV1 = {
  version: typeof auditDrawerV1VersionTag;
  projectId: string;
  generatedAtIso: string;
  engineVersions: Record<string, unknown> | null;
  provenance: {
    deliverySnapshotId?: string;
    generationSnapshotId?: string;
    acquisitionMethodUsed?: string;
    evidencePointers: {
      interval?: { vaultFileId?: string; storageKey?: string; pointCount?: number; warningCount?: number };
      billing?: Record<string, unknown>;
    };
  };
  moneyExplainers: Record<string, MoneyExplainerV1>;
  warnings: string[];
};

export type MoneyExplainerV1 = {
  id: string;
  title: string;
  summaryLines: string[];
  lineItems: AuditLineItemV1[];
  totals: { dollars?: number; kwh?: number; kw?: number };
  sources: AuditSourceV1[];
  missingInfo: string[];
};

export type AuditLineItemV1 = {
  id: string;
  label: string;
  dollars: number | null;
  quantity?: number | null;
  unit?: string | null;
  rate?: number | null;
  periodYmd?: string | null;
  touPeriod?: string | null;
  sourceEngine: string;
  sourcePath: string;
  snapshotId?: string | null;
  rateSource?:
    | {
        snapshotId: string | null;
        rateCode: string | null;
        kind?: string;
        meta?: { generationEnergySnapshotId: string | null; addersSnapshotId: string | null; exitFeesSnapshotId: string | null } | null;
      }
    | null;
};

export type AuditSourceV1 = {
  kind: 'TARIFF_SNAPSHOT' | 'CCA_TOU_V0' | 'CCA_ADDERS_V0' | 'INTERVAL_EVIDENCE' | 'BILL_TEXT_EVIDENCE' | 'ENGINE_RULE';
  snapshotId?: string;
  rateCode?: string;
  note?: string;
  linkHints?: {
    tariffBrowserUrl?: string;
    intervalIntakeUrl?: string;
    billingIntakeUrl?: string;
    analysisUrl?: string;
  };
};

