export type PgeRulebookHintsV1 = {
  customerClass?: string;
  voltage?: string;
  eligibilityNotes?: string;
  effectiveLanguage?: string;
  evidenceByField: Record<string, { inferenceRuleId: string; matchedText: string }>;
};

function normRateCode(raw: string): string {
  const s = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
  const m = /^([A-Z]{1,3})-?(\d{1,3})([A-Z]?)$/.exec(s);
  if (m) return `${m[1]}-${m[2]}${m[3] || ''}`;
  return s;
}

/**
 * PG&E deterministic rulebook (operator-curated).
 * - Populates common C&I schedules we care about.
 * - All outputs are marked INFERRED and include rule IDs.
 */
export function getPgeRulebookHintsV1(rateCodeRaw: string): PgeRulebookHintsV1 | null {
  const rateCode = normRateCode(rateCodeRaw);

  // Variants we treat as part of the same schedule family (deterministic operator curation).
  const isE19Family = rateCode === 'E-19' || rateCode.startsWith('E-19');
  const isB19Family = rateCode === 'B-19' || rateCode.startsWith('B-19');
  const isB20Family = rateCode === 'B-20' || rateCode.startsWith('B-20');
  const isAgFamily = rateCode === 'AG' || rateCode.startsWith('AG-');

  const table: Record<
    string,
    { customerClass?: string; voltage?: string; eligibilityNotes?: string; effectiveLanguage?: string }
  > = {
    'A-6': { customerClass: 'residential', voltage: 'secondary', eligibilityNotes: 'Residential service (time-of-use / optional variants possible).', effectiveLanguage: 'Effective date varies by revision.' },
    'A-10': { customerClass: 'residential', voltage: 'secondary', eligibilityNotes: 'Residential electric service (typical).', effectiveLanguage: 'Effective date varies by revision.' },

    'B-10': { customerClass: 'commercial', voltage: 'secondary', eligibilityNotes: 'Small/medium general service (nonresidential).', effectiveLanguage: 'Effective date varies by revision.' },
    'B-19': { customerClass: 'commercial', voltage: 'secondary', eligibilityNotes: 'General Service (nonresidential). Secondary service typical.', effectiveLanguage: 'Effective date varies by revision.' },
    'B-20': { customerClass: 'commercial', voltage: 'secondary', eligibilityNotes: 'General Service (nonresidential). Secondary service typical.', effectiveLanguage: 'Effective date varies by revision.' },

    'E-19': { customerClass: 'commercial', voltage: 'secondary', eligibilityNotes: 'Large nonresidential TOU service (typical).', effectiveLanguage: 'Effective date varies by revision.' },
    'E-20': { customerClass: 'commercial', voltage: 'secondary', eligibilityNotes: 'Large nonresidential TOU service (typical).', effectiveLanguage: 'Effective date varies by revision.' },
  };

  const row = table[rateCode];
  if (row) {
    const evidenceByField: Record<string, { inferenceRuleId: string; matchedText: string }> = {};
    if (row.customerClass) evidenceByField.customerClass = { inferenceRuleId: `rulebook.pge.${rateCode}.customerClass`, matchedText: rateCode };
    if (row.voltage) evidenceByField.voltage = { inferenceRuleId: `rulebook.pge.${rateCode}.voltage`, matchedText: rateCode };
    if (row.eligibilityNotes) evidenceByField.eligibilityNotes = { inferenceRuleId: `rulebook.pge.${rateCode}.eligibilityNotes`, matchedText: rateCode };
    if (row.effectiveLanguage) evidenceByField.effective = { inferenceRuleId: `rulebook.pge.${rateCode}.effectiveLanguage`, matchedText: rateCode };
    return { ...row, evidenceByField };
  }

  // Families (E-19*, B-19*, B-20*) inherit the base schedule metadata.
  if (isE19Family) {
    return {
      customerClass: 'commercial',
      voltage: 'secondary',
      eligibilityNotes: 'Large nonresidential TOU service (typical).',
      evidenceByField: {
        customerClass: { inferenceRuleId: 'rulebook.pge.E-19*.customerClass', matchedText: rateCode },
        voltage: { inferenceRuleId: 'rulebook.pge.E-19*.voltage', matchedText: rateCode },
        eligibilityNotes: { inferenceRuleId: 'rulebook.pge.E-19*.eligibilityNotes', matchedText: rateCode },
      },
    };
  }
  if (isB19Family) {
    return {
      customerClass: 'commercial',
      voltage: 'secondary',
      eligibilityNotes: 'General Service (nonresidential). Secondary service typical.',
      evidenceByField: {
        customerClass: { inferenceRuleId: 'rulebook.pge.B-19*.customerClass', matchedText: rateCode },
        voltage: { inferenceRuleId: 'rulebook.pge.B-19*.voltage', matchedText: rateCode },
        eligibilityNotes: { inferenceRuleId: 'rulebook.pge.B-19*.eligibilityNotes', matchedText: rateCode },
      },
    };
  }
  if (isB20Family) {
    return {
      customerClass: 'commercial',
      voltage: 'secondary',
      eligibilityNotes: 'General Service (nonresidential). Secondary service typical.',
      evidenceByField: {
        customerClass: { inferenceRuleId: 'rulebook.pge.B-20*.customerClass', matchedText: rateCode },
        voltage: { inferenceRuleId: 'rulebook.pge.B-20*.voltage', matchedText: rateCode },
        eligibilityNotes: { inferenceRuleId: 'rulebook.pge.B-20*.eligibilityNotes', matchedText: rateCode },
      },
    };
  }
  if (isAgFamily) {
    return {
      customerClass: 'agricultural',
      voltage: 'secondary',
      eligibilityNotes: 'Agricultural service (best-effort rulebook family).',
      evidenceByField: {
        customerClass: { inferenceRuleId: 'rulebook.pge.AG*.customerClass', matchedText: rateCode },
        voltage: { inferenceRuleId: 'rulebook.pge.AG*.voltage', matchedText: rateCode },
        eligibilityNotes: { inferenceRuleId: 'rulebook.pge.AG*.eligibilityNotes', matchedText: rateCode },
      },
    };
  }

  // Broad deterministic buckets (INFERRED) for remaining schedules.
  const prefix = rateCode.split('-')[0] || '';
  if (prefix === 'A') {
    return {
      customerClass: 'residential',
      voltage: 'secondary',
      evidenceByField: {
        customerClass: { inferenceRuleId: 'infer.pge.customerClass.A-*', matchedText: rateCode },
        voltage: { inferenceRuleId: 'infer.pge.voltage.defaultSecondary.A-*', matchedText: rateCode },
      },
    };
  }
  if (prefix === 'B') {
    return {
      customerClass: 'commercial',
      voltage: 'secondary',
      evidenceByField: {
        customerClass: { inferenceRuleId: 'infer.pge.customerClass.B-*', matchedText: rateCode },
        voltage: { inferenceRuleId: 'infer.pge.voltage.defaultSecondary.B-*', matchedText: rateCode },
      },
    };
  }
  if (prefix === 'E') {
    return {
      customerClass: 'commercial',
      voltage: 'secondary',
      evidenceByField: {
        customerClass: { inferenceRuleId: 'infer.pge.customerClass.E-*', matchedText: rateCode },
        voltage: { inferenceRuleId: 'infer.pge.voltage.defaultSecondary.E-*', matchedText: rateCode },
      },
    };
  }

  return null;
}

