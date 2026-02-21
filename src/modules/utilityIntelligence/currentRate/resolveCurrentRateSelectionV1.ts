import { extractBillPdfTariffHintsV1 } from '../billPdf/extractBillPdfTariffHintsV1';
import { loadLatestSnapshot } from '../../tariffLibrary/storage';
import { matchBillTariffToLibraryV1 } from '../../tariffLibrary/matching/matchBillTariffToLibraryV1';
import type { TariffSnapshot } from '../../tariffLibrary/types';
import type { CurrentRateSelectionSourceV1, UtilityInputs } from '../types';

function mapBillUtilityHintToElectricLibraryUtility(raw: unknown): 'PGE' | 'SCE' | 'SDGE' | null {
  const h = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  // From bill extractor returns: PG&E, SCE, SDG&E, SoCalGas
  if (h.includes('PGE') || h.includes('PACIFICGAS')) return 'PGE';
  if (h === 'SCE' || h.includes('SOUTHERNCALIFORNIAEDISON')) return 'SCE';
  if (h.includes('SDGE') || h.includes('SANDIEGOGAS')) return 'SDGE';
  return null;
}

function toMatchSnapshotV0(snapshot: TariffSnapshot | null): Parameters<typeof matchBillTariffToLibraryV1>[0]['snapshot'] {
  if (!snapshot) return null;
  return {
    versionTag: snapshot.versionTag,
    capturedAt: snapshot.capturedAt,
    rates: (snapshot.rates || []).map((r) => ({
      rateCode: String((r as any)?.rateCode || '').trim(),
      sourceUrl: String((r as any)?.sourceUrl || '').trim(),
      ...(String((r as any)?.sourceTitle || '').trim() ? { sourceTitle: String((r as any)?.sourceTitle || '').trim() } : {}),
    })),
  };
}

export async function resolveCurrentRateSelectionV1(args: {
  demo: boolean;
  territory?: string | null;
  customerRateCode?: string | null;
  billPdfText?: string | null;
  tariffOverrideV1?: UtilityInputs['tariffOverrideV1'];
}): Promise<{ currentRate?: UtilityInputs['currentRate']; currentRateSelectionSource: CurrentRateSelectionSourceV1 }> {
  const overrideRateCode = String((args.tariffOverrideV1 as any)?.tariffIdOrRateCode || '').trim();
  const overrideUtility = String((args.tariffOverrideV1 as any)?.utilityId || '').trim();
  const overrideApplies = Boolean(overrideRateCode && overrideUtility);
  if (overrideApplies) {
    return {
      currentRate: { utility: overrideUtility, rateCode: overrideRateCode, effectiveDate: undefined },
      currentRateSelectionSource: 'USER_OVERRIDE',
    };
  }

  const billPdfText = String(args.billPdfText || '').trim();
  if (billPdfText) {
    const hints = extractBillPdfTariffHintsV1(billPdfText);
    const utilityId = mapBillUtilityHintToElectricLibraryUtility(hints?.utilityHint || null);
    const rateScheduleText = String(hints?.rateScheduleText || '').trim() || null;
    if (utilityId && rateScheduleText) {
      const snap = await loadLatestSnapshot(utilityId).catch(() => null);
      const match = matchBillTariffToLibraryV1({
        utilityId,
        commodity: 'electric',
        rateScheduleText,
        snapshot: toMatchSnapshotV0(snap),
      });
      if (match?.resolved?.rateCode) {
        return {
          currentRate: { utility: utilityId, rateCode: match.resolved.rateCode, effectiveDate: undefined },
          currentRateSelectionSource: 'BILL_MATCH',
        };
      }
    }
  }

  const territory = String(args.territory || '').trim() || 'PGE';
  const customerRateCode = String(args.customerRateCode || '').trim();

  if (args.demo) {
    return {
      currentRate: { utility: territory, rateCode: 'PGE_SIM_B19_LIKE', effectiveDate: undefined },
      currentRateSelectionSource: 'DEFAULT',
    };
  }

  if (customerRateCode) {
    return {
      currentRate: { utility: territory, rateCode: customerRateCode, effectiveDate: undefined },
      currentRateSelectionSource: 'DEFAULT',
    };
  }

  return { currentRate: undefined, currentRateSelectionSource: 'DEFAULT' };
}

