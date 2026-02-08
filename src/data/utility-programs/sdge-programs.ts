import type { UtilityProgram } from './types';

export const sdgePrograms: UtilityProgram[] = [
  {
    id: 'sdge-ee',
    utility: 'SDG&E',
    name: 'Business Energy-Saving Programs',
    category: 'Rebates',
    summary: 'Energy-efficiency incentives for SDG&E business customers.',
    eligibility: ['SDG&E customers', 'Measure eligibility and documentation required'],
    incentives: ['Varies by measure and savings'],
    links: [{ label: 'SDG&E Business Programs', url: 'https://www.sdge.com/' }],
    lastUpdated: '2025-01-01',
  },
  {
    id: 'sdge-dr',
    utility: 'SDG&E',
    name: 'Demand Response Programs',
    category: 'Demand Response',
    summary: 'Programs to reduce load during events; compensation varies by program.',
    eligibility: ['Interval meter or qualifying participation path'],
    incentives: ['Capacity/performance payments depending on program'],
    links: [{ label: 'SDG&E Demand Response', url: 'https://www.sdge.com/' }],
    lastUpdated: '2025-01-01',
  },
];
