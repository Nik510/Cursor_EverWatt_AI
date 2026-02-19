import { analyzeSupplyStructure } from '../../supply/analyzeSupplyStructure';
import { extractBillPdfTariffHintsV1 } from '../../billPdf/extractBillPdfTariffHintsV1';
import { detectSupplyStructureV1 } from '../../../supplyStructureAnalyzerV1/detectSupplyStructureV1';

import { exceptionName } from '../internals';
import type { AnalyzeUtilityV1Delta, AnalyzeUtilityV1State, NormalizedInputsV1, StepContextV1 } from '../types';

export function stepSupplyStructure(args: {
  state: AnalyzeUtilityV1State;
  normalizedInputs: NormalizedInputsV1;
  ctx: StepContextV1;
}): AnalyzeUtilityV1Delta {
  const { inputs, warn, beginStep, endStep } = args.ctx as any;

  const supplyStructure = analyzeSupplyStructure({
    inputs,
    billingRecords: inputs.billingRecords || null,
    billPdfText: inputs.billPdfText || null,
  });

  const billPdfTariffTruth = extractBillPdfTariffHintsV1(inputs.billPdfText || null);

  beginStep('supplyStructureAnalyzerV1_2');
  const ssaV1 = (() => {
    try {
      return detectSupplyStructureV1({
        billPdfText: inputs.billPdfText || null,
        billHints: {
          utilityHint: (billPdfTariffTruth as any)?.utilityHint ?? null,
          rateScheduleText: (billPdfTariffTruth as any)?.rateScheduleText ?? null,
        },
      });
    } catch (e) {
      warn({
        code: 'UIE_SUPPLY_STRUCTURE_DETECT_FAILED',
        module: 'utilityIntelligence/analyzeUtility',
        operation: 'detectSupplyStructureV1',
        exceptionName: exceptionName(e),
        contextKey: 'supplyStructureAnalyzerV1',
      });
      return null;
    }
  })();
  endStep('supplyStructureAnalyzerV1_2');

  return { supplyStructure, billPdfTariffTruth, ssaV1 };
}

