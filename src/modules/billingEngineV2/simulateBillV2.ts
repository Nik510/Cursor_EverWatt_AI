import type { DeterminantsPackV1, EvidenceItemV1 } from '../determinants/types';
import type { MissingInfoItemV0 } from '../utilityIntelligence/missingInfo/types';
import type { TariffRateMetadata } from '../tariffLibrary/types';
import { resolvePgeSimRateForCode } from '../billingEngineV1/rates/pge_catalog_v1';

import type { BillCycleSimV2, BillLineItemV2, BillSimV2, TouPeriodKeyV2 } from './types';

function clampMoney(x: number): number {
  // deterministic rounding to 4 decimals for audit stability; UI can format later.
  return Math.round(x * 10000) / 10000;
}

function monthIndexFromIso(iso: string): number | null {
  const ms = new Date(String(iso || '').trim()).getTime();
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  return d.getUTCFullYear() * 12 + d.getUTCMonth(); // 0-based month index
}

function daysBetweenIso(startIso: string, endIso: string): number | null {
  const a = new Date(String(startIso || '').trim()).getTime();
  const b = new Date(String(endIso || '').trim()).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  const days = (b - a) / (24 * 60 * 60 * 1000);
  // Billing cycles are usually whole-day boundaries; round to nearest integer deterministically.
  return Math.max(0, Math.round(days));
}

function ev(kind: EvidenceItemV1['kind'], source: string, key: string, value: any, snippet?: string): EvidenceItemV1 {
  return { kind, pointer: { source, key, value, ...(snippet ? { snippet } : {}) } };
}

function touLabelToCanonical(label: string): TouPeriodKeyV2 | null {
  const s = String(label || '').trim().toUpperCase();
  if (s === 'PEAK' || s === 'ON_PEAK' || s === 'ONPEAK') return 'onPeak';
  if (s === 'PARTIAL_PEAK' || s === 'PARTIALPEAK') return 'partialPeak';
  if (s === 'OFF_PEAK' || s === 'OFFPEAK') return 'offPeak';
  if (s === 'SUPER_OFF_PEAK' || s === 'SUPEROFFPEAK') return 'superOffPeak';
  return null;
}

function sumNullable(nums: Array<number | null | undefined>): number | null {
  let sum = 0;
  for (const n of nums) {
    if (n === null || n === undefined) return null;
    if (!Number.isFinite(Number(n))) return null;
    sum += Number(n);
  }
  return sum;
}

export function simulateBillSimV2(args: {
  determinantsPack: DeterminantsPackV1 | null | undefined;
  tariffMetadata: TariffRateMetadata | null | undefined;
  /**
   * Optional override for rate catalog resolution (tests).
   * When provided, should match resolvePgeSimRateForCode(...) return shape.
   */
  resolveRate?: (rateCode: string) => any | null;
}): BillSimV2 | null {
  const pack = args.determinantsPack || null;
  if (!pack) return null;

  const tariff = args.tariffMetadata || null;
  const utility = String(pack.utility || '').trim() || 'unknown';
  const rateCode = String(pack.rateCode || '').trim();
  const warnings: string[] = [];
  const missingInfo: MissingInfoItemV0[] = [];

  if (!rateCode) {
    missingInfo.push({
      id: 'billSimV2.rateCode.missing',
      category: 'tariff',
      severity: 'blocking',
      description: 'Rate code is missing; cannot simulate a bill deterministically.',
    });
    return {
      version: 'billSimV2.v1',
      utility,
      rateCode,
      businessFamilyKey: tariff?.businessFamilyKey ?? null,
      rateCatalogId: null,
      meters: [],
      warnings,
      missingInfo,
    };
  }

  if (String(utility).toUpperCase() !== 'PGE') {
    missingInfo.push({
      id: 'billSimV2.utility.not_supported',
      category: 'tariff',
      severity: 'info',
      description: `Bill simulation v2 supports PG&E canon families only (got utility=${utility}).`,
    });
    return {
      version: 'billSimV2.v1',
      utility,
      rateCode,
      businessFamilyKey: tariff?.businessFamilyKey ?? null,
      rateCatalogId: null,
      meters: [],
      warnings,
      missingInfo,
    };
  }

  if (tariff && tariff.isBusinessRelevant === false) {
    missingInfo.push({
      id: 'billSimV2.rate.residential_or_not_business',
      category: 'tariff',
      severity: 'info',
      description: 'Current rate is not business-relevant; billSimV2 is intended for canon business tariffs.',
    });
  }
  if (tariff && tariff.isEverWattCanonicalBusiness === false) {
    missingInfo.push({
      id: 'billSimV2.rate.non_canon',
      category: 'tariff',
      severity: 'info',
      description: 'Current rate is not in EverWatt canon business families; simulation uses best-effort simulated mapping.',
    });
  }

  const resolve = args.resolveRate || resolvePgeSimRateForCode;
  const rateDef = resolve(rateCode);
  if (!rateDef) {
    missingInfo.push({
      id: 'billSimV2.rateCatalog.missing',
      category: 'tariff',
      severity: 'warning',
      description: `No simulated rate definition found for rateCode=${rateCode}; cannot compute line items.`,
    });
  }

  // Ratchets: do not guess; surface when flagged and provide an explicit hook.
  let ratchetModelStatus: BillSimV2['ratchetModelStatus'] = 'unknown';
  let ratchetModelPlaceholder: BillSimV2['ratchetModelPlaceholder'] = null;
  const demandTypes = Array.isArray(tariff?.chargeDeterminantsVNext?.demandChargeTypes) ? tariff?.chargeDeterminantsVNext?.demandChargeTypes : [];
  if (demandTypes.includes('ratchet')) {
    ratchetModelStatus = 'likely_applies_unmodeled';
    ratchetModelPlaceholder = {
      kind: 'unmodeled_hook_v0',
      notes: [
        'Tariff indicates ratchet-style demand charges.',
        'billSimV2 does not model ratchets yet; add a deterministic ratchet rule definition per family and include evidence pointers.',
      ],
    };
    missingInfo.push({
      id: 'billSimV2.demand.ratchet.unmodeled',
      category: 'tariff',
      severity: 'warning',
      description: 'Tariff indicates ratchet-style demand charges; ratchets are not modeled in billSimV2 (hook only).',
    });
  } else if (tariff && Array.isArray(demandTypes)) {
    ratchetModelStatus = 'not_applicable';
  }

  const meters = (pack.meters || []).map((m) => {
    // Alignment window selection: simulate latest contiguous 12 reconcilable months when reconciliation info is available.
    const reconMatches = Array.isArray((m as any)?.reconciliation?.matches) ? ((m as any).reconciliation.matches as any[]) : [];
    const reconcilable = reconMatches.filter((x) => Boolean(x?.isReconcilable) && String(x?.cycleLabel || '').trim());
    const reconcilableLabels = new Set(reconcilable.map((x) => String(x.cycleLabel).trim()));

    const cycleCandidates = (m.cycles || [])
      .map((c: any) => ({
        label: String(c?.cycle?.label || '').trim(),
        endIso: String(c?.cycle?.endIso || '').trim(),
        startIso: String(c?.cycle?.startIso || '').trim(),
      }))
      .filter((c) => c.label && c.endIso && (reconcilableLabels.size ? reconcilableLabels.has(c.label) : true))
      .map((c) => ({ ...c, monthIndex: monthIndexFromIso(c.endIso) }))
      .filter((c) => Number.isFinite(c.monthIndex as any)) as Array<{ label: string; endIso: string; startIso: string; monthIndex: number }>;

    let selectedLabels: Set<string> | null = null;
    if (reconcilableLabels.size && cycleCandidates.length) {
      const byMonthIndex = new Map<number, string>();
      for (const c of cycleCandidates) {
        // One cycle per month per meter; keep deterministic (first wins).
        if (!byMonthIndex.has(c.monthIndex)) byMonthIndex.set(c.monthIndex, c.label);
      }
      const sortedStart = Array.from(byMonthIndex.keys()).sort((a, b) => b - a);
      let best: { start: number; labels: string[] } | null = null;
      for (const start of sortedStart) {
        const labels: string[] = [];
        for (let k = 0; k < 12; k++) {
          const lab = byMonthIndex.get(start - k);
          if (!lab) break;
          labels.push(lab);
        }
        if (labels.length >= 12) {
          best = { start, labels: labels.slice(0, 12) };
          break;
        }
        if (!best || labels.length > best.labels.length) best = { start, labels };
      }
      selectedLabels = new Set((best?.labels || []).map(String));
      if (selectedLabels.size < 12) {
        missingInfo.push({
          id: `billSimV2.window.overlap.insufficientCycles.${String(m.meterId || 'meter')}`,
          category: 'billing',
          severity: 'info',
          description: 'Bill simulation uses the latest contiguous overlap window; fewer than 12 reconcilable cycles were available.',
          details: { meterId: String(m.meterId || ''), reconcilableCycleCount: reconcilableLabels.size, selectedCycleCount: selectedLabels.size, desiredCycles: 12 },
        });
      }
    }

    const cycles: BillCycleSimV2[] = [];
    for (const c of m.cycles || []) {
      const cycleLabel0 = String(c.cycle?.label || '').trim() || 'unknown_cycle';
      if (selectedLabels && !selectedLabels.has(cycleLabel0)) continue;
      const cycleMissing: MissingInfoItemV0[] = [];
      const cycleWarnings: string[] = Array.isArray(c.warnings) ? c.warnings.slice() : [];

      const cycleLabel = cycleLabel0;
      const startIso = String(c.cycle?.startIso || '').trim();
      const endIso = String(c.cycle?.endIso || '').trim();

      const lineItems: BillLineItemV2[] = [];

      // Fixed charges
      const fixedDollars: number | null = (() => {
        if (!rateDef?.billing?.fixedCharges || !Array.isArray(rateDef.billing.fixedCharges) || rateDef.billing.fixedCharges.length === 0) {
          cycleMissing.push({
            id: `billSimV2.fixed.missing.${cycleLabel}`,
            category: 'tariff',
            severity: 'info',
            description: 'Fixed customer charges are unknown for this simulated rate definition.',
          });
          return null;
        }
        const days = daysBetweenIso(startIso, endIso);
        if (days === null) {
          cycleMissing.push({
            id: `billSimV2.fixed.days_missing.${cycleLabel}`,
            category: 'billing',
            severity: 'warning',
            description: 'Billing cycle day count could not be derived; cannot compute per-day fixed charges deterministically.',
          });
        }
        let sum = 0;
        for (const fc of rateDef.billing.fixedCharges) {
          const kind = String(fc?.kind || '');
          const dollars = Number(fc?.dollars);
          if (!Number.isFinite(dollars)) continue;
          if (kind === 'perMonth') {
            const d = dollars;
            sum += d;
            lineItems.push({
              id: `fixed.perMonth`,
              type: 'fixed',
              cycleLabel,
              quantity: 1,
              unit: 'month',
              rate: dollars,
              rateUnit: '$/month',
              dollars: clampMoney(d),
              evidence: [
                ev('assumption', `rateCatalog:${String(rateDef.rateId || 'unknown')}`, 'fixedCharges.perMonth', dollars),
                ev('intervalCalc', 'determinantsPack', 'cycle.label', cycleLabel),
              ],
              notes: ['Fixed charge from simulated catalog (placeholder values).'],
            });
          } else if (kind === 'perDay') {
            const q = days;
            if (q === null) continue;
            const d = dollars * q;
            sum += d;
            lineItems.push({
              id: `fixed.perDay`,
              type: 'fixed',
              cycleLabel,
              quantity: q,
              unit: 'day',
              rate: dollars,
              rateUnit: '$/day',
              dollars: clampMoney(d),
              evidence: [
                ev('assumption', `rateCatalog:${String(rateDef.rateId || 'unknown')}`, 'fixedCharges.perDay', dollars),
                ev('intervalCalc', 'determinantsPack', 'cycle.days', q),
              ],
              notes: ['Fixed charge from simulated catalog (placeholder values).'],
            });
          }
        }
        return Number.isFinite(sum) ? clampMoney(sum) : null;
      })();

      // Demand charges
      const demandDollars: number | null = (() => {
        if (!rateDef?.demandCharges || !Array.isArray(rateDef.demandCharges) || rateDef.demandCharges.length === 0) return 0;
        let sum = 0;
        for (const dc of rateDef.demandCharges) {
          const kind = String(dc?.kind || '');
          const dollarsPerKw = Number(dc?.dollarsPerKw);
          const touLabel = String(dc?.touLabel || 'ANY');
          if (!Number.isFinite(dollarsPerKw)) {
            cycleMissing.push({
              id: `billSimV2.demand.rate_missing.${cycleLabel}.${kind}.${touLabel}`,
              category: 'tariff',
              severity: 'warning',
              description: `Demand charge rate is missing for kind=${kind} touLabel=${touLabel}.`,
            });
            continue;
          }

          let kw: number | null = null;
          let touPeriod: TouPeriodKeyV2 | undefined;
          if (kind === 'monthlyMaxKw') {
            const v = c.demand?.billingDemandKw ?? c.demand?.kWMax ?? null;
            kw = Number.isFinite(Number(v)) ? Number(v) : null;
          } else if (kind === 'touMaxKw') {
            const canon = touLabelToCanonical(touLabel);
            touPeriod = canon || undefined;
            const v = canon ? (c.demand?.kWMaxByTouPeriod as any)?.[canon] : null;
            kw = Number.isFinite(Number(v)) ? Number(v) : null;
            if (kw === null) {
              cycleMissing.push({
                id: `billSimV2.demand.tou_missing.${cycleLabel}.${canon || 'unknown'}`,
                category: 'tariff',
                severity: 'info',
                description: 'TOU demand buckets are missing; cannot compute TOU demand charges deterministically.',
              });
            }
          } else {
            cycleMissing.push({
              id: `billSimV2.demand.kind_unknown.${cycleLabel}.${kind}`,
              category: 'tariff',
              severity: 'info',
              description: `Demand charge kind=${kind} is not modeled in billSimV2.`,
            });
            continue;
          }

          if (kw === null) {
            cycleMissing.push({
              id: `billSimV2.demand.kw_missing.${cycleLabel}.${kind}.${touLabel}`,
              category: 'billing',
              severity: 'warning',
              description: 'Demand kW determinant is missing; cannot compute demand charges deterministically.',
            });
            continue;
          }

          const dollars = dollarsPerKw * kw;
          sum += dollars;
          lineItems.push({
            id: `demand.${kind}.${touLabel}`,
            type: 'demand',
            cycleLabel,
            ...(touPeriod ? { touPeriod } : {}),
            rateTouLabel: touLabel,
            quantity: kw,
            unit: 'kW',
            rate: dollarsPerKw,
            rateUnit: '$/kW',
            dollars: clampMoney(dollars),
            evidence: [
              ev('assumption', `rateCatalog:${String(rateDef.rateId || 'unknown')}`, `demandCharges.${kind}.${touLabel}.$PerkW`, dollarsPerKw),
              ev('intervalCalc', 'determinantsPack', kind === 'monthlyMaxKw' ? 'demand.billingDemandKw' : `demand.kWMaxByTouPeriod.${String(touPeriod || '')}`, kw),
            ],
            notes: Array.isArray(dc?.notes) ? dc.notes.slice(0, 2).map(String) : ['Demand charge from simulated catalog (placeholder values).'],
          });
        }
        return Number.isFinite(sum) ? clampMoney(sum) : null;
      })();

      // Energy charges (TOU)
      const energyDollars: number | null = (() => {
        if (!rateDef?.energyCharges || typeof rateDef.energyCharges !== 'object') {
          cycleMissing.push({
            id: `billSimV2.energy.rate_missing.${cycleLabel}`,
            category: 'tariff',
            severity: 'warning',
            description: 'Energy charge rates are missing for this simulated rate definition.',
          });
          return null;
        }

        const kwhByTou = (c.energy as any)?.kwhByTouPeriod || null;
        if (!kwhByTou || typeof kwhByTou !== 'object' || Object.keys(kwhByTou).length === 0) {
          cycleMissing.push({
            id: `billSimV2.energy.kwhByTouPeriod.missing.${cycleLabel}`,
            category: 'billing',
            severity: 'info',
            description: 'kWh by TOU period is missing; cannot compute TOU energy charges deterministically.',
          });
          return null;
        }

        let sum = 0;
        // Map canonical TOU buckets into rateDef energy labels (best-effort).
        const map: Record<TouPeriodKeyV2, string[]> = {
          onPeak: ['PEAK', 'ON_PEAK'],
          partialPeak: ['PARTIAL_PEAK'],
          offPeak: ['OFF_PEAK'],
          superOffPeak: ['SUPER_OFF_PEAK'],
        };
        for (const canon of Object.keys(map) as TouPeriodKeyV2[]) {
          const kwh = Number((kwhByTou as any)[canon]);
          if (!Number.isFinite(kwh)) continue;
          const labels = map[canon];
          const label = labels.find((l) => typeof (rateDef.energyCharges as any)[l] === 'number') || null;
          if (!label) {
            cycleMissing.push({
              id: `billSimV2.energy.tou_label_missing.${cycleLabel}.${canon}`,
              category: 'tariff',
              severity: 'info',
              description: `Rate definition lacks an energy charge for canonical TOU bucket ${canon}.`,
            });
            continue;
          }
          const dollarsPerKwh = Number((rateDef.energyCharges as any)[label]);
          if (!Number.isFinite(dollarsPerKwh)) continue;
          const dollars = dollarsPerKwh * kwh;
          sum += dollars;
          lineItems.push({
            id: `energy.${canon}`,
            type: 'energy',
            cycleLabel,
            touPeriod: canon,
            rateTouLabel: label,
            quantity: kwh,
            unit: 'kWh',
            rate: dollarsPerKwh,
            rateUnit: '$/kWh',
            dollars: clampMoney(dollars),
            evidence: [
              ev('assumption', `rateCatalog:${String(rateDef.rateId || 'unknown')}`, `energyCharges.${label}.$PerkWh`, dollarsPerKwh),
              ev('intervalCalc', 'determinantsPack', `energy.kwhByTouPeriod.${canon}`, kwh),
            ],
            notes: ['Energy charge computed from kWhByTouPeriod (determinants) and simulated catalog rates.'],
          });
        }
        return Number.isFinite(sum) ? clampMoney(sum) : null;
      })();

      const otherDollars: number | null = 0;
      const totalDollars = sumNullable([fixedDollars, demandDollars, energyDollars, otherDollars]);

      // Roll up cycle-level missingInfo/warnings from determinants too.
      for (const mi of (Array.isArray(c.missingInfo) ? c.missingInfo : [])) cycleMissing.push(mi);

      const hasTouEnergyCoverageMissing = cycleMissing.some((mi: any) => String(mi?.id || '').includes('determinants.tou.energy.coverage.low'));
      // v1.1 rule: only mark partial when TOU kWh buckets are missing or coverage is insufficient.
      const isPartial = energyDollars === null || hasTouEnergyCoverageMissing;

      const partialReasons: string[] = [];
      const missingRateInputs: string[] = [];
      const missingDeterminants: string[] = [];

      if (!rateDef) missingRateInputs.push('rateCatalog');
      if (fixedDollars === null) {
        missingRateInputs.push('fixedCharges');
        partialReasons.push('fixed_charge_unknown');
      }
      if (demandDollars === null) {
        missingRateInputs.push('demandCharges');
        partialReasons.push('demand_charges_unknown');
      }
      if (energyDollars === null) {
        missingDeterminants.push('energy.kwhByTouPeriod');
        partialReasons.push('tou_energy_missing');
      }
      if (hasTouEnergyCoverageMissing) partialReasons.push('tou_energy_coverage_low');
      if (totalDollars === null) partialReasons.push('total_unknown');

      // More specific missing determinants hints from MissingInfo ids.
      if (cycleMissing.some((mi: any) => String(mi?.id || '').includes('billSimV2.demand.kw_missing'))) missingDeterminants.push('demand.kW');
      if (cycleMissing.some((mi: any) => String(mi?.id || '').includes('billSimV2.demand.tou_missing'))) missingDeterminants.push('demand.kWMaxByTouPeriod');
      if (cycleMissing.some((mi: any) => String(mi?.id || '').includes('billSimV2.energy.rate_missing'))) missingRateInputs.push('energyCharges');
      if (cycleMissing.some((mi: any) => String(mi?.id || '').includes('billSimV2.demand.rate_missing'))) missingRateInputs.push('demandChargeRates');

      cycles.push({
        cycleLabel,
        cycleStartIso: startIso,
        cycleEndIso: endIso,
        partialReasons: Array.from(new Set(partialReasons)),
        missingRateInputs: Array.from(new Set(missingRateInputs)),
        missingDeterminants: Array.from(new Set(missingDeterminants)),
        totals: {
          energyDollars,
          demandDollars,
          fixedDollars,
          otherDollars,
          totalDollars,
          isPartial,
        },
        lineItems,
        warnings: cycleWarnings,
        missingInfo: cycleMissing,
      });
    }
    return { meterId: String(m.meterId || 'meter'), cycles };
  });

  return {
    version: 'billSimV2.v1',
    utility,
    rateCode,
    businessFamilyKey: tariff?.businessFamilyKey ?? null,
    rateCatalogId: rateDef?.rateId || null,
    ratchetModelStatus,
    ratchetModelPlaceholder,
    meters,
    warnings,
    missingInfo,
  };
}

