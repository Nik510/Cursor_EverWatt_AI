import { describe, expect, it } from 'vitest';

import { computeWizardGatingV1 } from '../src/modules/wizardOutputV1/gatingV1';

describe('wizardOutputV1 gating (deterministic)', () => {
  it('blocks when requiredInputsMissing is non-empty (unless runAnywayChosen)', () => {
    const blocked = computeWizardGatingV1({
      requiredInputsMissing: ['Interval kW series required to compute deterministic bill deltas per billing cycle.'],
      missingInfo: [],
      runAnywayChosen: false,
    });
    expect(blocked.blocked).toBe(true);
    expect(blocked.runStepStatus).toBe('BLOCKED');

    const allowed = computeWizardGatingV1({
      requiredInputsMissing: ['Interval kW series required to compute deterministic bill deltas per billing cycle.'],
      missingInfo: [],
      runAnywayChosen: true,
    });
    expect(allowed.blocked).toBe(false);
    expect(allowed.partialRunAllowed).toBe(true);
    expect(allowed.runStepStatus).toBe('DONE');
  });

  it('blocks when missingInfo contains severity=blocking (unless runAnywayChosen)', () => {
    const blocked = computeWizardGatingV1({
      requiredInputsMissing: [],
      missingInfo: [{ id: 'x.required', severity: 'blocking' }],
      runAnywayChosen: false,
    });
    expect(blocked.blocked).toBe(true);
    expect(blocked.blockedReasons.some((r) => String(r).includes('missingInfo:x.required'))).toBe(true);

    const allowed = computeWizardGatingV1({
      requiredInputsMissing: [],
      missingInfo: [{ id: 'x.required', severity: 'blocking' }],
      runAnywayChosen: true,
    });
    expect(allowed.blocked).toBe(false);
    expect(allowed.partialRunAllowed).toBe(true);
  });
});

