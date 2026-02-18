export type CaIouUtilityV0 = 'PGE' | 'SCE' | 'SDGE';

export type CcaIdV0 = 'EBCE' | 'SVCE' | 'PCE' | 'CLEANPOWERSF' | 'CPA' | 'SDCP';

export type CcaAddersBreakdownItemV0 = {
  id: string;
  label: string;
  adderPerKwh: number;
  notes?: string[] | null;
};

export type CcaAddersSnapshotV0 = {
  snapshotId: string;
  iouUtility: CaIouUtilityV0;
  ccaId: CcaIdV0;
  effectiveStartYmd: string; // YYYY-MM-DD
  effectiveEndYmd: string | null; // YYYY-MM-DD inclusive, or null
  timezone: 'America/Los_Angeles';
  acquisitionMethodUsed: 'MANUAL_SEED_V0';
  /** Blended $/kWh adder (PCIA/NBC/other riders as applicable). */
  addersPerKwhTotal: number;
  /** Optional line-item view; may be partial/incomplete in v0. */
  addersBreakdown?: CcaAddersBreakdownItemV0[] | null;
  notes?: string[] | null;
};

export type CcaAddersSnapshotLookupResultV0 =
  | {
      ok: true;
      snapshot: CcaAddersSnapshotV0;
      billPeriodStartYmdUsed: string | null;
      warnings: string[];
    }
  | {
      ok: false;
      snapshot: null;
      billPeriodStartYmdUsed: string | null;
      warnings: string[];
    };

