import type { UtilityProgram } from './types';

export const scePrograms: UtilityProgram[] = [
  {
    id: 'sce-ee',
    utility: 'SCE',
    name: 'Business Energy Efficiency Solutions',
    category: 'Rebates',
    summary: 'Incentives and support for commercial energy-efficiency projects.',
    eligibility: ['SCE customers', 'Measure eligibility and pre/post verification may apply'],
    incentives: ['Varies by measure and savings'],
    links: [{ label: 'SCE Business Programs', url: 'https://www.sce.com/' }],
    lastUpdated: '2025-01-01',
  },
  {
    id: 'sce-dr',
    utility: 'SCE',
    name: 'Demand Response Programs',
    category: 'Demand Response',
    summary: 'Incentives for reducing load during grid events.',
    eligibility: ['Interval metering or qualifying participation path'],
    incentives: ['Capacity/performance payments depending on program'],
    links: [{ label: 'SCE Demand Response', url: 'https://www.sce.com/' }],
    lastUpdated: '2025-01-01',
  },
];
