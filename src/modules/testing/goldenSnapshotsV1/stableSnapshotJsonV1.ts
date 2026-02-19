type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };

function stableNormalizeJson(value: any, seen: WeakSet<object>): JsonValue {
  if (value === null) return null;
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return value as any;
  if (t !== 'object') return String(value) as any;

  if (seen.has(value)) return '[Circular]' as any;
  seen.add(value);

  if (Array.isArray(value)) return value.map((v) => stableNormalizeJson(v, seen));

  const obj = value as Record<string, any>;
  const out: Record<string, JsonValue> = {};
  for (const k of Object.keys(obj).sort((a, b) => a.localeCompare(b))) {
    const v = obj[k];
    if (typeof v === 'undefined') continue; // keep JSON output canonical
    out[k] = stableNormalizeJson(v, seen);
  }
  return out;
}

export function stableSnapshotStringifyV1(value: any, space = 2): string {
  const norm = stableNormalizeJson(value, new WeakSet<object>());
  return JSON.stringify(norm, null, space) + '\n';
}

