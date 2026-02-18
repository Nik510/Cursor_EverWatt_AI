import type { BatteryEconomicsAuditLineItemV1 } from '../batteryEconomicsV1/types';
import { roundTo, stableSortById } from '../batteryEconomicsV1/helpers';

import { auditBoundsV1_2 } from './constants';
import type { BatteryDecisionPackAuditV1_2 } from './types';

function numOrNull(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function absAmount(li: BatteryEconomicsAuditLineItemV1): number {
  const raw = numOrNull((li as any)?.amountUsdRaw) ?? numOrNull((li as any)?.amountUsd);
  if (raw === null) return -1;
  return Math.abs(raw);
}

function boundedLineItems(lineItems: BatteryEconomicsAuditLineItemV1[]): BatteryEconomicsAuditLineItemV1[] {
  const items = Array.isArray(lineItems) ? lineItems.slice() : [];
  const byId = new Map<string, BatteryEconomicsAuditLineItemV1>();
  for (const li of items) {
    const id = String(li?.id || '').trim();
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, li);
  }

  const keep = new Set<string>();
  for (const id of auditBoundsV1_2.alwaysIncludeIds) if (byId.has(id)) keep.add(id);

  const remaining = Array.from(byId.values())
    .filter((li) => !keep.has(String(li?.id || '').trim()))
    .sort((a, b) => absAmount(b) - absAmount(a) || String(a.id).localeCompare(String(b.id)));

  for (const li of remaining) {
    if (keep.size >= auditBoundsV1_2.maxLineItems) break;
    keep.add(String(li.id));
  }

  const selected = Array.from(keep)
    .map((id) => byId.get(id))
    .filter((x): x is BatteryEconomicsAuditLineItemV1 => Boolean(x));

  return stableSortById(selected);
}

function reconcileFromLineItems(lineItems: BatteryEconomicsAuditLineItemV1[]): BatteryDecisionPackAuditV1_2['reconcile'] {
  const byId = new Map<string, BatteryEconomicsAuditLineItemV1>();
  for (const li of Array.isArray(lineItems) ? lineItems : []) {
    const id = String(li?.id || '').trim();
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, li);
  }

  const total = numOrNull(byId.get('savings.totalAnnual')?.amountUsd);
  const parts = ['savings.demandAnnual', 'savings.energyAnnual', 'savings.ratchetAvoidedAnnual', 'savings.drAnnual', 'savings.otherAnnual'].map((id) =>
    numOrNull(byId.get(id)?.amountUsd),
  );
  const sumLineItems = parts.some((x) => x === null) ? null : parts.reduce((s, x) => s + Number(x), 0);
  const delta = total === null || sumLineItems === null ? null : Math.abs(sumLineItems - total);
  return {
    total: total === null ? null : roundTo(total, 2),
    sumLineItems: sumLineItems === null ? null : roundTo(sumLineItems, 2),
    delta: delta === null ? null : roundTo(delta, 2),
  };
}

export function buildBoundedAuditV1_2(args: { economicsAuditLineItems: BatteryEconomicsAuditLineItemV1[] | null | undefined }): BatteryDecisionPackAuditV1_2 {
  const lineItems = boundedLineItems(Array.isArray(args.economicsAuditLineItems) ? args.economicsAuditLineItems : []);
  const reconcile = reconcileFromLineItems(lineItems);
  return { lineItems, reconcile };
}

