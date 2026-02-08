import type { TariffModel, TariffOption } from '../types';

function endsWithS(rateCode: string | undefined | null): boolean {
  if (!rateCode) return false;
  return rateCode.toUpperCase().trim().replace(/\s+/g, '').replace(/-/g, '').endsWith('S');
}

const DEFAULT_OPTION_S_RATES_2025 = {
  dailyPeakRatePerKwDay: 1.61,
  dailyPartPeakRatePerKwDay: 0.08,
  monthlyMaxAllHoursRatePerKwMonth: 1.23,
  monthlyMaxExclWindowRatePerKwMonth: 6.72,
  monthlyExclusionHoursLocal: { startHour: 9, endHour: 14 },
  peakHoursLocal: { startHour: 16, endHour: 21 },
  partPeakWindowsLocal: [
    { startHour: 14, endHour: 16 },
    { startHour: 21, endHour: 23 },
  ],
};

function hourWindowToMinutes(w: { startHour: number; endHour: number }) {
  return { startMinute: w.startHour * 60, endMinute: w.endHour * 60 };
}

/**
 * Phase 1 requirement:
 * - Option S must exist ONLY as a TariffOption rule in this module (no special-case engine).
 *
 * Note: Billing math + exact determinants will be implemented in the Phase 1 billing oracle.
 */
export const PgeOptionS: TariffOption = {
  optionId: 'pge:option_s',
  version: 'phase1-v1',
  kind: 'eligibility_trigger',
  name: 'PG&E Option S',
  utility: 'PG&E',

  trigger_conditions: (baseline) => baseline.territory.utility === 'PG&E',

  eligibility_rules: (baseline, candidateAssets) => {
    const reasons: string[] = [];
    const missingInfo = [];
    const evidenceUsed = baseline.dataQuality.evidenceUsed ?? [];

    // If the customer is already on an Option S schedule, we should not treat this as a switch candidate.
    if (endsWithS(baseline.tariffInference.detectedRateCode) || endsWithS(baseline.territory.rateCodeFromUser)) {
      return {
        passed: false,
        confidence: 1,
        reasons: ['Customer appears to already be on an Option S schedule (no “switch” needed).'],
        missingInfo: [],
        evidenceUsed,
      };
    }

    const batt = candidateAssets.battery;
    const peak = baseline.derived.peakKw_12mo;

    if (!batt) {
      missingInfo.push({
        id: 'battery.spec',
        title: 'Battery specification required',
        whyNeeded: 'Option S eligibility and dispatch evaluation require battery kW/kWh and efficiency.',
        howToGet: 'Enter battery power (kW), energy (kWh), and round-trip efficiency (or provide a cut sheet).',
        severity: 'blocker',
      });
    }
    if (!Number.isFinite(peak ?? NaN) || (peak ?? 0) <= 0) {
      missingInfo.push({
        id: 'intervals.peak_12mo',
        title: 'Trailing 12-month peak demand required',
        whyNeeded: 'Option S eligibility uses a deterministic kW gate based on trailing peak demand.',
        howToGet: 'Provide a full year of 15-minute intervals or provide the trailing 12-month peak from bills/utility portal.',
        severity: 'blocker',
      });
    }

    if (batt && Number.isFinite(peak ?? NaN) && (peak ?? 0) > 0) {
      const minKwRequired = 0.1 * (peak ?? 0);
      const ok = batt.powerKw >= minKwRequired;
      reasons.push(
        ok
          ? `✓ Battery power (${batt.powerKw.toFixed(2)} kW) meets >=10% of trailing peak (${minKwRequired.toFixed(2)} kW).`
          : `✗ Battery power (${batt.powerKw.toFixed(2)} kW) is below >=10% of trailing peak (${minKwRequired.toFixed(2)} kW).`
      );
      return {
        passed: ok,
        confidence: 1,
        reasons,
        missingInfo,
        evidenceUsed,
      };
    }

    // If we cannot evaluate deterministically, be honest: fail with missing info.
    return {
      passed: false,
      confidence: 0,
      reasons: ['Insufficient inputs to deterministically evaluate Option S eligibility.'],
      missingInfo,
      evidenceUsed,
    };
  },

  billing_transform: (base, baseline) => {
    // Deterministic tariff transformation: represent Option S as its own demand determinant set.
    // (This is NOT an Option-S special engine; it is a TariffOption that transforms TariffModel.)
    const tz = base.timezone || 'America/Los_Angeles';
    const excl = DEFAULT_OPTION_S_RATES_2025.monthlyExclusionHoursLocal;
    const peak = DEFAULT_OPTION_S_RATES_2025.peakHoursLocal;
    const part = DEFAULT_OPTION_S_RATES_2025.partPeakWindowsLocal;

    const transformedTariff: TariffModel = {
      version: base.version,
      tariffId: `${base.tariffId}::pge_option_s`,
      rateCode: `${base.rateCode}S`,
      timezone: tz,
      fixedMonthlyChargeUsd: base.fixedMonthlyChargeUsd ?? 0,
      energyCharges: base.energyCharges ?? [],
      meta: { ...base.meta, utility: 'PG&E', territory: baseline.territory.territory ?? base.meta.territory },
      demandDeterminants: [
        {
          id: 'optionS.dailyPeak',
          name: 'Option S daily peak demand',
          kind: 'dailyMax',
          windows: [
            {
              name: 'daily_peak',
              ...hourWindowToMinutes(peak),
              days: 'all',
              season: 'all',
            },
          ],
          tiers: [{ pricePerKw: DEFAULT_OPTION_S_RATES_2025.dailyPeakRatePerKwDay }],
        },
        {
          id: 'optionS.dailyPartPeak',
          name: 'Option S daily part-peak demand',
          kind: 'dailyMax',
          windows: part.map((w, idx) => ({
            name: `daily_part_${idx + 1}`,
            ...hourWindowToMinutes(w),
            days: 'all',
            season: 'all',
          })),
          tiers: [{ pricePerKw: DEFAULT_OPTION_S_RATES_2025.dailyPartPeakRatePerKwDay }],
        },
        {
          id: 'optionS.monthlyAllHours',
          name: 'Option S monthly max demand (all hours)',
          kind: 'monthlyMax',
          tiers: [{ pricePerKw: DEFAULT_OPTION_S_RATES_2025.monthlyMaxAllHoursRatePerKwMonth }],
        },
        {
          id: 'optionS.monthlyExcl',
          name: 'Option S monthly max demand (excluding 09:00–14:00)',
          kind: 'monthlyMax',
          // Represent exclusion window by including ALL OTHER hours as two windows.
          windows: [
            { name: 'outside_excl_1', startMinute: 0, endMinute: excl.startHour * 60, days: 'all', season: 'all' },
            { name: 'outside_excl_2', startMinute: excl.endHour * 60, endMinute: 24 * 60, days: 'all', season: 'all' },
          ],
          tiers: [{ pricePerKw: DEFAULT_OPTION_S_RATES_2025.monthlyMaxExclWindowRatePerKwMonth }],
        },
      ],
    };
    return {
      transformedTariff,
      transformNotes: [
        'Replaced base demand determinants with PG&E Option S determinants (daily peak, daily part-peak, monthly all-hours max, monthly max excluding 09:00–14:00 local).',
        `Rates (2025 secondary): dailyPeak=$${DEFAULT_OPTION_S_RATES_2025.dailyPeakRatePerKwDay}/kW-day, dailyPart=$${DEFAULT_OPTION_S_RATES_2025.dailyPartPeakRatePerKwDay}/kW-day, monthlyAllHours=$${DEFAULT_OPTION_S_RATES_2025.monthlyMaxAllHoursRatePerKwMonth}/kW-month, monthlyExcl=$${DEFAULT_OPTION_S_RATES_2025.monthlyMaxExclWindowRatePerKwMonth}/kW-month.`,
      ],
    };
  },

  required_assets: [
    { id: 'battery', description: 'Battery storage system (kW/kWh) to meet eligibility threshold.' },
  ],

  evidence_requirements: [
    {
      id: 'battery_cut_sheet',
      description: 'Battery cut sheet showing inverter kW and usable kWh.',
      required: true,
      evidence: [{ kind: 'battery_cut_sheet' }],
    },
    {
      id: 'trailing_peak',
      description: 'Trailing 12-month peak demand (kW) from interval data or utility portal/bills.',
      required: true,
      evidence: [{ kind: 'interval_data' }, { kind: 'utility_portal_export' }, { kind: 'bill_pdf' }],
    },
  ],

  explain_text: {
    summary:
      'Option S is treated as a deterministic tariff option that can create structural savings via billing-regime changes, with dispatch value evaluated separately.',
    details: [
      'Eligibility is evaluated deterministically (no AI) using explicit rules and evidence requirements.',
      'Savings are split into structural (tariff-only, no dispatch) vs operational (dispatch under the scenario).',
    ],
  },
};

