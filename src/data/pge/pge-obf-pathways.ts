/**
 * PG&E On-Bill Financing (OBF) Pathway Documentation
 * Comprehensive documentation of all three PG&E OBF pathways:
 * 1. Prescriptive
 * 2. Custom
 * 3. Site-Specific NMEC
 * 
 * Based on templates and documentation from:
 * C:\Users\nikjo\OneDrive\Desktop\EverWatt_Engine\UTILITY_&_3P_PROGRAMS\PG&E_UTILITY_PROGRAMS\PG&E_SUBMISSION_FORMS
 * 
 * Last Updated: 2026-01-01
 */

export type PGEOBFPathwayType = 'prescriptive' | 'custom' | 'site-specific-nmec';

export interface ExternalResourceLink {
  label: string;
  /** External URL (preferred). Avoid relying on local workstation paths at runtime. */
  url?: string;
  /** Optional local/reference path (documentation only; not expected to be accessible in browser builds). */
  referencePath?: string;
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  phase: 'pre-submission' | 'submission' | 'post-approval' | 'installation' | 'performance';
  item: string;
  whyItMatters?: string;
}

export interface CommonIssue {
  issue: string;
  impact: string;
  prevention: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  required: boolean;
  phase: 'pre-submission' | 'submission' | 'post-approval' | 'performance';
  fileType: 'docx' | 'xlsx' | 'pdf' | 'other';
  templatePath?: string; // Path to template file
  notes?: string;
}

export interface PathwayRequirement {
  id: string;
  category: string;
  requirement: string;
  description?: string;
  required: boolean;
  notes?: string;
}

export interface PGEOBFPathway {
  id: PGEOBFPathwayType;
  name: string;
  description: string;
  useCase: string;
  maxFinancing: number;
  typicalTimeline: {
    preSubmission: string;
    review: string;
    approval: string;
    installation: string;
    performance?: string;
  };
  eligibilityCriteria: string[];
  requiredDocuments: DocumentTemplate[];
  requirements: PathwayRequirement[];
  /** High-level checklist items for implementers to avoid missing critical submission steps. */
  checklist?: ChecklistItem[];
  /** Common reasons projects get returned/rejected (and how to avoid). */
  commonIssues?: CommonIssue[];
  /** Tips + best practices beyond the formal requirements. */
  bestPractices?: string[];
  submissionProcess: {
    step: number;
    description: string;
    responsibleParty: 'customer' | 'contractor' | '3p-partner' | 'pge';
    deliverables?: string[];
    estimatedTime?: string;
  }[];
  approvalCriteria: string[];
  resources?: ExternalResourceLink[];
  notes?: string;
  energyInsightAccess?: {
    can3PSubmit: boolean;
    requiredAccess: string[];
    workflow: string[];
  };
}

export const pgeOBFPathways: Record<PGEOBFPathwayType, PGEOBFPathway> = {
  'prescriptive': {
    id: 'prescriptive',
    name: 'Prescriptive',
    description: 'Standard prescriptive measures with pre-approved savings calculations. Fastest approval process for common energy efficiency measures.',
    useCase: 'Common energy efficiency measures that are on PG&E\'s prescriptive list with established savings values',
    maxFinancing: 400000,
    typicalTimeline: {
      preSubmission: '1-2 weeks (gather documentation)',
      review: '2-4 weeks',
      approval: '1-2 weeks after review',
      installation: 'As per project schedule',
    },
    eligibilityCriteria: [
      'Measure must be on PG&E prescriptive measures list',
      'Project cost minimum $5,000',
      'Standard documentation requirements met',
      'Customer in good standing with PG&E',
      '12-month utility billing history available',
      'Equipment meets minimum efficiency requirements',
    ],
    requiredDocuments: [
      {
        id: 'prescriptive-application',
        name: 'Prescriptive Application Form',
        description: 'Standard PG&E prescriptive application form',
        required: true,
        phase: 'submission',
        fileType: 'docx',
        notes: 'Available in Energy Insight or PG&E portal',
      },
      {
        id: 'equipment-specs',
        name: 'Equipment Specifications',
        description: 'Manufacturer specs, model numbers, efficiency ratings',
        required: true,
        phase: 'submission',
        fileType: 'other',
      },
      {
        id: 'contractor-info',
        name: 'Contractor Information',
        description: 'Licensed contractor details and certifications',
        required: true,
        phase: 'submission',
        fileType: 'other',
      },
      {
        id: 'project-cost',
        name: 'Project Cost Breakdown',
        description: 'Detailed cost breakdown of all project components',
        required: true,
        phase: 'submission',
        fileType: 'other',
      },
      {
        id: 'utility-bills',
        name: '12-Month Utility Bills',
        description: 'Historical utility billing data',
        required: true,
        phase: 'submission',
        fileType: 'other',
      },
    ],
    requirements: [
      {
        id: 'pres-01',
        category: 'Measure Eligibility',
        requirement: 'Measure must be on prescriptive list',
        description: 'Check PG&E prescriptive measures database',
        required: true,
      },
      {
        id: 'pres-02',
        category: 'Documentation',
        requirement: 'Standard documentation package',
        description: 'Application form, equipment specs, contractor info, cost breakdown',
        required: true,
      },
      {
        id: 'pres-03',
        category: 'Savings Calculation',
        requirement: 'Use pre-approved savings values',
        description: 'No custom calculations required - use PG&E approved values',
        required: true,
      },
      {
        id: 'pres-04',
        category: 'Equipment',
        requirement: 'Equipment meets minimum efficiency standards',
        description: 'Must meet or exceed PG&E efficiency requirements for measure type',
        required: true,
      },
    ],
    checklist: [
      { id: 'pres-cl-01', phase: 'pre-submission', item: 'Confirm measure is on the current PG&E prescriptive list', whyItMatters: 'If it’s not on the list, it’s not a prescriptive submission.' },
      { id: 'pres-cl-02', phase: 'submission', item: 'Attach equipment specs + cut sheets matching the prescriptive criteria', whyItMatters: 'Missing/incorrect specs is a common return reason.' },
      { id: 'pres-cl-03', phase: 'submission', item: 'Include itemized project cost breakdown (materials + labor)', whyItMatters: 'Supports financing amount and validates eligible cost scope.' },
      { id: 'pres-cl-04', phase: 'post-approval', item: 'Confirm installation window and keep completion evidence', whyItMatters: 'Avoids closeout delays and term issues.' },
    ],
    commonIssues: [
      { issue: 'Measure not actually prescriptive-eligible', impact: 'Project returned; rework into Custom/NMEC', prevention: 'Validate measure against prescriptive table before record creation' },
      { issue: 'Specs do not demonstrate threshold compliance', impact: 'Info requests and delays', prevention: 'Attach cut sheets and explicitly call out efficiency metrics' },
      { issue: 'Cost package not itemized', impact: 'Financing amount cannot be validated', prevention: 'Provide clear line-item cost breakdown and vendor quotes' },
    ],
    bestPractices: [
      'Treat prescriptive as “checklist compliance”: if you can’t show each requirement, it will get returned.',
      'Pre-assemble a standard prescriptive doc package template for your team.',
      'Capture baseline equipment photos/nameplate to resolve disputes quickly.',
    ],
    resources: [
      { label: 'PG&E On-Bill Financing (Program Page)', url: 'https://www.pge.com/' },
    ],
    submissionProcess: [
      {
        step: 1,
        description: 'Identify eligible prescriptive measure(s)',
        responsibleParty: 'customer',
        deliverables: ['Measure list', 'Equipment specifications'],
        estimatedTime: '1-3 days',
      },
      {
        step: 2,
        description: 'Gather required documentation',
        responsibleParty: 'customer',
        deliverables: ['Application form', 'Contractor info', 'Cost breakdown', 'Utility bills'],
        estimatedTime: '1-2 weeks',
      },
      {
        step: 3,
        description: 'Submit application via Energy Insight (if 3P) or direct to PG&E',
        responsibleParty: '3p-partner',
        deliverables: ['Complete application package'],
        estimatedTime: '1 day',
      },
      {
        step: 4,
        description: 'PG&E review and approval',
        responsibleParty: 'pge',
        deliverables: ['Approval letter', 'OBF agreement'],
        estimatedTime: '2-4 weeks',
      },
    ],
    approvalCriteria: [
      'All required documentation complete',
      'Measure on prescriptive list',
      'Project meets minimum cost threshold ($5,000)',
      'Customer eligibility verified',
      'Savings calculations use approved values',
      'Equipment meets efficiency requirements',
    ],
    energyInsightAccess: {
      can3PSubmit: true,
      requiredAccess: ['Energy Insight CRM access', 'OBF submission permissions'],
      workflow: [
        '3P partner logs into Energy Insight',
        'Creates new OBF project',
        'Selects "Prescriptive" pathway',
        'Uploads required documents',
        'Submits for PG&E review',
        'Tracks status and communicates on behalf of customer',
      ],
    },
    notes: 'Fastest pathway - typically 4-8 weeks from submission to approval. Best for standard measures like LED retrofits, VFDs, high-efficiency motors, HVAC equipment replacements.',
  },

  'custom': {
    id: 'custom',
    name: 'Custom',
    description: 'Custom calculated measures requiring engineering analysis and project-specific savings calculations. Allows for unique or complex projects not on prescriptive list.',
    useCase: 'Unique or complex projects requiring custom savings calculations that are not on the prescriptive list',
    maxFinancing: 400000,
    typicalTimeline: {
      preSubmission: '2-4 weeks (engineering analysis)',
      review: '4-8 weeks',
      approval: '2-4 weeks after review',
      installation: 'As per project schedule',
    },
    eligibilityCriteria: [
      'Project requires custom savings calculations',
      'Engineering analysis demonstrates measurable savings',
      'Project cost minimum $5,000',
      'Customer in good standing with PG&E',
      '12-month utility billing history available',
      'Savings must be verifiable and measurable',
    ],
    requiredDocuments: [
      {
        id: 'custom-application',
        name: 'Custom Application Form',
        description: 'PG&E custom calculated application form',
        required: true,
        phase: 'submission',
        fileType: 'docx',
        notes: 'Available in Energy Insight or PG&E portal',
      },
      {
        id: 'engineering-analysis',
        name: 'Engineering Analysis Report',
        description: 'Detailed engineering analysis with savings calculations',
        required: true,
        phase: 'submission',
        fileType: 'docx',
        templatePath: 'PG&E_SUBMISSION_FORMS/PROJECT FEASIBILITY STUDY TEMPLATE.docx',
      },
      {
        id: 'savings-calculations',
        name: 'Savings Calculations',
        description: 'Detailed savings calculations using approved methodologies (DEER, etc.)',
        required: true,
        phase: 'submission',
        fileType: 'xlsx',
        templatePath: 'PG&E_SUBMISSION_FORMS/DEER2023_DEER_kW_and_IE_Calculator template.xlsx',
      },
      {
        id: 'scoping-report',
        name: 'Scoping Report',
        description: 'Project scope, measures, and baseline conditions',
        required: true,
        phase: 'submission',
        fileType: 'docx',
        templatePath: 'PG&E_SUBMISSION_FORMS/SCOPING REPORT TEMPLATE.docx',
      },
      {
        id: 'equipment-specs',
        name: 'Equipment Specifications',
        description: 'Detailed equipment specifications and efficiency data',
        required: true,
        phase: 'submission',
        fileType: 'other',
      },
      {
        id: 'contractor-info',
        name: 'Contractor Information',
        description: 'Licensed contractor details and certifications',
        required: true,
        phase: 'submission',
        fileType: 'other',
      },
      {
        id: 'project-cost',
        name: 'Project Cost Breakdown',
        description: 'Detailed cost breakdown of all project components',
        required: true,
        phase: 'submission',
        fileType: 'other',
      },
      {
        id: 'utility-bills',
        name: '12-Month Utility Bills',
        description: 'Historical utility billing data',
        required: true,
        phase: 'submission',
        fileType: 'other',
      },
    ],
    requirements: [
      {
        id: 'custom-01',
        category: 'Engineering Analysis',
        requirement: 'Professional engineering analysis required',
        description: 'Must be performed by qualified engineer or energy professional',
        required: true,
      },
      {
        id: 'custom-02',
        category: 'Savings Calculations',
        requirement: 'Custom savings calculations using approved methodologies',
        description: 'DEER, ASHRAE, or other PG&E-approved calculation methods',
        required: true,
      },
      {
        id: 'custom-03',
        category: 'Documentation',
        requirement: 'Comprehensive documentation package',
        description: 'Engineering analysis, scoping report, savings calculations, equipment specs',
        required: true,
      },
      {
        id: 'custom-04',
        category: 'Savings Verification',
        requirement: 'Savings must be measurable and verifiable',
        description: 'Must demonstrate clear, quantifiable energy savings',
        required: true,
      },
      {
        id: 'custom-05',
        category: 'Methodology',
        requirement: 'Use approved calculation methodologies',
        description: 'DEER, ASHRAE, or PG&E-approved custom calculation methods',
        required: true,
      },
    ],
    checklist: [
      { id: 'cust-cl-01', phase: 'pre-submission', item: 'Complete scoping with baseline conditions and clear measure definition', whyItMatters: 'Engineering review depends on unambiguous baseline/proposed.' },
      { id: 'cust-cl-02', phase: 'submission', item: 'Include engineering analysis report and savings calc workbook', whyItMatters: 'Core of Custom pathway approval.' },
      { id: 'cust-cl-03', phase: 'submission', item: 'Attach assumptions + data sources (DEER/ASHRAE/etc.)', whyItMatters: 'Reduces back-and-forth during technical review.' },
      { id: 'cust-cl-04', phase: 'post-approval', item: 'Preserve as-built documentation and any deviation notes', whyItMatters: 'Avoids disputes at closeout and for rebate alignment.' },
    ],
    commonIssues: [
      { issue: 'Savings method not traceable/defensible', impact: 'Extended technical review and revisions', prevention: 'Cite approved methods and show assumptions explicitly' },
      { issue: 'Baseline definition unclear', impact: 'Reviewer cannot validate delta', prevention: 'Document baseline equipment, controls sequence, and operating schedule' },
      { issue: 'Interactive effects not addressed', impact: 'Savings over/understated', prevention: 'Model interactive effects or justify exclusions clearly' },
    ],
    bestPractices: [
      'Write the engineering package like a reviewer playbook: clear baseline, clear proposed, transparent assumptions.',
      'Use a scoping report to lock down boundary, operating conditions, and measures.',
      'Run internal QA on calculations before submission (units, sign conventions, peak coincidence).',
    ],
    resources: [
      { label: 'PG&E On-Bill Financing (Program Page)', url: 'https://www.pge.com/' },
    ],
    submissionProcess: [
      {
        step: 1,
        description: 'Project scoping and baseline assessment',
        responsibleParty: 'customer',
        deliverables: ['Site assessment', 'Baseline conditions', 'Measure identification'],
        estimatedTime: '1-2 weeks',
      },
      {
        step: 2,
        description: 'Engineering analysis and savings calculations',
        responsibleParty: 'contractor',
        deliverables: ['Engineering analysis report', 'Savings calculations', 'Scoping report'],
        estimatedTime: '2-4 weeks',
      },
      {
        step: 3,
        description: 'Compile documentation package',
        responsibleParty: 'customer',
        deliverables: ['Complete documentation package'],
        estimatedTime: '1 week',
      },
      {
        step: 4,
        description: 'Submit application via Energy Insight (if 3P) or direct to PG&E',
        responsibleParty: '3p-partner',
        deliverables: ['Complete application package'],
        estimatedTime: '1 day',
      },
      {
        step: 5,
        description: 'PG&E technical review',
        responsibleParty: 'pge',
        deliverables: ['Review comments', 'Requests for additional information'],
        estimatedTime: '4-8 weeks',
      },
      {
        step: 6,
        description: 'Address review comments (if any)',
        responsibleParty: 'contractor',
        deliverables: ['Revised documentation', 'Responses to comments'],
        estimatedTime: '1-2 weeks',
      },
      {
        step: 7,
        description: 'PG&E approval',
        responsibleParty: 'pge',
        deliverables: ['Approval letter', 'OBF agreement'],
        estimatedTime: '2-4 weeks',
      },
    ],
    approvalCriteria: [
      'All required documentation complete',
      'Engineering analysis demonstrates measurable savings',
      'Savings calculations use approved methodologies',
      'Project meets minimum cost threshold ($5,000)',
      'Customer eligibility verified',
      'Technical review passed',
      'Savings are verifiable and measurable',
    ],
    energyInsightAccess: {
      can3PSubmit: true,
      requiredAccess: ['Energy Insight CRM access', 'OBF submission permissions', 'Custom pathway access'],
      workflow: [
        '3P partner logs into Energy Insight',
        'Creates new OBF project',
        'Selects "Custom" pathway',
        'Uploads engineering analysis and all required documents',
        'Submits for PG&E technical review',
        'Responds to review comments through Energy Insight',
        'Tracks status and communicates on behalf of customer',
      ],
    },
    notes: 'More rigorous pathway requiring engineering analysis. Typically 8-16 weeks from submission to approval. Best for unique projects, custom equipment configurations, or measures not on prescriptive list.',
  },

  'site-specific-nmec': {
    id: 'site-specific-nmec',
    name: 'Site-Specific NMEC',
    description: 'Site-Specific Normalized Metered Energy Consumption (IPMVP Option C) for whole-building retrofits where savings are verified at the meter. Most rigorous pathway but allows for whole-building savings verification and interactive effects.',
    useCase: 'Whole-building retrofits where savings are verified at the meter, allowing for interactive effects between multiple measures',
    maxFinancing: 400000,
    typicalTimeline: {
      preSubmission: '4-8 weeks (baseline data collection and analysis)',
      review: '6-12 weeks',
      approval: '2-4 weeks after review',
      installation: 'As per project schedule (max 18 months from baseline end)',
      performance: '12 months post-installation monitoring',
    },
    eligibilityCriteria: [
      'Whole-building or major system retrofits',
      '12-month baseline period with interval data available',
      'Project cost minimum $5,000',
      'Customer in good standing with PG&E',
      'Interval meter (15-minute or hourly) required',
      'Building can be modeled (meets NMEC predictability criteria)',
      'Multiple measures with potential interactive effects',
    ],
    requiredDocuments: [
      {
        id: 'nmec-application',
        name: 'Site-Specific NMEC Application Form',
        description: 'PG&E Site-Specific NMEC application form',
        required: true,
        phase: 'submission',
        fileType: 'docx',
        notes: 'Available in Energy Insight or PG&E portal',
      },
      {
        id: 'predictability-report',
        name: 'Predictability Analysis Report',
        description: 'Proves building can be modeled - baseline regression analysis',
        required: true,
        phase: 'submission',
        fileType: 'docx',
        templatePath: 'PG&E_SUBMISSION_FORMS/PREDICTABILITY ANALYSIS REPORT TEMPLATE.docx',
        notes: 'Must demonstrate CVRMSE < 25%, NMBE ± 0.5%, R² > 0.7',
      },
      {
        id: 'mv-plan',
        name: 'Monitoring and Verification (M&V) Plan',
        description: 'Contract for NMEC project - defines measurement boundary, EEMs, EUL, uncertainty',
        required: true,
        phase: 'submission',
        fileType: 'docx',
        templatePath: 'PG&E_SUBMISSION_FORMS/MONITORING AND VERIFICATION PLAN TEMPLATE.docx',
      },
      {
        id: 'regression-model',
        name: 'Regression Model',
        description: 'Baseline regression model (TOWT, Change-Point, or Mean Model)',
        required: true,
        phase: 'submission',
        fileType: 'xlsx',
        templatePath: 'PG&E_SUBMISSION_FORMS/REGRESSION MODEL Template - v2.xlsx',
      },
      {
        id: 'scoping-report',
        name: 'Scoping Report',
        description: 'Project scope, measures, baseline conditions, measurement boundary',
        required: true,
        phase: 'submission',
        fileType: 'docx',
        templatePath: 'PG&E_SUBMISSION_FORMS/SCOPING REPORT TEMPLATE.docx',
      },
      {
        id: 'baseline-data',
        name: '12-Month Baseline Data',
        description: 'Interval data (15-min or hourly) for 12-month baseline period',
        required: true,
        phase: 'submission',
        fileType: 'other',
        notes: 'Must include electricity, gas (if applicable), weather data',
      },
      {
        id: 'site-checklist',
        name: 'Site-Specific Checklist',
        description: 'Site-Specific NMEC checklist',
        required: true,
        phase: 'submission',
        fileType: 'docx',
        templatePath: 'PG&E_SUBMISSION_FORMS/SITE SPECIFIC - CHECK LIST TEMPLATE.docx',
      },
      {
        id: 'naming-conventions',
        name: 'Naming Conventions Documentation',
        description: 'Documentation following PG&E naming conventions',
        required: true,
        phase: 'submission',
        fileType: 'docx',
        templatePath: 'PG&E_SUBMISSION_FORMS/SITE-SPECIFIC NAMING CONVENTIONS AND DOCUMENTATION.docx',
      },
      {
        id: 'equipment-specs',
        name: 'Equipment Specifications',
        description: 'Detailed equipment specifications for all measures',
        required: true,
        phase: 'submission',
        fileType: 'other',
      },
      {
        id: 'project-cost',
        name: 'Project Cost Breakdown',
        description: 'Detailed cost breakdown of all project components',
        required: true,
        phase: 'submission',
        fileType: 'other',
      },
    ],
    requirements: [
      {
        id: 'nmec-01',
        category: 'Baseline Period',
        requirement: '12-month baseline period with interval data',
        description: 'Minimum 12 months of 15-minute or hourly interval data required',
        required: true,
      },
      {
        id: 'nmec-02',
        category: 'Predictability',
        requirement: 'Building must meet NMEC predictability criteria',
        description: 'CVRMSE < 25%, NMBE ± 0.5%, R² > 0.7',
        required: true,
      },
      {
        id: 'nmec-03',
        category: 'Regression Model',
        requirement: 'Validated regression model (TOWT, Change-Point, or Mean)',
        description: 'Model must pass statistical criteria and be appropriate for building type',
        required: true,
      },
      {
        id: 'nmec-04',
        category: 'M&V Plan',
        requirement: 'Comprehensive M&V Plan',
        description: 'Defines measurement boundary, EEMs, Expected Useful Life (EUL), uncertainty statement',
        required: true,
      },
      {
        id: 'nmec-05',
        category: 'Data Quality',
        requirement: 'High-quality interval data',
        description: 'Minimal gaps, outliers addressed, proper unit conversion',
        required: true,
      },
      {
        id: 'nmec-06',
        category: 'Weather Data',
        requirement: 'Historical and normalized weather data',
        description: 'NOAA or local weather station data, CALEE2018 typical weather files for normalization',
        required: true,
      },
      {
        id: 'nmec-07',
        category: 'Installation Window',
        requirement: 'Installation within 18 months of baseline end',
        description: 'Maximum 18 months from end of baseline to start of performance period',
        required: true,
      },
      {
        id: 'nmec-08',
        category: 'Performance Period',
        requirement: '12-month performance period monitoring',
        description: 'Post-installation monitoring for 12 months to verify savings',
        required: true,
      },
    ],
    checklist: [
      { id: 'nmec-cl-01', phase: 'pre-submission', item: 'Validate 12-month baseline interval data completeness (gaps/outliers)', whyItMatters: 'Data quality issues can fail predictability/stat criteria.' },
      { id: 'nmec-cl-02', phase: 'pre-submission', item: 'Run predictability analysis early (CVRMSE/NMBE/R² targets)', whyItMatters: 'If it won’t model, you should not submit NMEC.' },
      { id: 'nmec-cl-03', phase: 'submission', item: 'Submit Predictability Report + M&V Plan + Regression Model workbook', whyItMatters: 'Core NMEC gating artifacts.' },
      { id: 'nmec-cl-04', phase: 'submission', item: 'Follow Site-NMEC naming conventions for every file', whyItMatters: 'Naming convention violations commonly trigger returns.' },
      { id: 'nmec-cl-05', phase: 'performance', item: 'Plan for 12-month performance period + Savings Report timeline', whyItMatters: 'NMEC savings verification is performance-period dependent.' },
    ],
    commonIssues: [
      { issue: 'Predictability criteria not met', impact: 'NMEC pathway not accepted; redesign required', prevention: 'Fix data quality and model form; consider alternative pathway if not feasible' },
      { issue: 'Missing/incorrect weather normalization inputs', impact: 'Model invalidation or rework', prevention: 'Standardize weather source + station selection and document it' },
      { issue: 'Installation window exceeds allowed duration', impact: 'Baseline becomes stale; re-baseline may be required', prevention: 'Schedule install to stay within baseline-to-performance constraints' },
      { issue: 'File naming conventions not followed', impact: 'Project returned before technical review', prevention: 'Enforce naming conventions via checklist and internal QA' },
    ],
    bestPractices: [
      'Treat NMEC as an M&V project, not just a financing application.',
      'Pre-QA interval data (gaps/outliers/timezone) and keep a reproducible cleaning log.',
      'Use a standard regression template and keep model decisions documented.',
      'Lock down measure boundary early to avoid scope creep that breaks modeling.',
    ],
    resources: [
      { label: 'PG&E On-Bill Financing (Program Page)', url: 'https://www.pge.com/' },
      { label: 'Site-Specific NMEC requirements (reference path)', referencePath: 'PG&E_SUBMISSION_PATHWAYS/SITE_NMEC/PGE-Site-NMEC-MV-Requirements.pdf' },
    ],
    submissionProcess: [
      {
        step: 1,
        description: 'Collect 12-month baseline interval data',
        responsibleParty: 'customer',
        deliverables: ['Interval data (15-min or hourly)', 'Weather data', 'Utility bills'],
        estimatedTime: '12 months (historical)',
      },
      {
        step: 2,
        description: 'Develop baseline regression model',
        responsibleParty: 'contractor',
        deliverables: ['Regression model', 'Predictability analysis'],
        estimatedTime: '2-4 weeks',
      },
      {
        step: 3,
        description: 'Create Predictability Report',
        responsibleParty: 'contractor',
        deliverables: ['Predictability Analysis Report'],
        estimatedTime: '1-2 weeks',
      },
      {
        step: 4,
        description: 'Develop M&V Plan',
        responsibleParty: 'contractor',
        deliverables: ['M&V Plan with measurement boundary, EEMs, EUL'],
        estimatedTime: '1-2 weeks',
      },
      {
        step: 5,
        description: 'Compile complete documentation package',
        responsibleParty: 'customer',
        deliverables: ['Complete NMEC documentation package'],
        estimatedTime: '1 week',
      },
      {
        step: 6,
        description: 'Submit application via Energy Insight (if 3P) or direct to PG&E',
        responsibleParty: '3p-partner',
        deliverables: ['Complete application package'],
        estimatedTime: '1 day',
      },
      {
        step: 7,
        description: 'PG&E technical review',
        responsibleParty: 'pge',
        deliverables: ['Review comments', 'Requests for additional information'],
        estimatedTime: '6-12 weeks',
      },
      {
        step: 8,
        description: 'Address review comments (if any)',
        responsibleParty: 'contractor',
        deliverables: ['Revised documentation', 'Responses to comments'],
        estimatedTime: '2-4 weeks',
      },
      {
        step: 9,
        description: 'PG&E approval and M&V Plan acceptance',
        responsibleParty: 'pge',
        deliverables: ['Approval letter', 'M&V Plan acceptance', 'OBF agreement'],
        estimatedTime: '2-4 weeks',
      },
      {
        step: 10,
        description: 'Installation (within 18 months of baseline end)',
        responsibleParty: 'contractor',
        deliverables: ['Installed measures', 'Installation documentation'],
        estimatedTime: 'As per project schedule',
      },
      {
        step: 11,
        description: '12-month performance period monitoring',
        responsibleParty: 'contractor',
        deliverables: ['Performance period data', 'Savings Report'],
        estimatedTime: '12 months',
      },
    ],
    approvalCriteria: [
      'All required documentation complete',
      'Predictability Report demonstrates building can be modeled',
      'Regression model meets statistical criteria (CVRMSE < 25%, NMBE ± 0.5%, R² > 0.7)',
      'M&V Plan approved by PG&E',
      'Project meets minimum cost threshold ($5,000)',
      'Customer eligibility verified',
      'Baseline data quality acceptable',
      'Installation window feasible (within 18 months)',
    ],
    energyInsightAccess: {
      can3PSubmit: true,
      requiredAccess: ['Energy Insight CRM access', 'OBF submission permissions', 'Site-Specific NMEC pathway access'],
      workflow: [
        '3P partner logs into Energy Insight',
        'Creates new OBF project',
        'Selects "Site-Specific NMEC" pathway',
        'Uploads Predictability Report, M&V Plan, regression model, and all required documents',
        'Submits for PG&E technical review',
        'Responds to review comments through Energy Insight',
        'Tracks M&V Plan approval status',
        'Monitors performance period and submits Savings Report',
        'Tracks status and communicates on behalf of customer',
      ],
    },
    notes: 'Most rigorous pathway requiring extensive documentation and 12-month performance monitoring. Typically 12-20 weeks from submission to approval, plus 12-month performance period. Best for whole-building retrofits, multiple interactive measures, or when prescriptive/custom pathways are not suitable. Allows for verification of interactive effects between measures.',
  },
};

/**
 * Get pathway information by ID
 */
export function getPGEOBFPathway(pathway: PGEOBFPathwayType): PGEOBFPathway {
  return pgeOBFPathways[pathway];
}

/**
 * Get all pathways
 */
export function getAllPGEOBFPathways(): PGEOBFPathway[] {
  return Object.values(pgeOBFPathways);
}

/**
 * Get required documents for a pathway
 */
export function getRequiredDocumentsForPathway(pathway: PGEOBFPathwayType): DocumentTemplate[] {
  return pgeOBFPathways[pathway].requiredDocuments.filter(doc => doc.required);
}

/**
 * Get pathway by use case keywords
 */
export function getPathwayByUseCase(keywords: string[]): PGEOBFPathwayType[] {
  const matches: PGEOBFPathwayType[] = [];
  const lowerKeywords = keywords.map(k => k.toLowerCase());
  
  Object.entries(pgeOBFPathways).forEach(([id, pathway]) => {
    const useCaseLower = pathway.useCase.toLowerCase();
    if (lowerKeywords.some(keyword => useCaseLower.includes(keyword))) {
      matches.push(id as PGEOBFPathwayType);
    }
  });
  
  return matches;
}

/**
 * Compare pathways
 */
export function comparePathways(): {
  fastest: PGEOBFPathwayType;
  mostFlexible: PGEOBFPathwayType;
  mostRigorous: PGEOBFPathwayType;
} {
  return {
    fastest: 'prescriptive',
    mostFlexible: 'custom',
    mostRigorous: 'site-specific-nmec',
  };
}

export default pgeOBFPathways;

