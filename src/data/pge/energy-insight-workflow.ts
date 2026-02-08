/**
 * PG&E Energy Insight (Salesforce CRM) Workflow Documentation for 3P Partners
 *
 * This captures how third-party implementers (e.g., HEFI) can submit and manage
 * PG&E OBF projects through Energy Insight.
 *
 * NOTE:
 * - This is a structured knowledge artifact (not an API integration).
 * - Replace/expand steps as you ingest internal SOPs/screenshots.
 *
 * Last Updated: 2026-01-01
 */

export type EnergyInsightActor = 'customer' | 'contractor' | '3p-partner' | 'pge';

export interface EnergyInsightStep {
  id: string;
  title: string;
  description: string;
  actor: EnergyInsightActor;
  inputs?: string[];
  outputs?: string[];
  commonIssues?: Array<{
    issue: string;
    mitigation: string;
  }>;
}

export interface EnergyInsightWorkflow {
  name: string;
  scope: string;
  accessRequirements: string[];
  artifacts: string[];
  statuses: string[];
  steps: EnergyInsightStep[];
  bestPractices: string[];
  notes?: string;
}

export const pgeEnergyInsightOBFWorkflow: EnergyInsightWorkflow = {
  name: 'PG&E OBF Submission + Management (Energy Insight)',
  scope:
    'Used by approved 3P partners to create OBF projects, upload documentation, submit for review, respond to comments, and track status.',
  accessRequirements: [
    'Approved 3P partner relationship with PG&E',
    'Energy Insight CRM user account provisioned',
    'OBF submission permissions (role-based)',
    'Ability to upload/attach project documents',
  ],
  artifacts: [
    'OBF project record',
    'Customer/account identifiers (meter / service account)',
    'Document package (pathway-dependent)',
    'Review comments + responses',
    'Approval/OBF agreement artifacts',
  ],
  statuses: [
    'Draft',
    'Submitted',
    'Under Review',
    'Info Requested',
    'Returned / Needs Updates',
    'Approved',
    'Installed / In Progress',
    'Closed',
  ],
  steps: [
    {
      id: 'ei-01-access',
      title: 'Confirm Access + Project Eligibility',
      description:
        'Verify you have the correct Energy Insight role and confirm the customer/account is eligible for OBF and the intended pathway.',
      actor: '3p-partner',
      inputs: ['Customer name', 'Service account / meter identifier', 'Project scope', 'Target pathway'],
      outputs: ['Go/no-go eligibility decision', 'Draft pathway selection'],
      commonIssues: [
        { issue: 'Insufficient CRM permissions', mitigation: 'Request correct role/permission set from PG&E admin' },
        { issue: 'Wrong account identifier', mitigation: 'Verify service account and meter mapping before creating record' },
      ],
    },
    {
      id: 'ei-02-create',
      title: 'Create OBF Project Record',
      description: 'Create a new OBF project record, populate required fields, and assign the pathway (Prescriptive, Custom, or Site-Specific NMEC).',
      actor: '3p-partner',
      inputs: ['Project scope', 'Estimated costs', 'Measure summary', 'Customer/account identifiers'],
      outputs: ['OBF project record in Draft status'],
      commonIssues: [
        { issue: 'Missing required fields', mitigation: 'Use internal field checklist; ensure required metadata completed before submission' },
      ],
    },
    {
      id: 'ei-03-docs',
      title: 'Upload Required Documents',
      description:
        'Attach the pathway-specific document package (application, cost breakdown, engineering, NMEC docs, etc.) to the project record.',
      actor: '3p-partner',
      inputs: ['Pathway-specific document package'],
      outputs: ['Complete document set attached to record'],
      commonIssues: [
        { issue: 'Incorrect file naming / conventions', mitigation: 'Follow PG&E naming conventions (especially Site-Specific NMEC)' },
        { issue: 'Incomplete document set', mitigation: 'Cross-check against pathway required document list before submission' },
      ],
    },
    {
      id: 'ei-04-submit',
      title: 'Submit for PG&E Review',
      description: 'Submit the OBF project for PG&E review through the Energy Insight workflow action.',
      actor: '3p-partner',
      inputs: ['Completed project record', 'All required documents'],
      outputs: ['Status changes to Submitted / Under Review'],
    },
    {
      id: 'ei-05-review-loop',
      title: 'Respond to Review Comments',
      description:
        'Monitor for “Info Requested” or comments. Respond with clarifications and revised documents. Iterate until approval.',
      actor: '3p-partner',
      inputs: ['PG&E comments / requests'],
      outputs: ['Updated documents', 'Responses logged in record', 'Status back to Under Review'],
      commonIssues: [
        { issue: 'Slow turnaround on responses', mitigation: 'Pre-stage templates and maintain a response SLA (e.g., 2 business days)' },
        { issue: 'Model/stat criteria failures (NMEC)', mitigation: 'Run predictability checks early; fix data gaps/outliers before submission' },
      ],
    },
    {
      id: 'ei-06-approval',
      title: 'Approval + Agreement Routing',
      description:
        'Once approved, coordinate OBF agreement execution and confirm financing terms, installation window, and any conditions.',
      actor: 'pge',
      inputs: ['Approved technical package'],
      outputs: ['Approval artifacts', 'OBF agreement / terms'],
    },
    {
      id: 'ei-07-install',
      title: 'Installation + Completion Evidence',
      description: 'Track installation progress and upload completion evidence (invoices, commissioning, etc.) per pathway requirements.',
      actor: 'contractor',
      inputs: ['Installation records', 'Invoices', 'Commissioning/closeout docs'],
      outputs: ['Installed / In Progress status updates', 'Closeout-ready package'],
    },
    {
      id: 'ei-08-mv',
      title: 'NMEC Performance Period + Savings Report (if applicable)',
      description:
        'For Site-Specific NMEC, manage performance period data collection and submit the Savings Report per requirements.',
      actor: 'contractor',
      inputs: ['Performance period interval data', 'Weather normalization inputs', 'Final regression model'],
      outputs: ['NMEC Savings Report uploaded', 'Final closeout'],
    },
  ],
  bestPractices: [
    'Select pathway early (prescriptive vs custom vs site-specific NMEC) to avoid rework',
    'Use a document checklist and enforce naming conventions before upload',
    'For NMEC: validate interval data quality and predictability prior to submission',
    'Treat review comments as a tracked queue with owners + due dates',
  ],
  notes:
    'This workflow reflects operational intent; exact screen/field names can vary by Energy Insight configuration and role permissions.',
};

export function getEnergyInsightWorkflow(): EnergyInsightWorkflow {
  return pgeEnergyInsightOBFWorkflow;
}


