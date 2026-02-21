export function roundTo(n: number, decimals: number): number {
  if (!Number.isFinite(n)) return NaN;
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}

export function roundUsdCents(n: number): number {
  return roundTo(n, 2);
}

export function safeNum(x: unknown): number | null {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function stableSortById<T extends { id: string }>(arr: T[]): T[] {
  return (arr || []).slice().sort((a, b) => String(a?.id || '').localeCompare(String(b?.id || '')));
}

export function sumFixedOrder(nums: Array<number | null | undefined>): number | null {
  let sum = 0;
  let any = false;
  for (const x of nums) {
    const n = Number(x);
    if (!Number.isFinite(n)) continue;
    any = true;
    sum += n;
  }
  return any ? sum : null;
}

export function pvaf(discountRate: number, years: number): number | null {
  const r = Number(discountRate);
  const n = Math.floor(Number(years));
  if (!Number.isFinite(r) || !Number.isFinite(n) || n <= 0) return null;
  if (Math.abs(r) < 1e-12) return n;
  return (1 - (1 + r) ** -n) / r;
}

