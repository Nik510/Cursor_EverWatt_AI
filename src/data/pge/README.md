# PG&E Utility Programs Data

This directory contains comprehensive documentation for PG&E utility programs, with a focus on On-Bill Financing (OBF) pathways.

## Files

### `pge-obf-pathways.ts`
Comprehensive documentation of all three PG&E OBF pathways:
- **Prescriptive**: Standard measures with pre-approved savings
- **Custom**: Custom calculated measures requiring engineering analysis
- **Site-Specific NMEC**: Whole-building retrofits with meter-based verification

Each pathway includes:
- Detailed descriptions and use cases
- Eligibility criteria
- Required documents (with template paths)
- Step-by-step submission processes
- Approval criteria
- Energy Insight CRM workflow information
- Timeline expectations

### `index.ts`
Centralized exports for all PG&E-specific program data.

## Data Structure

The pathway data structure includes:

```typescript
PGEOBFPathway {
  id: 'prescriptive' | 'custom' | 'site-specific-nmec'
  name: string
  description: string
  useCase: string
  maxFinancing: number
  typicalTimeline: { ... }
  eligibilityCriteria: string[]
  requiredDocuments: DocumentTemplate[]
  requirements: PathwayRequirement[]
  submissionProcess: { ... }[]
  approvalCriteria: string[]
  energyInsightAccess: { ... }
  notes: string
}
```

## Template Files

The pathway documentation references template files located at:
```
C:\Users\nikjo\OneDrive\Desktop\EverWatt_Engine\UTILITY_&_3P_PROGRAMS\PG&E_UTILITY_PROGRAMS\PG&E_SUBMISSION_FORMS\
```

Key templates:
- **Site-Specific NMEC**:
  - `PREDICTABILITY ANALYSIS REPORT TEMPLATE.docx`
  - `MONITORING AND VERIFICATION PLAN TEMPLATE.docx`
  - `REGRESSION MODEL Template - v2.xlsx`
  - `SCOPING REPORT TEMPLATE.docx`
  - `SITE SPECIFIC - CHECK LIST TEMPLATE.docx`
  - `SITE-SPECIFIC NAMING CONVENTIONS AND DOCUMENTATION.docx`

- **Custom**:
  - `PROJECT FEASIBILITY STUDY TEMPLATE.docx`
  - `SCOPING REPORT TEMPLATE.docx`
  - `DEER2023_DEER_kW_and_IE_Calculator template.xlsx`

## Usage

```typescript
import { 
  pgeOBFPathways, 
  getPGEOBFPathway, 
  getRequiredDocumentsForPathway 
} from '../data/pge/pge-obf-pathways';

// Get specific pathway
const prescriptive = getPGEOBFPathway('prescriptive');

// Get required documents
const docs = getRequiredDocumentsForPathway('site-specific-nmec');

// Access pathway data
const pathway = pgeOBFPathways['custom'];
console.log(pathway.submissionProcess);
console.log(pathway.requiredDocuments);
```

## Integration

This data is integrated into:
- `src/data/obf/obf-eligibility.ts` - References comprehensive pathway data
- `src/pages/UtilitiesAndProgramsLanding.tsx` - Displays pathway information in UI
- `src/data/utility-programs/pge-programs.ts` - Links to OBF program

## Updates

When updating pathway information:
1. Update `pge-obf-pathways.ts` with new requirements, documents, or processes
2. Update template paths if templates are moved
3. Update UI components that display pathway information
4. Update this README if structure changes significantly

## Notes

- **Energy Insight Access**: Only PG&E allows 3P partners to submit OBF through Energy Insight CRM. SCE and SDG&E require direct utility submission.
- **NMEC Pathways**: Only Site-Specific NMEC (Site_NMEC) is used for OBF. Population-Level NMEC (Pop-NMEC) is for Market Access Programs (MAP).
- **2026 Updates**: PG&E OBF limits increased to $400K per project and $6M per account (updated from $250K and $4M).

