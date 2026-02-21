export type ExitFeesProviderTypeV0 = 'CCA' | 'DA';
export type ExitFeesIouV0 = 'PGE' | 'SCE' | 'SDGE';

export type ExitFeesSnapshotV0 = {
  snapshotId: string;
  effectiveStartYmd: string; // YYYY-MM-DD
  acquisitionMethodUsed: 'MANUAL_SEED_V0';
  notes?: string[] | null;
  charges: {
    /** Total non-bypassable charges (NBCs) $/kWh (flat in v0). */
    nbcPerKwhTotal: number | null;
    /** Optional PCIA map by vintage key (v0 supports default-only application). */
    pciaPerKwhByVintage?: Record<string, number> | null;
    /** Default PCIA $/kWh when vintage is unknown (flat in v0). */
    pciaPerKwhDefault?: number | null;
    /** Other exit fees / departing load adders (flat in v0). */
    otherExitFeesPerKwhTotal: number | null;
  };
  applicability: {
    providerType: ExitFeesProviderTypeV0;
    iou: ExitFeesIouV0;
  };
};

export type ExitFeesSelectedChargesV0 = {
  nbcPerKwhTotal: number | null;
  pciaPerKwhApplied: number | null;
  otherExitFeesPerKwhTotal: number | null;
  /** Sum of components when fully available; otherwise null (truthful). */
  exitFeesPerKwhTotal: number | null;
};

export type ExitFeesSnapshotLookupResultV0 =
  | {
      ok: true;
      snapshot: ExitFeesSnapshotV0;
      effectiveYmdUsed: string | null;
      selectedCharges: ExitFeesSelectedChargesV0;
      warnings: string[];
    }
  | {
      ok: false;
      snapshot: null;
      effectiveYmdUsed: string | null;
      selectedCharges: ExitFeesSelectedChargesV0;
      warnings: string[];
    };

