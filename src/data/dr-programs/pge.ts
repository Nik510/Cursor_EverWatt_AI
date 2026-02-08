import type { DrProgram } from './types';

/**
 * PG&E DR programs (v1)
 *
 * Notes:
 * - Payment values here are defaults/placeholders; the UI can override for scenario testing.
 * - Windows are a simple v1 proxy; refine per-program when you have the latest tariff/program docs.
 */
export const pgeDrPrograms: DrProgram[] = [
  {
    id: 'pge-elrp',
    utility: 'PG&E',
    name: 'ELRP (Emergency Load Reduction Program)',
    description:
      'Event-based payments during grid emergencies for verified load reduction. Participation is commonly via aggregators; rules vary by pathway.',
    eventWindow: { startHour: 16, endHour: 21, weekdaysOnly: true, months: [6, 7, 8, 9] },
    eligibility: {
      requiresIntervalData: true,
      minimumCommitmentKw: 50,
      allowedRateBases: ['B19', 'B19V', 'B20', 'E19', 'A10'],
    },
    payments: {
      capacityPaymentPerKwMonth: 0,
      paymentUnit: 'per_kw_event',
      eventPayment: 1.0,
      estimatedEventsPerYear: 12,
    },
    links: [{ label: 'PG&E Demand Response', url: 'https://www.pge.com/' }],
    lastUpdated: '2026-01-01',
  },
  {
    id: 'pge-bip',
    utility: 'PG&E',
    name: 'BIP (Base Interruptible Program)',
    description:
      'Capacity-style DR with performance obligations. Eligibility commonly requires larger demand and specific rate/service conditions.',
    eventWindow: { startHour: 16, endHour: 21, weekdaysOnly: true, months: [6, 7, 8, 9] },
    eligibility: {
      requiresIntervalData: true,
      minimumCommitmentKw: 100,
      allowedRateBases: ['B19', 'B19V', 'B20', 'E19'],
    },
    payments: {
      capacityPaymentPerKwMonth: 10,
      paymentUnit: 'per_kw_event',
      eventPayment: 1.0,
      estimatedEventsPerYear: 12,
    },
    links: [{ label: 'PG&E Demand Response', url: 'https://www.pge.com/' }],
    lastUpdated: '2026-01-01',
  },
  {
    id: 'pge-cbp',
    utility: 'PG&E',
    name: 'CBP (Capacity Bidding Program)',
    description:
      'Bid-based DR participation; payments depend on bids, events, and performance. Often delivered via aggregators.',
    eventWindow: { startHour: 16, endHour: 21, weekdaysOnly: true, months: [6, 7, 8, 9] },
    eligibility: {
      requiresIntervalData: true,
      minimumCommitmentKw: 50,
      allowedRateBases: ['B19', 'B19V', 'B20', 'E19', 'A10'],
    },
    payments: {
      capacityPaymentPerKwMonth: 10,
      paymentUnit: 'per_kw_event',
      eventPayment: 1.0,
      estimatedEventsPerYear: 12,
    },
    links: [{ label: 'PG&E Demand Response', url: 'https://www.pge.com/' }],
    lastUpdated: '2026-01-01',
  },
];

