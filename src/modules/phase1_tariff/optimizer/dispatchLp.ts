import type { BatterySpec, TariffModel } from '../types';

type LocalParts = {
  minuteOfDay: number;
  dayType: 'weekday' | 'weekend';
  dayKey: string; // YYYY-MM-DD local
  monthKey: string; // YYYY-MM local
};

function getLocalParts(ts: Date, timeZone: string): LocalParts {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = dtf.formatToParts(ts);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = Number(get('hour'));
  const minute = Number(get('minute'));
  const weekday = get('weekday');
  const dayKey = `${year}-${month}-${day}`;
  const monthKey = `${year}-${month}`;
  const dayType: 'weekday' | 'weekend' = weekday === 'Sat' || weekday === 'Sun' ? 'weekend' : 'weekday';
  return { minuteOfDay: hour * 60 + minute, dayType, dayKey, monthKey };
}

function inTouWindow(lp: LocalParts, w: { startMinute: number; endMinute: number; days: 'all' | 'weekday' | 'weekend' }): boolean {
  const okDay = w.days === 'all' ? true : w.days === lp.dayType;
  if (!okDay) return false;
  const m = lp.minuteOfDay;
  return m >= w.startMinute && m < w.endMinute;
}

function intervalEnergyPriceUsdPerKwh(args: {
  tariff: TariffModel;
  local: LocalParts;
}): number {
  for (const c of args.tariff.energyCharges ?? []) {
    if (c.windows?.some((w) => inTouWindow(args.local, w))) return c.pricePerKwh;
  }
  return 0;
}

function inferIntervalHours(sorted: Array<{ timestamp: Date }>, fallback: number = 0.25): number {
  if (sorted.length < 2) return fallback;
  const dtMs = sorted[1].timestamp.getTime() - sorted[0].timestamp.getTime();
  const h = dtMs / (1000 * 60 * 60);
  return Number.isFinite(h) && h > 0 ? h : fallback;
}

type GlpkInstance = Awaited<ReturnType<(typeof import('glpk.js'))['default']>>;

async function loadGlpk(): Promise<GlpkInstance> {
  const mod = await import('glpk.js');
  const loader = (mod as any).default ?? (mod as any);
  return loader();
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function effectiveBattery(b: BatterySpec) {
  const powerKw = Math.max(0, b.powerKw);
  const energyKwh = Math.max(0, b.energyKwh);
  const minSoc = energyKwh * clamp01(b.minSocFrac ?? 0.1);
  const maxSoc = energyKwh * clamp01(b.maxSocFrac ?? 0.9);
  const rte = clamp01(b.roundTripEfficiency);
  // Split round-trip efficiency into symmetric charge/discharge efficiency (deterministic).
  const eta = Math.sqrt(Math.max(0.01, Math.min(0.999, rte)));
  return { powerKw, energyKwh, minSoc, maxSoc, etaCh: eta, etaDis: eta };
}

export type DispatchLpResult = {
  solverStatus: string;
  netLoadKwSeries: number[];
  chargeKwSeries: number[];
  dischargeKwSeries: number[];
  socKwhSeries: number[] | null;
};

/**
 * Deterministic LP dispatch optimizer:
 * minimize bill proxy under `TariffModel` with monthlyMax/dailyMax demand determinants + energy.
 *
 * - This is NOT Option-S-specific. Option S is represented by supplying an Option S `TariffModel`.
 */
export async function optimizeDispatchLp(args: {
  tariff: TariffModel;
  intervals: Array<{ timestamp: Date; kw: number }>;
  battery: BatterySpec;
  initialSocFrac?: number; // 0..1
}): Promise<DispatchLpResult> {
  const timeZone = args.tariff.timezone || 'UTC';
  const rows = args.intervals
    .filter((r) => r.timestamp instanceof Date && Number.isFinite(r.kw))
    .map((r) => ({ ...r, local: getLocalParts(r.timestamp, timeZone) }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  if (!rows.length) {
    return { solverStatus: 'no-intervals', netLoadKwSeries: [], chargeKwSeries: [], dischargeKwSeries: [], socKwhSeries: null };
  }

  const glpk = await loadGlpk();
  const { GLP_MIN, GLP_LO, GLP_DB, GLP_FX, GLP_MSG_ERR, GLP_MSG_OFF } = glpk;

  const h = inferIntervalHours(rows, 0.25);
  const batt = effectiveBattery(args.battery);
  const soc0 = Math.min(
    batt.maxSoc,
    Math.max(batt.minSoc, (clamp01(args.initialSocFrac ?? 0.5) * batt.energyKwh))
  );

  const objective: Record<string, number> = {};
  const bounds: Array<{ name: string; type: number; lb: number; ub: number }> = [];
  const constraints: Array<{
    name: string;
    vars: Array<{ name: string; coef: number }>;
    bnds: { type: number; lb: number; ub: number };
  }> = [];

  // Battery vars per interval
  bounds.push({ name: 'soc_0', type: GLP_FX, lb: soc0, ub: soc0 });
  for (let t = 0; t < rows.length; t++) {
    bounds.push({ name: `p_ch_${t}`, type: GLP_DB, lb: 0, ub: batt.powerKw });
    bounds.push({ name: `p_dis_${t}`, type: GLP_DB, lb: 0, ub: batt.powerKw });
    if (t > 0) bounds.push({ name: `soc_${t}`, type: GLP_DB, lb: batt.minSoc, ub: batt.maxSoc });
    if (t === rows.length - 1) bounds.push({ name: `soc_${t + 1}`, type: GLP_DB, lb: batt.minSoc, ub: batt.maxSoc });

    // SOC dynamics: soc_{t+1} - soc_t - (p_ch*etaCh - p_dis/etaDis)*h = 0
    constraints.push({
      name: `soc_dyn_${t}`,
      vars: [
        { name: `soc_${t + 1}`, coef: 1 },
        { name: `soc_${t === 0 ? 0 : t}`, coef: -1 },
        { name: `p_ch_${t}`, coef: -batt.etaCh * h },
        { name: `p_dis_${t}`, coef: (1 / batt.etaDis) * h },
      ],
      bnds: { type: GLP_FX, lb: 0, ub: 0 },
    });

    // Energy objective: price * net_kW * h where net_kW = base + p_ch - p_dis
    const price = intervalEnergyPriceUsdPerKwh({ tariff: args.tariff, local: rows[t].local });
    objective[`p_ch_${t}`] = (objective[`p_ch_${t}`] ?? 0) + price * h;
    objective[`p_dis_${t}`] = (objective[`p_dis_${t}`] ?? 0) + (-price * h);
  }

  // Demand determinants: introduce max variables by day/month as appropriate.
  for (const det of args.tariff.demandDeterminants ?? []) {
    // filter applicable intervals
    const applicableIdx: number[] = [];
    for (let t = 0; t < rows.length; t++) {
      const ok = det.windows?.length ? det.windows.some((w) => inTouWindow(rows[t].local, w)) : true;
      if (ok) applicableIdx.push(t);
    }
    if (!applicableIdx.length) continue;

    if (det.kind === 'monthlyMax') {
      // group by local month
      const byMonth = new Map<string, number[]>();
      for (const t of applicableIdx) {
        const k = rows[t].local.monthKey;
        const list = byMonth.get(k) ?? [];
        list.push(t);
        byMonth.set(k, list);
      }
      for (const [monthKey, ts] of byMonth.entries()) {
        const dVar = `D_${det.id}_month_${monthKey}`;
        bounds.push({ name: dVar, type: GLP_LO, lb: 0, ub: Number.POSITIVE_INFINITY });
        // objective coefficient uses the first tier only in Phase 1 (single-tier determinants)
        const rate = det.tiers?.[0]?.pricePerKw ?? 0;
        objective[dVar] = (objective[dVar] ?? 0) + rate;
        for (const t of ts) {
          constraints.push({
            name: `c_${dVar}_${t}`,
            vars: [
              { name: dVar, coef: 1 },
              { name: `p_ch_${t}`, coef: -1 },
              { name: `p_dis_${t}`, coef: 1 },
            ],
            bnds: { type: GLP_LO, lb: rows[t].kw, ub: Number.POSITIVE_INFINITY },
          });
        }
      }
      continue;
    }

    if (det.kind === 'dailyMax') {
      const byDay = new Map<string, number[]>();
      for (const t of applicableIdx) {
        const k = rows[t].local.dayKey;
        const list = byDay.get(k) ?? [];
        list.push(t);
        byDay.set(k, list);
      }
      for (const [dayKey, ts] of byDay.entries()) {
        const dVar = `D_${det.id}_day_${dayKey}`;
        bounds.push({ name: dVar, type: GLP_LO, lb: 0, ub: Number.POSITIVE_INFINITY });
        const rate = det.tiers?.[0]?.pricePerKw ?? 0;
        objective[dVar] = (objective[dVar] ?? 0) + rate;
        for (const t of ts) {
          constraints.push({
            name: `c_${dVar}_${t}`,
            vars: [
              { name: dVar, coef: 1 },
              { name: `p_ch_${t}`, coef: -1 },
              { name: `p_dis_${t}`, coef: 1 },
            ],
            bnds: { type: GLP_LO, lb: rows[t].kw, ub: Number.POSITIVE_INFINITY },
          });
        }
      }
      continue;
    }
  }

  const model = {
    name: `phase1-dispatch`,
    objective: {
      direction: GLP_MIN,
      name: 'cost',
      vars: Object.entries(objective).map(([name, coef]) => ({ name, coef })),
    },
    subjectTo: constraints,
    bounds,
  };

  const solution = glpk.solve(model, { msglev: GLP_MSG_ERR ?? GLP_MSG_OFF });
  const vars = (solution as any)?.result?.vars ?? (solution as any)?.vars ?? {};
  const status = (solution as any)?.result?.status ?? 'unknown';

  const netLoadKwSeries: number[] = [];
  const chargeKwSeries: number[] = [];
  const dischargeKwSeries: number[] = [];
  const socKwhSeries: number[] = [];

  for (let t = 0; t < rows.length; t++) {
    const pCh = Number(vars[`p_ch_${t}`] ?? 0);
    const pDis = Number(vars[`p_dis_${t}`] ?? 0);
    netLoadKwSeries.push(rows[t].kw + pCh - pDis);
    chargeKwSeries.push(pCh);
    dischargeKwSeries.push(pDis);
    const soc = vars[`soc_${t}`];
    if (t === 0) {
      const s0 = vars['soc_0'];
      if (s0 != null) socKwhSeries.push(Number(s0));
    }
    if (soc != null && t > 0 && socKwhSeries.length < t + 1) socKwhSeries.push(Number(soc));
    const socNext = vars[`soc_${t + 1}`];
    if (socNext != null) socKwhSeries.push(Number(socNext));
  }

  return {
    solverStatus: String(status),
    netLoadKwSeries,
    chargeKwSeries,
    dischargeKwSeries,
    socKwhSeries: socKwhSeries.length ? socKwhSeries : null,
  };
}

