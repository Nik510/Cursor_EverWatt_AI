export type TariffOverrideV1 = {
  schemaVersion: 1;
  commodity: 'electric' | 'gas';
  utilityId: string;
  snapshotId: string;
  tariffIdOrRateCode: string;
  selectedBy: 'user';
  selectedAt: string;
  selectionSource: 'bill_pdf_match';
  matchType: 'EXACT' | 'NORMALIZED' | 'CANDIDATE';
  sourceUrl?: string;
  sourceTitle?: string;
} | null;

export type ProjectAuditEventV1 =
  | {
      schemaVersion: 1;
      eventType: 'TARIFF_OVERRIDE_APPLIED';
      at: string; // ISO
      actor?: 'user';
      selectionSource?: string;
      matchType?: string;
      previousOverride: TariffOverrideV1;
      newOverride: Exclude<TariffOverrideV1, null>;
    }
  | {
      schemaVersion: 1;
      eventType: 'TARIFF_OVERRIDE_CLEARED';
      at: string; // ISO
      actor?: 'user';
      previousOverride: Exclude<TariffOverrideV1, null>;
      newOverride: null;
    };

function safeClone<T>(v: T): T {
  try {
    return JSON.parse(JSON.stringify(v));
  } catch {
    return v;
  }
}

function stableJson(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function appendTariffOverrideAuditEventV1(args: {
  existingEvents: unknown;
  previousOverride: TariffOverrideV1;
  newOverride: TariffOverrideV1;
  nowIso?: string;
}): ProjectAuditEventV1[] {
  const events: ProjectAuditEventV1[] = Array.isArray(args.existingEvents) ? (args.existingEvents as any[]) : [];
  const prev = (args.previousOverride ?? null) as TariffOverrideV1;
  const next = (args.newOverride ?? null) as TariffOverrideV1;

  // Append only when actually changed.
  if (stableJson(prev) === stableJson(next)) return events;

  const at = String(args.nowIso || new Date().toISOString());

  if (next) {
    const ev: ProjectAuditEventV1 = {
      schemaVersion: 1,
      eventType: 'TARIFF_OVERRIDE_APPLIED',
      at,
      actor: 'user',
      selectionSource: String((next as any)?.selectionSource || '').trim() || undefined,
      matchType: String((next as any)?.matchType || '').trim() || undefined,
      previousOverride: safeClone(prev),
      newOverride: safeClone(next) as any,
    };
    return [...events, ev];
  }

  if (prev) {
    const ev: ProjectAuditEventV1 = {
      schemaVersion: 1,
      eventType: 'TARIFF_OVERRIDE_CLEARED',
      at,
      actor: 'user',
      previousOverride: safeClone(prev) as any,
      newOverride: null,
    };
    return [...events, ev];
  }

  // prev=null and next=null but different stableJson would be unexpected; treat as no-op.
  return events;
}

