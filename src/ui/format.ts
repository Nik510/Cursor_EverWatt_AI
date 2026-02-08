export function fmtKw(x: number | undefined | null): string {
  if (x == null || !isFinite(x)) return '—';
  return `${Math.round(x)} kW`;
}

export function fmtMoney(x: number | undefined | null, opts?: { compact?: boolean }): string {
  if (x == null || !isFinite(x)) return '—';

  const compact = opts?.compact ?? true;
  const nf = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard',
  });
  return nf.format(x);
}

export function fmtRate(x: number | undefined | null, suffix: string): string {
  if (x == null || !isFinite(x)) return '—';
  return `${x.toFixed(2)} ${suffix}`;
}
