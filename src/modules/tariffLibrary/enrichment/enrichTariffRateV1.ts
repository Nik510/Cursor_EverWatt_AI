import crypto from 'node:crypto';

import type { TariffEvidenceV0, TariffRateMetadata } from '../types';
import { getPgeRulebookHintsV1 } from './pgeRulebookV1';

export type TariffFieldSourceV1 = 'explicit' | 'parsed' | 'pdf' | 'inferred' | 'unknown';

function clean(s: unknown): string {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

function sha1(s: string): string {
  return crypto.createHash('sha1').update(s, 'utf-8').digest('hex');
}

function inferCustomerClassV1(args: { rateCode: string; title: string }): { value: string; ruleId: string; matchedText: string } | null {
  const rc = String(args.rateCode || '').toUpperCase();
  const t = args.title.toLowerCase();
  if (/(residential|domestic|home)/.test(t) || rc.startsWith('A-')) return { value: 'residential', ruleId: 'infer.customerClass.residential', matchedText: rc.startsWith('A-') ? 'rateCodePrefix:A-' : 'title:residential' };
  if (/(agricultural|irrigation)/.test(t) || rc.startsWith('AG-')) return { value: 'agricultural', ruleId: 'infer.customerClass.ag', matchedText: rc.startsWith('AG-') ? 'rateCodePrefix:AG-' : 'title:agricultural' };
  if (/(industrial|manufacturing)/.test(t) || rc.startsWith('I-')) return { value: 'industrial', ruleId: 'infer.customerClass.industrial', matchedText: rc.startsWith('I-') ? 'rateCodePrefix:I-' : 'title:industrial' };
  if (/(street lighting|streetlight|lighting)/.test(t) || rc.startsWith('LS-')) return { value: 'street_lighting', ruleId: 'infer.customerClass.streetLighting', matchedText: rc.startsWith('LS-') ? 'rateCodePrefix:LS-' : 'title:lighting' };
  if (/(ev|vehicle|charging)/.test(t) || rc.startsWith('EV-')) return { value: 'ev', ruleId: 'infer.customerClass.ev', matchedText: rc.startsWith('EV-') ? 'rateCodePrefix:EV-' : 'title:ev' };
  if (/(public|municipal|government|school)/.test(t)) return { value: 'public_sector', ruleId: 'infer.customerClass.public', matchedText: 'title:public' };
  if (/(commercial|general service|business)/.test(t) || rc.startsWith('B-') || rc.startsWith('E-') || rc.startsWith('C-')) {
    return { value: 'commercial', ruleId: 'infer.customerClass.commercial', matchedText: rc.startsWith('B-') || rc.startsWith('E-') || rc.startsWith('C-') ? 'rateCodePrefix:B/E/C' : 'title:commercial' };
  }
  return null;
}

function inferVoltageV1(title: string): { value: string; ruleId: string; matchedText: string } | null {
  const t = title.toLowerCase();
  if (/\btransmission\b/.test(t)) return { value: 'transmission', ruleId: 'infer.voltage.transmission', matchedText: 'title:transmission' };
  if (/\bprimary\b/.test(t)) return { value: 'primary', ruleId: 'infer.voltage.primary', matchedText: 'title:primary' };
  if (/\bsecondary\b/.test(t)) return { value: 'secondary', ruleId: 'infer.voltage.secondary', matchedText: 'title:secondary' };
  return null;
}

export function enrichTariffRateV1(args: {
  base: TariffRateMetadata;
  previous?: TariffRateMetadata | null;
  parsedHints?: Partial<Pick<TariffRateMetadata, 'customerClass' | 'voltage' | 'eligibilityNotes' | 'effectiveStart' | 'effectiveEnd' | 'sourceTitle'>>;
  parsedEvidence?: Array<{ fieldName: string; snippet: string }>;
  pdfHints?: Partial<Pick<TariffRateMetadata, 'sourceTitle' | 'effectiveStart' | 'customerClass' | 'voltage' | 'eligibilityNotes'>>;
  pdfEvidence?: Array<{ fieldName: string; snippet: string }>;
}): TariffRateMetadata {
  const prev = args.previous || null;
  const base = { ...args.base };
  const title = clean(args.parsedHints?.sourceTitle ?? base.sourceTitle ?? '');

  const evidence: TariffEvidenceV0[] = Array.isArray(base.evidence) ? base.evidence.slice() : [];

  function addParsed(fieldName: string, snippet: string) {
    const sn = clean(snippet);
    if (!sn) return;
    evidence.push({ kind: 'meta', sourceUrl: base.sourceUrl, fieldName, value: 'parsed', snippetHash: sha1(sn), matchedText: sn.slice(0, 180) });
  }

  function addPdf(fieldName: string, snippet: string) {
    const sn = clean(snippet);
    if (!sn) return;
    evidence.push({ kind: 'pdf', sourceUrl: base.sourceUrl, fieldName, value: 'pdf_sniff', snippetHash: sha1(sn), matchedText: sn.slice(0, 180) });
  }

  function addInfer(fieldName: string, ruleId: string, matchedText: string) {
    evidence.push({
      kind: 'meta',
      sourceUrl: base.sourceUrl,
      fieldName,
      value: 'inferred',
      inferenceRuleId: ruleId,
      matchedText: clean(matchedText).slice(0, 180),
    });
  }

  for (const pe of args.parsedEvidence || []) addParsed(pe.fieldName, pe.snippet);
  for (const pe of args.pdfEvidence || []) addPdf(pe.fieldName, pe.snippet);

  function sourceRank(src: unknown): number {
    const s = String(src || '').toLowerCase().trim();
    if (s === 'explicit') return 4;
    if (s === 'parsed') return 3;
    if (s === 'pdf') return 2;
    if (s === 'inferred') return 1;
    return 0;
  }

  function setIfHigher(args2: {
    fieldName: 'customerClass' | 'voltage' | 'eligibilityNotes' | 'effectiveStart' | 'effectiveEnd' | 'sourceTitle';
    value: any;
    sourceKey?: keyof TariffRateMetadata;
    sourceValue: TariffFieldSourceV1;
    evidence?: { ruleId?: string; matchedText?: string; snippet?: string };
  }) {
    const sourceKey = args2.sourceKey;
    const existingSource = sourceKey ? (base as any)[sourceKey] : undefined;
    if (sourceRank(existingSource) >= sourceRank(args2.sourceValue)) return;
    (base as any)[args2.fieldName] = args2.value;
    if (sourceKey) (base as any)[sourceKey] = args2.sourceValue;
    if (args2.evidence?.ruleId && args2.evidence?.matchedText) addInfer(args2.fieldName, args2.evidence.ruleId, args2.evidence.matchedText);
    if (args2.evidence?.snippet) addPdf(args2.fieldName, args2.evidence.snippet);
  }

  // PG&E deterministic rulebook (INFERRED) — only applies when we have no higher-confidence value.
  if (String((base as any).utility || '').toUpperCase() === 'PGE') {
    const hints = getPgeRulebookHintsV1(String(base.rateCode || ''));
    if (hints) {
      if (hints.customerClass) {
        const ev = hints.evidenceByField.customerClass;
        setIfHigher({
          fieldName: 'customerClass',
          value: hints.customerClass,
          sourceKey: 'customerClassSource',
          sourceValue: 'inferred',
          evidence: { ruleId: ev?.inferenceRuleId, matchedText: ev?.matchedText },
        });
      }
      if (hints.voltage) {
        const ev = hints.evidenceByField.voltage;
        setIfHigher({
          fieldName: 'voltage',
          value: hints.voltage,
          sourceKey: 'voltageSource',
          sourceValue: 'inferred',
          evidence: { ruleId: ev?.inferenceRuleId, matchedText: ev?.matchedText },
        });
      }
      if (hints.eligibilityNotes) {
        const ev = hints.evidenceByField.eligibilityNotes;
        setIfHigher({
          fieldName: 'eligibilityNotes',
          value: hints.eligibilityNotes,
          sourceKey: 'eligibilitySource',
          sourceValue: 'inferred',
          evidence: { ruleId: ev?.inferenceRuleId, matchedText: ev?.matchedText },
        });
      }
    }
  }

  // Customer class (parsed hints only; do not treat inferred/base values as parsed)
  const curCC = clean(args.parsedHints?.customerClass ?? '');
  if (curCC && curCC !== 'unknown') {
    setIfHigher({ fieldName: 'customerClass', value: curCC, sourceKey: 'customerClassSource', sourceValue: 'parsed' });
  } else if (prev && clean(prev.customerClass) && clean(prev.customerClass) !== 'unknown' && sourceRank((base as any).customerClassSource) === 0) {
    setIfHigher({ fieldName: 'customerClass', value: prev.customerClass, sourceKey: 'customerClassSource', sourceValue: (prev.customerClassSource as any) || 'explicit' });
    evidence.push({ kind: 'meta', fieldName: 'customerClass', value: 'carryForward', matchedText: 'previousSnapshot' });
  } else {
    const inf = inferCustomerClassV1({ rateCode: base.rateCode, title });
    if (inf) {
      setIfHigher({
        fieldName: 'customerClass',
        value: inf.value,
        sourceKey: 'customerClassSource',
        sourceValue: 'inferred',
        evidence: { ruleId: inf.ruleId, matchedText: String(base.rateCode || '') },
      });
    } else {
      if (!clean(base.customerClass)) base.customerClass = 'unknown';
      if (!clean((base as any).customerClassSource)) (base as any).customerClassSource = 'unknown';
    }
  }

  // Voltage (parsed hints only)
  const curV = clean(args.parsedHints?.voltage ?? '');
  if (curV && curV !== 'unknown') {
    setIfHigher({ fieldName: 'voltage', value: curV, sourceKey: 'voltageSource', sourceValue: 'parsed' });
  } else if (prev && clean(prev.voltage) && clean(prev.voltage) !== 'unknown' && sourceRank((base as any).voltageSource) === 0) {
    setIfHigher({ fieldName: 'voltage', value: prev.voltage, sourceKey: 'voltageSource', sourceValue: (prev.voltageSource as any) || 'explicit' });
    evidence.push({ kind: 'meta', fieldName: 'voltage', value: 'carryForward', matchedText: 'previousSnapshot' });
  } else {
    const inf = inferVoltageV1(title);
    if (inf) {
      setIfHigher({
        fieldName: 'voltage',
        value: inf.value,
        sourceKey: 'voltageSource',
        sourceValue: 'inferred',
        evidence: { ruleId: inf.ruleId, matchedText: String(base.rateCode || '') },
      });
    } else {
      if (!clean(base.voltage)) base.voltage = 'unknown';
      if (!clean((base as any).voltageSource)) (base as any).voltageSource = 'unknown';
    }
  }

  // Eligibility notes (parsed hints only)
  const curE = clean(args.parsedHints?.eligibilityNotes ?? '');
  if (curE) {
    setIfHigher({ fieldName: 'eligibilityNotes', value: curE, sourceKey: 'eligibilitySource', sourceValue: 'parsed' });
  } else if (prev && clean(prev.eligibilityNotes) && sourceRank((base as any).eligibilitySource) === 0) {
    setIfHigher({ fieldName: 'eligibilityNotes', value: prev.eligibilityNotes, sourceKey: 'eligibilitySource', sourceValue: (prev.eligibilitySource as any) || 'explicit' });
    evidence.push({ kind: 'meta', fieldName: 'eligibilityNotes', value: 'carryForward', matchedText: 'previousSnapshot' });
  } else {
    if (!clean(base.eligibilityNotes)) base.eligibilityNotes = '';
    if (!clean((base as any).eligibilitySource)) (base as any).eligibilitySource = 'unknown';
  }

  // PDF upgrades (do not overwrite parsed/explicit; can overwrite inferred/unknown)
  const pdfCC = clean(args.pdfHints?.customerClass ?? '');
  if (pdfCC && pdfCC !== 'unknown') setIfHigher({ fieldName: 'customerClass', value: pdfCC, sourceKey: 'customerClassSource', sourceValue: 'pdf', evidence: { snippet: `customerClass:${pdfCC}` } });
  const pdfV = clean(args.pdfHints?.voltage ?? '');
  if (pdfV && pdfV !== 'unknown') setIfHigher({ fieldName: 'voltage', value: pdfV, sourceKey: 'voltageSource', sourceValue: 'pdf', evidence: { snippet: `voltage:${pdfV}` } });
  const pdfE = clean(args.pdfHints?.eligibilityNotes ?? '');
  if (pdfE) setIfHigher({ fieldName: 'eligibilityNotes', value: pdfE, sourceKey: 'eligibilitySource', sourceValue: 'pdf', evidence: { snippet: `eligibility:${pdfE}` } });

  // Effective dates (parsed hints only)
  const curStart = clean(args.parsedHints?.effectiveStart ?? '');
  const curEnd = clean(args.parsedHints?.effectiveEnd ?? '');
  const pdfStart = clean(args.pdfHints?.effectiveStart ?? '');

  if (curStart || curEnd) {
    setIfHigher({ fieldName: 'effectiveStart', value: curStart || null, sourceKey: 'effectiveSource', sourceValue: 'parsed' });
    base.effectiveEnd = curEnd || null;
  } else if (pdfStart) {
    setIfHigher({ fieldName: 'effectiveStart', value: pdfStart, sourceKey: 'effectiveSource', sourceValue: 'pdf', evidence: { snippet: `effectiveStart:${pdfStart}` } });
    base.effectiveEnd = null;
  } else if (prev && (clean(prev.effectiveStart) || clean(prev.effectiveEnd)) && sourceRank((base as any).effectiveSource) === 0) {
    base.effectiveStart = prev.effectiveStart ?? null;
    base.effectiveEnd = prev.effectiveEnd ?? null;
    base.effectiveSource = prev.effectiveSource || 'explicit';
    evidence.push({ kind: 'meta', fieldName: 'effective', value: 'carryForward', matchedText: 'previousSnapshot' });
  } else {
    base.effectiveStart = null;
    base.effectiveEnd = null;
    base.effectiveSource = 'unknown';
  }

  // Source title (carry forward if we only have 'PDF')
  const curTitle = clean(base.sourceTitle || '');
  const pdfTitle = clean(args.pdfHints?.sourceTitle ?? '');
  if (!curTitle || curTitle.toLowerCase() === 'pdf') {
    if (title) base.sourceTitle = title;
    else if (pdfTitle) {
      base.sourceTitle = pdfTitle;
      addPdf('sourceTitle', pdfTitle);
    } else if (prev && clean(prev.sourceTitle)) {
      base.sourceTitle = prev.sourceTitle;
      evidence.push({ kind: 'meta', fieldName: 'sourceTitle', value: 'carryForward', matchedText: 'previousSnapshot' });
    }
  }

  base.evidence = evidence;
  return base;
}

