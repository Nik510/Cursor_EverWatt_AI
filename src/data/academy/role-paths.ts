export type AcademyRoleId = 'facility-engineer' | 'controls-tech' | 'energy-manager' | 'sales';

export type AcademyLink = {
  label: string;
  description: string;
  /** Internal route (preferred) */
  route?: string;
  /** External URL (LMS) */
  externalUrl?: string;
};

export type AcademyRolePath = {
  id: AcademyRoleId;
  title: string;
  subtitle: string;
  outcomes: string[];
  recommendedNext: AcademyLink[];
};

export function defaultRoleForUser(canSeeSales: boolean): AcademyRoleId {
  return canSeeSales ? 'sales' : 'facility-engineer';
}

export const ACADEMY_ROLE_PATHS: AcademyRolePath[] = [
  {
    id: 'facility-engineer',
    title: 'Facility Engineer',
    subtitle: 'Troubleshooting-first operations (comfort + energy + stability)',
    outcomes: [
      'Triage issues quickly using a trend-first process',
      'Apply rollback-safe mitigations (no “guessing setpoints”)',
      'Recognize high-impact control failures (fighting, hunting, bad resets)',
    ],
    recommendedNext: [
      {
        label: 'Troubleshooting Library',
        description: 'Symptom-first playbooks with trend points, mitigations, and verification.',
        route: '/academy/troubleshooting',
      },
      {
        label: 'Reference Search',
        description: 'Look up concepts and “what good looks like” while staying vendor-agnostic.',
        route: '/academy/standards',
      },
    ],
  },
  {
    id: 'controls-tech',
    title: 'Controls Tech / Commissioning',
    subtitle: 'Sequences, point semantics, stability, and evidence packs',
    outcomes: [
      'Validate command vs feedback and detect mapping/sensor issues',
      'Diagnose stability problems (hunting/oscillation) with trend signatures',
      'Request the right artifacts (point lists, sequences, trending sets)',
    ],
    recommendedNext: [
      {
        label: 'Troubleshooting Library',
        description: 'Start with hunting/resets/economizer playbooks and expand from there.',
        route: '/academy/troubleshooting',
      },
      {
        label: 'Reference Search',
        description: 'Sequence patterns, resets, and terminology (searchable knowledge base).',
        route: '/academy/standards',
      },
    ],
  },
  {
    id: 'energy-manager',
    title: 'Energy Manager',
    subtitle: 'Portfolio outcomes, verification, persistence, and reporting',
    outcomes: [
      'Understand what operational fixes move the biggest KPIs',
      'Verify impact and prevent regressions',
      'Translate findings into executive-ready outputs',
    ],
    recommendedNext: [
      {
        label: 'Troubleshooting Library',
        description: 'Focus on recurring waste patterns (reheat, schedule creep, economizer).',
        route: '/academy/troubleshooting',
      },
      {
        label: 'Reference Search',
        description: 'Look up concepts used in reports and verification.',
        route: '/academy/standards',
      },
    ],
  },
  {
    id: 'sales',
    title: 'Sales (Internal)',
    subtitle: 'Enablement only — isolated portal by design',
    outcomes: ['Find approved enablement material quickly', 'Avoid cross-audience leakage by design'],
    recommendedNext: [
      {
        label: 'Open Sales Academy (LMS)',
        description: 'External portal (internal-only).',
      },
    ],
  },
];

