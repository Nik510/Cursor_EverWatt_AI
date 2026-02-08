import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { runPhase1TariffEngine } from '../modules/phase1_tariff';
import type { ProposalPack } from '../modules/phase1_tariff';

type ParsedInterval = { timestamp: string; kw: number };

function parseIntervalsCsv(text: string): { intervals: ParsedInterval[]; warnings: string[] } {
  const warnings: string[] = [];
  const res = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
  if (res.errors?.length) {
    warnings.push(...res.errors.slice(0, 5).map((e) => `CSV parse: ${e.message}`));
  }
  const rows = Array.isArray(res.data) ? res.data : [];

  // Minimal Phase 1 CSV contract (for now): timestamp, kw
  const intervals: ParsedInterval[] = [];
  for (const r of rows) {
    const ts = String((r as any).timestamp ?? '').trim();
    const kwRaw = (r as any).kw;
    const kw = typeof kwRaw === 'number' ? kwRaw : Number(String(kwRaw ?? '').trim());
    if (!ts || !Number.isFinite(kw)) continue;
    intervals.push({ timestamp: ts, kw });
  }

  if (!intervals.length) warnings.push('No intervals parsed. Expected columns: timestamp, kw.');
  return { intervals, warnings };
}

export function Phase1Tariff() {
  const [utilityTerritory, setUtilityTerritory] = useState<'PG&E'>('PG&E');
  const [rateCodeFromUser, setRateCodeFromUser] = useState<string>('B-19');
  const [batteryPowerKw, setBatteryPowerKw] = useState<number>(250);
  const [batteryEnergyKwh, setBatteryEnergyKwh] = useState<number>(500);
  const [batteryRte, setBatteryRte] = useState<number>(0.9);

  const [csvText, setCsvText] = useState<string>('');
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const parsed = useMemo(() => (csvText ? parseIntervalsCsv(csvText) : { intervals: [], warnings: [] }), [csvText]);

  const [running, setRunning] = useState(false);
  const [pack, setPack] = useState<ProposalPack | null>(null);
  const [resultText, setResultText] = useState<string>('');

  async function onChooseFile(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setCsvWarnings(parseIntervalsCsv(text).warnings);
  }

  async function onRun() {
    setRunning(true);
    try {
      const pack = await runPhase1TariffEngine({
        utility: utilityTerritory,
        territory: 'PG&E',
        rateCodeFromUser: rateCodeFromUser.trim() || undefined,
        intervals: parsed.intervals,
        battery: {
          powerKw: batteryPowerKw,
          energyKwh: batteryEnergyKwh,
          roundTripEfficiency: batteryRte,
        },
      });
      setPack(pack);
      setResultText(JSON.stringify(pack, null, 2));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Phase 1: Battery + Tariff Intelligence</h1>
        <p className="text-sm text-gray-600">
          Minimal UI: upload intervals + PG&amp;E territory + battery inputs + run + ranked strategies.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="space-y-1">
            <div className="text-xs font-medium text-gray-700">Territory</div>
            <select
              className="w-full rounded border px-2 py-2 text-sm"
              value={utilityTerritory}
              onChange={(e) => setUtilityTerritory(e.target.value as any)}
            >
              <option value="PG&E">PG&amp;E</option>
            </select>
          </label>

          <label className="space-y-1">
            <div className="text-xs font-medium text-gray-700">Rate code (optional)</div>
            <input
              className="w-full rounded border px-2 py-2 text-sm"
              value={rateCodeFromUser}
              onChange={(e) => setRateCodeFromUser(e.target.value)}
              placeholder="e.g. B-19"
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs font-medium text-gray-700">Battery power (kW)</div>
            <input
              className="w-full rounded border px-2 py-2 text-sm"
              type="number"
              value={batteryPowerKw}
              onChange={(e) => setBatteryPowerKw(Number(e.target.value))}
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs font-medium text-gray-700">Battery energy (kWh)</div>
            <input
              className="w-full rounded border px-2 py-2 text-sm"
              type="number"
              value={batteryEnergyKwh}
              onChange={(e) => setBatteryEnergyKwh(Number(e.target.value))}
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <div className="text-xs font-medium text-gray-700">Round-trip efficiency (0..1)</div>
            <input
              className="w-full rounded border px-2 py-2 text-sm"
              type="number"
              step="0.01"
              value={batteryRte}
              onChange={(e) => setBatteryRte(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <label className="space-y-1 flex-1">
            <div className="text-xs font-medium text-gray-700">Intervals CSV (timestamp, kw)</div>
            <input
              className="block w-full text-sm"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => onChooseFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={onRun}
            disabled={running}
          >
            {running ? 'Running…' : 'Run'}
          </button>
        </div>

        {(csvWarnings.length || parsed.warnings.length) ? (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="font-medium">CSV warnings</div>
            <ul className="list-disc pl-5">
              {[...new Set([...csvWarnings, ...parsed.warnings])].slice(0, 10).map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="text-xs text-gray-600">
          Parsed intervals: <span className="font-medium">{parsed.intervals.length}</span>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="text-sm font-medium mb-3">Ranked strategies</div>
        {pack ? (
          <div className="space-y-3">
            {pack.strategiesRanked.length ? (
              pack.strategiesRanked.slice(0, 10).map((s) => {
                const totalSavings = s.evaluation.dispatch.baselineBill.totalUsd - s.evaluation.dispatch.optimizedBill.totalUsd;
                return (
                  <div key={s.strategyId} className="rounded border p-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <div className="font-medium">{s.title}</div>
                        <div className="text-xs text-gray-600">
                          Options: {s.scenario.appliedOptionIds.length ? s.scenario.appliedOptionIds.join(', ') : '(none)'}
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="font-semibold">${totalSavings.toFixed(2)}</span>{' '}
                        <span className="text-xs text-gray-600">total savings</span>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-700">
                      <div>
                        <span className="font-medium">Structural</span>: ${s.evaluation.noDispatch.structuralSavingsUsd.toFixed(2)}
                      </div>
                      <div>
                        <span className="font-medium">Operational</span>: ${s.evaluation.dispatch.operationalSavingsUsd.toFixed(2)}
                      </div>
                      <div>
                        <span className="font-medium">Confidence</span>: {(s.confidence.overall * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-gray-700">No eligible strategies were produced.</div>
            )}

            {pack.rejectedCandidates.length ? (
              <div className="rounded border bg-gray-50 p-3">
                <div className="text-sm font-medium mb-1">Rejected candidates</div>
                <ul className="list-disc pl-5 text-xs text-gray-700">
                  {pack.rejectedCandidates.slice(0, 10).map((r) => (
                    <li key={r.scenarioId}>
                      <span className="font-medium">{r.scenarioId}</span>: {r.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {pack.missingInfo.length ? (
              <div className="rounded border border-amber-200 bg-amber-50 p-3">
                <div className="text-sm font-medium mb-1 text-amber-900">Missing info</div>
                <ul className="list-disc pl-5 text-xs text-amber-900">
                  {pack.missingInfo.slice(0, 10).map((m) => (
                    <li key={m.id}>
                      <span className="font-medium">{m.title}</span> ({m.severity}): {m.howToGet}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <details className="rounded border p-3">
              <summary className="text-sm font-medium cursor-pointer">Raw ProposalPack JSON</summary>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs bg-gray-50 border rounded p-3">{resultText}</pre>
            </details>
          </div>
        ) : (
          <div className="text-sm text-gray-600">Run to generate a ProposalPack.</div>
        )}
      </div>
    </div>
  );
}

