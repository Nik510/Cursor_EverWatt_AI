export type CaIouUtilityV0 = 'PGE' | 'SCE' | 'SDGE';

export type CcaIdV0 = 'EBCE' | 'SVCE' | 'PCE' | 'CLEANPOWERSF' | 'CPA' | 'SDCP';

export type CcaTouPeriodSnapshotV0 = {
  periodId: string;
  season: 'ALL';
  weekdays: 'ALL';
  /** Minutes since local midnight, 0..1439 */
  startMin: number;
  /** Minutes since local midnight, 1..1440 */
  endMin: number;
  pricePerKwh: number;
};

export type CcaGenerationTouSnapshotV0 = {
  snapshotId: string;
  iouUtility: CaIouUtilityV0;
  ccaId: CcaIdV0;
  ccaDisplayName: string;
  effectiveStartYmd: string; // YYYY-MM-DD
  effectiveEndYmd: string | null; // YYYY-MM-DD inclusive, or null
  timezone: 'America/Los_Angeles';
  customerClass: 'COMMERCIAL_DEFAULT';
  acquisitionMethodUsed: 'MANUAL_SEED_V0';
  touPeriods: CcaTouPeriodSnapshotV0[];
  notes: string[];
};

export type CcaGenerationSnapshotLookupResultV0 =
  | {
      ok: true;
      snapshot: CcaGenerationTouSnapshotV0;
      /** If provided, indicates the bill period start used for effective selection. */
      billPeriodStartYmdUsed: string | null;
      warnings: string[];
    }
  | {
      ok: false;
      snapshot: null;
      billPeriodStartYmdUsed: string | null;
      warnings: string[];
    };

export type TouPriceWindowV0 = {
  periodId: string;
  startHourLocal: number;
  endHourLocalExclusive: number;
  days: 'all' | 'weekday' | 'weekend';
  pricePerKwh: number;
};

export type GenerationTouEnergySignalsV0 = {
  generationSnapshotId: string;
  generationRateCode: string; // `${ccaId}@${effectiveStartYmd}`
  generationTouEnergyPrices: TouPriceWindowV0[];
  warnings: string[];
};

