import React, { useMemo } from 'react';

export type BillingPeriod = {
  cycleId: string;
  bill_start_date: string; // ISO date or date-time
  bill_end_date: string; // ISO date or date-time
};

export type IntervalStatsByCycle = {
  cycleId: string;
  interval_count: number;
  max_kw?: number | null;
  max_kw_timestamp?: string | null; // ISO date-time preferred
};

export type BillingCycleQaViewerProps = {
  billingPeriods: BillingPeriod[];
  intervalStatsByCycle: IntervalStatsByCycle[];
  /**
   * If provided, we flag unusually low/high interval counts relative to the median
   * across cycles. Defaults are intentionally mild to avoid “hard assumptions”.
   */
  unusualCountThresholds?: { lowFactor: number; highFactor: number };
  /**
   * Optional label for the table (e.g. "Billing cycle QA")
   */
  title?: string;
};

type Flag = { level: 'ok' | 'warning' | 'error'; text: string };

function formatDateRange(start: string, end: string): string {
  const s = safeDate(start);
  const e = safeDate(end);
  const fmt = (d: Date | null) =>
    d
      ? d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })
      : 'Invalid date';
  return `${fmt(s)} → ${fmt(e)}`;
}

function safeDate(input: string | null | undefined): Date | null {
  if (!input) return null;
  const d = new Date(input);
  return Number.isFinite(d.getTime()) ? d : null;
}

function formatKw(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return `${v.toFixed(2)} kW`;
}

function formatTimestamp(ts: string | null | undefined): string {
  const d = safeDate(ts || '');
  if (!d) return '—';
  return d.toLocaleString();
}

function median(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 === 0 ? (v[mid - 1] + v[mid]) / 2 : v[mid];
}

export const BillingCycleQaViewer: React.FC<BillingCycleQaViewerProps> = ({
  billingPeriods,
  intervalStatsByCycle,
  unusualCountThresholds,
  title = 'Billing Cycle QA Viewer',
}) => {
  const thresholds = {
    lowFactor: unusualCountThresholds?.lowFactor ?? 0.8,
    highFactor: unusualCountThresholds?.highFactor ?? 1.2,
  };

  const statsByCycle = useMemo(() => {
    const m = new Map<string, IntervalStatsByCycle>();
    for (const s of intervalStatsByCycle) m.set(s.cycleId, s);
    return m;
  }, [intervalStatsByCycle]);

  const counts = useMemo(() => {
    return intervalStatsByCycle
      .map((s) => Number(s.interval_count))
      .filter((n) => Number.isFinite(n) && n >= 0);
  }, [intervalStatsByCycle]);

  const medianCount = useMemo(() => median(counts), [counts]);

  const rows = useMemo(() => {
    return billingPeriods.map((p) => {
      const stats = statsByCycle.get(p.cycleId);
      const intervalCount = stats ? Number(stats.interval_count) : NaN;
      const flags: Flag[] = [];

      if (!stats) {
        flags.push({ level: 'warning', text: 'No interval stats found for this cycleId' });
      } else if (!Number.isFinite(intervalCount)) {
        flags.push({ level: 'warning', text: 'Interval count missing/invalid' });
      } else if (intervalCount === 0) {
        flags.push({ level: 'error', text: 'Zero intervals' });
      } else if (medianCount !== null && counts.length >= 3) {
        // Median-based “unusual” flags: relative, not a hard interval-minute assumption.
        if (intervalCount < medianCount * thresholds.lowFactor) {
          flags.push({ level: 'warning', text: `Unusually low interval count (median=${Math.round(medianCount)})` });
        } else if (intervalCount > medianCount * thresholds.highFactor) {
          flags.push({ level: 'warning', text: `Unusually high interval count (median=${Math.round(medianCount)})` });
        }
      }

      return {
        cycleId: p.cycleId,
        billingPeriod: formatDateRange(p.bill_start_date, p.bill_end_date),
        intervalCount: Number.isFinite(intervalCount) ? intervalCount : null,
        maxKw: stats?.max_kw ?? null,
        maxKwTimestamp: stats?.max_kw_timestamp ?? null,
        flags,
      };
    });
  }, [billingPeriods, statsByCycle, medianCount, counts.length, thresholds.highFactor, thresholds.lowFactor]);

  const hasAnyWarnings = rows.some((r) => r.flags.some((f) => f.level !== 'ok'));

  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">
            Flags are median-based across cycles (no tariff assumptions). Zero intervals always errors.
          </p>
        </div>
        {hasAnyWarnings ? (
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            Review needed
          </span>
        ) : (
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            Looks OK
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr>
              <th className="text-left font-semibold px-4 py-3">Cycle</th>
              <th className="text-left font-semibold px-4 py-3">Billing Period</th>
              <th className="text-right font-semibold px-4 py-3"># of intervals</th>
              <th className="text-right font-semibold px-4 py-3">Max kW</th>
              <th className="text-left font-semibold px-4 py-3">Timestamp of max</th>
              <th className="text-left font-semibold px-4 py-3">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((r) => (
              <tr key={r.cycleId} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.cycleId}</td>
                <td className="px-4 py-3 text-gray-800">{r.billingPeriod}</td>
                <td className="px-4 py-3 text-right text-gray-900">
                  {r.intervalCount === null ? '—' : r.intervalCount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-gray-900">{formatKw(r.maxKw)}</td>
                <td className="px-4 py-3 text-gray-700">{formatTimestamp(r.maxKwTimestamp)}</td>
                <td className="px-4 py-3">
                  {r.flags.length === 0 ? (
                    <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
                      OK
                    </span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {r.flags.map((f, idx) => (
                        <span
                          key={idx}
                          className={
                            f.level === 'error'
                              ? 'text-xs text-red-800 bg-red-50 border border-red-200 px-2 py-1 rounded-full w-fit'
                              : 'text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full w-fit'
                          }
                        >
                          {f.text}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-600" colSpan={6}>
                  No billing periods provided.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

