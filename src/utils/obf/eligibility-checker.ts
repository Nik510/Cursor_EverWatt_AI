import { obfEligibilityDatabase, type OBFEligibility, type UtilityProvider } from '../../data/obf/obf-eligibility';
import { searchPgePrescriptiveMeasures, type PrescriptiveMeasure } from '../../data/pge/prescriptive-measures';

export interface EligibilitySearchResult {
  source: 'obf-eligibility' | 'pge-prescriptive';
  title: string;
  category: string;
  eligible: boolean;
  details: string;
  pathway?: string;
  raw?: OBFEligibility | PrescriptiveMeasure;
}

export function searchObfEligibility(query: string, utility: UtilityProvider): EligibilitySearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: EligibilitySearchResult[] = [];

  obfEligibilityDatabase.forEach((m) => {
    const haystack = `${m.measureName} ${m.measureId} ${m.category} ${(m.requirements || []).join(' ')} ${(m.documentation || []).join(' ')}`.toLowerCase();
    if (!haystack.includes(q)) return;
    const utilProgram = m.utilityPrograms.find((p) => p.utility === utility);
    results.push({
      source: 'obf-eligibility',
      title: m.measureName,
      category: m.category,
      eligible: !!utilProgram?.eligible,
      details: m.eligibilityReason || (utilProgram?.eligible ? 'Eligible.' : 'Not eligible.'),
      pathway: utilProgram?.pathway,
      raw: m,
    });
  });

  // If PG&E, also include prescriptive dataset matches
  if (utility === 'PGE') {
    const prescriptive = searchPgePrescriptiveMeasures(query);
    prescriptive.forEach((m) => {
      results.push({
        source: 'pge-prescriptive',
        title: m.name,
        category: m.category,
        eligible: true,
        details: m.description,
        pathway: m.pathway,
        raw: m,
      });
    });
  }

  // De-dup
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = `${r.source}:${r.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}


