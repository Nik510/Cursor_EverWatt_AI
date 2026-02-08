import { loadLatestSnapshot } from '../src/modules/tariffLibrary/storage';
import { computeTariffMetadataCompletenessV0 } from '../src/modules/tariffLibrary/completeness';

function sourceDist(rates: any[], sourceKey: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rates || []) {
    const s = String(r?.[sourceKey] || '').toLowerCase().trim() || 'explicit';
    out[s] = (out[s] || 0) + 1;
  }
  return out;
}

function fmtDist(d: Record<string, number>, n: number): string {
  const keys = ['explicit', 'parsed', 'pdf', 'inferred', 'unknown'];
  return keys
    .filter((k) => (d[k] || 0) > 0)
    .map((k) => `${k}=${(((d[k] || 0) / Math.max(1, n)) * 100).toFixed(0)}%`)
    .join(' ');
}

async function main() {
  const utilities = ['PGE', 'SCE', 'SDGE'] as const;
  for (const u of utilities) {
    const snap = await loadLatestSnapshot(u);
    if (!snap) {
      // eslint-disable-next-line no-console
      console.log(`[tariffs:audit] ${u}: (missing) → run: npm run tariffs:ingest:ca`);
      continue;
    }
    const comp = computeTariffMetadataCompletenessV0(snap.rates || []);
    const n = Array.isArray(snap.rates) ? snap.rates.length : 0;
    // eslint-disable-next-line no-console
    console.log(
      `[tariffs:audit] ${u}@${snap.versionTag} rates=${n} ` +
        `customerClass=${(comp.customerClassPct * 100).toFixed(0)}% voltage=${(comp.voltagePct * 100).toFixed(0)}% ` +
        `effectiveDate=${(comp.effectiveDatePct * 100).toFixed(0)}% eligibility=${(comp.eligibilityNotesPct * 100).toFixed(0)}%`,
    );

    if (u === 'PGE') {
      const rates = Array.isArray(snap.rates) ? (snap.rates as any[]) : [];
      // eslint-disable-next-line no-console
      console.log(`[tariffs:audit] PGE sources customerClass: ${fmtDist(sourceDist(rates, 'customerClassSource'), n)}`);
      // eslint-disable-next-line no-console
      console.log(`[tariffs:audit] PGE sources voltage: ${fmtDist(sourceDist(rates, 'voltageSource'), n)}`);
      // eslint-disable-next-line no-console
      console.log(`[tariffs:audit] PGE sources eligibility: ${fmtDist(sourceDist(rates, 'eligibilitySource'), n)}`);
      // eslint-disable-next-line no-console
      console.log(`[tariffs:audit] PGE sources effective: ${fmtDist(sourceDist(rates, 'effectiveSource'), n)}`);
    }
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});

