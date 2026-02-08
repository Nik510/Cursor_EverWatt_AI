/**
 * Rate Explanations and Documentation
 * Detailed explanations of how each rate schedule works
 */

export interface RateExplanation {
  rateCode: string;
  utility: string;
  title: string;
  overview: string;
  howItWorks: string[];
  keyFeatures: string[];
  bestFor: string[];
  importantNotes: string[];
  billingDetails: {
    demandCharges: string;
    energyCharges: string;
    fixedCharges: string;
    otherCharges?: string;
  };
  eligibility: string[];
  examples?: string[];
}

export const rateExplanations: Record<string, RateExplanation> = {
  'pge-b-19': {
    rateCode: 'B-19',
    utility: 'PG&E',
    title: 'B-19 Medium General Demand-Metered TOU',
    overview: 'The B-19 rate schedule is designed for medium commercial and industrial customers with maximum demands between 20 kW and 999 kW. It features time-of-use pricing with multiple demand charge components.',
    howItWorks: [
      'Energy charges vary by time of day and season (On-Peak, Partial-Peak, Off-Peak)',
      'Demand charges are assessed based on the highest 15-minute average demand during specific periods',
      'Multiple demand charges apply: Maximum Demand (all hours) and On-Peak/Partial-Peak Period Demand',
      'Summer season (June-September) has higher rates than winter',
      'Peak hours are 3:00 PM to 8:00 PM weekdays',
      '15-minute interval data is used for demand calculations',
    ],
    keyFeatures: [
      'Time-of-Use (TOU) pricing structure',
      'Multiple demand charge components',
      'Seasonal rate variations',
      '15-minute demand averaging',
      'S-Rate eligible for solar customers',
    ],
    bestFor: [
      'Medium commercial facilities (20-999 kW peak demand)',
      'Businesses with predictable load patterns',
      'Customers who can shift usage to off-peak hours',
      'Facilities with solar generation (S-Rate eligible)',
    ],
    importantNotes: [
      'Demand charges can represent 30-50% of total bill for many customers',
      'Peak shaving strategies can significantly reduce costs',
      'Battery storage is highly effective on this rate',
      'Fixed charges include Customer Charge ($3,872.60/month) and TOU Meter Charge ($342.20/month)',
      'Effective January 1, 2025 - Rates updated for 2025',
    ],
    billingDetails: {
      demandCharges: 'Maximum Demand: $19.20/kW (all hours, both seasons). On-Peak Period Demand: $19.17/kW (summer), $1.85/kW (winter). Partial-Peak Period Demand: $4.79/kW (summer only).',
      energyCharges: 'Summer: On-Peak $0.19551/kWh (3-8 PM weekdays), Partial-Peak $0.17922/kWh (10 AM-3 PM, 8-10 PM weekdays), Off-Peak $0.14455/kWh (all other times). Winter: On-Peak $0.19441/kWh (3-8 PM weekdays), Off-Peak $0.14532/kWh (all other times).',
      fixedCharges: 'Customer Charge: $3,872.60/month. TOU Meter Charge (Rate V): $342.20/month.',
    },
    eligibility: [
      'Maximum demand between 20 kW and 999 kW',
      'General commercial or industrial service',
      'Time-of-use metering required',
    ],
    examples: [
      'A facility with 500 kW peak demand and 100,000 kWh monthly usage would pay approximately $9,600/month in demand charges plus energy charges based on TOU periods.',
      'Shifting 20% of peak period usage to off-peak can save 10-15% on energy costs.',
    ],
  },
  'pge-b-20': {
    rateCode: 'B-20',
    utility: 'PG&E',
    title: 'B-20 Large General Demand-Metered TOU',
    overview: 'The B-20 rate schedule is for large commercial and industrial customers with maximum demands of 1,000 kW or greater. This is a legacy rate that has been grandfathered for certain customers with solar systems.',
    howItWorks: [
      'Similar structure to B-19 but for larger customers (1,000+ kW)',
      'Same TOU periods and demand charge structure as B-19',
      'Grandfathered for customers who submitted interconnection applications by January 31, 2017',
      'New solar customers are typically required to be on B-19 or newer rates',
      'Same peak hours: 3:00 PM to 8:00 PM weekdays',
    ],
    keyFeatures: [
      'Legacy rate for large C&I customers',
      'Grandfathered for qualifying solar installations',
      'Same rate structure as B-19',
      'S-Rate eligible',
    ],
    bestFor: [
      'Large commercial facilities (1,000+ kW peak demand)',
      'Existing solar customers grandfathered on this rate',
      'Facilities with high demand but ability to shift loads',
    ],
    importantNotes: [
      'This rate is no longer available to new customers',
      'Grandfathered customers can remain on this rate under certain conditions',
      'New solar installations typically must use B-19 or newer rates',
      'Rate structure identical to B-19 but for larger customers',
    ],
    billingDetails: {
      demandCharges: 'Same as B-19: Maximum Demand $19.20/kW, On-Peak Period Demand $19.17/kW (summer), $1.85/kW (winter), Partial-Peak Period Demand $4.79/kW (summer).',
      energyCharges: 'Same as B-19: Summer On-Peak $0.19551/kWh, Partial-Peak $0.17922/kWh, Off-Peak $0.14455/kWh. Winter On-Peak $0.19441/kWh, Off-Peak $0.14532/kWh.',
      fixedCharges: 'Customer Charge: $3,872.60/month. TOU Meter Charge (Rate V): $342.20/month.',
    },
    eligibility: [
      'Maximum demand of 1,000 kW or greater',
      'Grandfathered status for solar customers (application submitted by Jan 31, 2017)',
      'General commercial or industrial service',
    ],
  },
  'pge-b-10': {
    rateCode: 'B-10',
    utility: 'PG&E',
    title: 'B-10 Commercial Only Service',
    overview: 'B-10 is a general commercial rate schedule for smaller commercial customers who do not require demand metering or TOU pricing. This is a simple, straightforward rate structure.',
    howItWorks: [
      'Simple rate structure without TOU periods',
      'No demand charges for most customers',
      'Flat energy rate applies to all usage',
      'Simpler billing structure - easier to understand and predict',
      'Updated September 1, 2025',
    ],
    keyFeatures: [
      'Simple rate structure',
      'No TOU periods - same rate all day',
      'No demand charges (for most customers)',
      'Easier to understand and budget',
      'Lower fixed charges than demand-metered rates',
    ],
    bestFor: [
      'Small commercial customers',
      'Businesses with low, consistent usage',
      'Customers who prefer simple billing',
      'Facilities without significant peak demand',
      'Businesses that cannot easily shift usage patterns',
    ],
    importantNotes: [
      'May not be cost-effective for customers with high peak demands',
      'No incentive to shift usage to off-peak hours',
      'Customers with demand spikes may benefit from TOU rates',
      'Updated September 1, 2025',
      'Consider upgrading to B-19 if demand exceeds 20 kW',
    ],
    billingDetails: {
      demandCharges: 'Typically no demand charges for most B-10 customers. Some service configurations may have minimal demand charges.',
      energyCharges: 'Flat energy rate of approximately $0.28/kWh applies to all usage regardless of time of day.',
      fixedCharges: 'Customer charge: $50.00/month (lower than demand-metered rates).',
    },
    eligibility: [
      'Commercial service only',
      'Smaller commercial customers',
      'No demand metering required',
      'Typically for customers with peak demand under 20 kW',
    ],
  },
  'pge-e-19': {
    rateCode: 'E-19',
    utility: 'PG&E',
    title: 'E-19 Medium General Service TOU (Legacy)',
    overview: 'E-19 is a legacy rate schedule for medium commercial customers that has been largely replaced by B-19. Some customers remain grandfathered on this rate.',
    howItWorks: [
      'Legacy TOU rate structure similar to B-19',
      'Lower rates than current B-19 schedule',
      'Grandfathered for certain customers',
      'Being phased out in favor of B-19',
      'Same TOU periods as B-19 but with legacy rate values',
    ],
    keyFeatures: [
      'Legacy rate schedule',
      'Grandfathered status available',
      'Lower rates than current B-19',
      'Being replaced by B-19',
      'S-Rate eligible for solar customers',
    ],
    bestFor: [
      'Existing customers grandfathered on this rate',
      'Medium commercial facilities (20-999 kW)',
      'Customers who want to maintain legacy rates',
    ],
    importantNotes: [
      'This rate is being phased out',
      'New customers cannot select this rate',
      'Grandfathered customers may be transitioned to B-19',
      'Rates are generally lower than B-19 but rate structure is similar',
      'Consider impact of potential rate transition',
    ],
    billingDetails: {
      demandCharges: 'Maximum Demand: $18.00/kW (both seasons). Lower than current B-19 rates.',
      energyCharges: 'Summer: On-Peak $0.185/kWh, Partial-Peak $0.170/kWh, Off-Peak $0.135/kWh. Winter: On-Peak $0.180/kWh, Off-Peak $0.135/kWh.',
      fixedCharges: 'Customer Charge: $3,500.00/month (legacy rate, lower than B-19).',
    },
    eligibility: [
      'Grandfathered customers only',
      'Medium commercial service (20-999 kW)',
      'Customers who qualified before rate transition',
    ],
  },
  'pge-e-20': {
    rateCode: 'E-20',
    utility: 'PG&E',
    title: 'E-20 Large General Service TOU (Legacy)',
    overview: 'E-20 is a legacy rate schedule for large commercial customers, similar to how E-19 relates to B-19. It has been largely replaced by B-20.',
    howItWorks: [
      'Legacy TOU rate for large customers',
      'Similar structure to E-19 but for larger facilities',
      'Being replaced by B-20',
      'Grandfathered status available',
      'Lower rates than current B-20 schedule',
    ],
    keyFeatures: [
      'Legacy rate schedule',
      'For large commercial customers (1,000+ kW)',
      'Being phased out',
      'Grandfathered status available',
    ],
    bestFor: [
      'Existing large customers grandfathered on this rate',
      'Large commercial facilities (1,000+ kW)',
    ],
    importantNotes: [
      'Being phased out in favor of B-20',
      'New customers cannot select this rate',
      'Grandfathered customers may be transitioned to B-20',
      'Rates are generally lower than B-20',
    ],
    billingDetails: {
      demandCharges: 'Maximum Demand: $18.00/kW (both seasons). Lower than current B-20 rates.',
      energyCharges: 'Summer: On-Peak $0.185/kWh, Partial-Peak $0.170/kWh, Off-Peak $0.135/kWh. Winter: On-Peak $0.180/kWh, Off-Peak $0.135/kWh.',
      fixedCharges: 'Customer Charge: $3,500.00/month (legacy rate).',
    },
    eligibility: [
      'Grandfathered customers only',
      'Large commercial service (typically 1,000+ kW)',
      'Customers who qualified before rate transition',
    ],
  },
  'pge-a-1': {
    rateCode: 'A-1',
    utility: 'PG&E',
    title: 'A-1 Small General Service',
    overview: 'A-1 is a simple rate schedule for small commercial customers without demand metering. This is the most basic commercial rate structure.',
    howItWorks: [
      'Simple flat rate structure - no TOU periods',
      'No demand charges',
      'Single energy rate applies to all usage',
      'Lower fixed charges than demand-metered rates',
      'Ideal for small businesses with consistent, low usage',
    ],
    keyFeatures: [
      'Simple rate structure',
      'No time-of-use periods',
      'No demand charges',
      'Easy to understand and budget',
      'Lower monthly fixed charges',
    ],
    bestFor: [
      'Small commercial customers',
      'Businesses with peak demand under 20 kW',
      'Facilities with consistent, low usage',
      'Customers who prefer simple billing',
    ],
    importantNotes: [
      'Not suitable for customers with high peak demands',
      'No incentive to shift usage to off-peak hours',
      'Consider A-6 or B-19 if demand exceeds 20 kW',
      'Effective January 1, 2025',
    ],
    billingDetails: {
      demandCharges: 'No demand charges for A-1 customers.',
      energyCharges: 'Flat energy rate of approximately $0.16959/kWh applies to all usage.',
      fixedCharges: 'Customer Charge: $10.00/month.',
    },
    eligibility: [
      'Small commercial service',
      'Peak demand typically under 20 kW',
      'No demand metering required',
    ],
  },
  'pge-a-6': {
    rateCode: 'A-6',
    utility: 'PG&E',
    title: 'A-6 Small General Time-of-Use Service',
    overview: 'A-6 provides time-of-use pricing for small commercial customers without demand charges. Allows customers to save by shifting usage to off-peak hours.',
    howItWorks: [
      'Time-of-use pricing structure',
      'Peak hours: 3:00 PM to 8:00 PM weekdays',
      'Off-peak hours: All other times',
      'No demand charges',
      'Lower fixed charges than demand-metered rates',
    ],
    keyFeatures: [
      'TOU pricing without demand charges',
      'Opportunity to save by shifting usage',
      'Lower fixed charges than B-19',
      'Simple structure compared to demand-metered rates',
    ],
    bestFor: [
      'Small commercial customers who can shift usage',
      'Businesses with peak demand under 20 kW',
      'Facilities that can operate during off-peak hours',
    ],
    importantNotes: [
      'Can save money by shifting usage to off-peak hours',
      'Peak rates are significantly higher than off-peak',
      'Consider if you can shift 20%+ of usage to off-peak',
      'Effective January 1, 2025',
    ],
    billingDetails: {
      demandCharges: 'No demand charges for A-6 customers.',
      energyCharges: 'Summer: Peak $0.22/kWh (3-8 PM weekdays), Off-Peak $0.15/kWh (all other times). Winter: Peak $0.20/kWh, Off-Peak $0.14/kWh.',
      fixedCharges: 'Customer Charge: $10.00/month.',
    },
    eligibility: [
      'Small commercial service',
      'Peak demand typically under 20 kW',
      'Time-of-use metering required',
    ],
  },
  'pge-a-10': {
    rateCode: 'A-10',
    utility: 'PG&E',
    title: 'A-10 Medium General Demand-Metered Service',
    overview: 'A-10 is designed for medium commercial customers with demand metering. Similar structure to B-19 but for customers in the 75-500 kW range.',
    howItWorks: [
      'Time-of-use pricing with demand charges',
      'Peak hours: 3:00 PM to 8:00 PM weekdays',
      'Demand charges based on maximum 15-minute demand',
      'Seasonal rate variations',
      'Similar to B-19 but for smaller customers',
    ],
    keyFeatures: [
      'TOU pricing structure',
      'Demand charges apply',
      'Seasonal rate variations',
      '15-minute demand averaging',
    ],
    bestFor: [
      'Medium commercial facilities (75-500 kW peak demand)',
      'Businesses with predictable load patterns',
      'Customers who can shift usage to off-peak hours',
    ],
    importantNotes: [
      'Demand charges can represent significant portion of bill',
      'Peak shaving strategies can reduce costs',
      'Consider battery storage for demand management',
      'Effective January 1, 2025',
    ],
    billingDetails: {
      demandCharges: 'Maximum Demand: $18.00/kW (both seasons).',
      energyCharges: 'Summer: On-Peak $0.25755/kWh (3-8 PM weekdays), Partial-Peak $0.22/kWh, Off-Peak $0.16/kWh. Winter: On-Peak $0.25/kWh, Off-Peak $0.16/kWh.',
      fixedCharges: 'Customer Charge: $314.29/month (secondary service).',
    },
    eligibility: [
      'Medium commercial service',
      'Peak demand between 75 kW and 500 kW',
      'Demand metering required',
    ],
  },
  'pge-e-1': {
    rateCode: 'E-1',
    utility: 'PG&E',
    title: 'E-1 Residential Service',
    overview: 'E-1 is the standard residential rate with tiered pricing. Baseline allowance provides lower rates for essential usage, with higher rates for usage above baseline.',
    howItWorks: [
      'Tiered pricing structure',
      'Baseline allowance (varies by climate zone)',
      'Lower rates for usage within baseline',
      'Higher rates for usage above baseline',
      'Encourages energy conservation',
    ],
    keyFeatures: [
      'Tiered pricing structure',
      'Baseline allowance',
      'Simple billing structure',
      'No time-of-use periods',
    ],
    bestFor: [
      'Residential customers',
      'Customers with consistent usage patterns',
      'Those who prefer simple billing',
    ],
    importantNotes: [
      'Baseline allowance varies by climate zone',
      'Usage above baseline is charged at higher rates',
      'Consider E-TOU rates if you can shift usage',
      'Effective January 1, 2025',
    ],
    billingDetails: {
      demandCharges: 'No demand charges for residential customers.',
      energyCharges: 'Baseline: $0.28/kWh (first 300 kWh/month). Tier 1: $0.35/kWh (300-400 kWh). Tier 2: $0.42/kWh (over 400 kWh).',
      fixedCharges: 'Customer Charge: $10.00/month.',
    },
    eligibility: [
      'Residential service only',
      'Single-family or multi-family residential',
    ],
  },
  'pge-e-tou-c': {
    rateCode: 'E-TOU-C',
    utility: 'PG&E',
    title: 'E-TOU-C Residential Time-of-Use (Peak 4-9 PM Daily)',
    overview: 'E-TOU-C is a residential time-of-use rate with peak pricing from 4:00 PM to 9:00 PM every day. This rate can save money for customers who can shift usage away from peak hours.',
    howItWorks: [
      'Time-of-use pricing structure',
      'Peak hours: 4:00 PM to 9:00 PM every day',
      'Off-peak hours: All other times',
      'Peak rates are significantly higher',
      'Same peak hours year-round',
    ],
    keyFeatures: [
      'TOU pricing with daily peak period',
      'Peak hours same every day (4-9 PM)',
      'Opportunity to save by shifting usage',
      'Higher peak rates encourage conservation',
    ],
    bestFor: [
      'Residential customers who can shift usage',
      'Customers with electric vehicles (charge off-peak)',
      'Homes with battery storage',
      'Customers who are away during peak hours',
    ],
    importantNotes: [
      'Peak rates are approximately 45% higher than off-peak',
      'Can save significantly by shifting 20-30% of usage',
      'Electric vehicle charging during off-peak can maximize savings',
      'Effective March 1, 2025',
    ],
    billingDetails: {
      demandCharges: 'No demand charges for residential customers.',
      energyCharges: 'Peak: $0.43438/kWh (4-9 PM daily). Off-Peak: $0.30/kWh (all other times).',
      fixedCharges: 'Customer Charge: $10.00/month.',
    },
    eligibility: [
      'Residential service only',
      'Time-of-use metering required',
    ],
  },
  'pge-e-tou-d': {
    rateCode: 'E-TOU-D',
    utility: 'PG&E',
    title: 'E-TOU-D Residential Time-of-Use (Peak 5-8 PM Weekdays)',
    overview: 'E-TOU-D is a residential time-of-use rate with peak pricing from 5:00 PM to 8:00 PM on weekdays only. Weekends and holidays are always off-peak.',
    howItWorks: [
      'Time-of-use pricing structure',
      'Peak hours: 5:00 PM to 8:00 PM weekdays only',
      'Off-peak hours: All other times (including all weekends)',
      'Peak rates apply only on weekdays',
      'More flexible than E-TOU-C',
    ],
    keyFeatures: [
      'TOU pricing with weekday-only peak',
      'Weekends always off-peak',
      'Shorter peak window than E-TOU-C',
      'More flexibility for customers',
    ],
    bestFor: [
      'Residential customers who use more on weekends',
      'Customers who can shift weekday evening usage',
      'Homes with weekend-heavy usage patterns',
    ],
    importantNotes: [
      'Peak rates only apply on weekdays',
      'Weekends and holidays are always off-peak',
      'Shorter peak window (3 hours vs 5 hours)',
      'Effective January 1, 2025',
    ],
    billingDetails: {
      demandCharges: 'No demand charges for residential customers.',
      energyCharges: 'Peak: $0.40/kWh (5-8 PM weekdays). Off-Peak: $0.28/kWh (all other times, including all weekends).',
      fixedCharges: 'Customer Charge: $10.00/month.',
    },
    eligibility: [
      'Residential service only',
      'Time-of-use metering required',
    ],
  },
  'pge-g-1': {
    rateCode: 'G-1',
    utility: 'PG&E',
    title: 'G-1 Residential Gas Service',
    overview: 'G-1 is the standard residential natural gas service with tiered pricing and baseline allowance. Lower rates apply to usage within the baseline allowance.',
    howItWorks: [
      'Tiered pricing structure',
      'Baseline allowance (varies by climate zone)',
      'Lower rates for usage within baseline',
      'Higher rates for usage above baseline',
      'Encourages energy conservation',
    ],
    keyFeatures: [
      'Tiered pricing structure',
      'Baseline allowance (typically 25 therms/month)',
      'Simple billing structure',
      'No time-of-use periods',
    ],
    bestFor: [
      'Residential gas customers',
      'Customers with moderate gas usage',
      'Those who prefer simple billing',
    ],
    importantNotes: [
      'Baseline allowance varies by climate zone',
      'Usage above baseline is charged at higher rates',
      'Effective January 1, 2025',
      'Gas rates are typically more stable than electric rates',
    ],
    billingDetails: {
      demandCharges: 'No demand charges for residential gas service.',
      energyCharges: 'Baseline: $1.35/therm (first 25 therms/month). Tier 1: $1.65/therm (25-50 therms). Tier 2: $2.05/therm (over 50 therms).',
      fixedCharges: 'Customer Charge: $10.00/month.',
    },
    eligibility: [
      'Residential gas service only',
      'Single-family or multi-family residential',
    ],
  },
  'pge-g-nr1': {
    rateCode: 'G-NR1',
    utility: 'PG&E',
    title: 'G-NR1 Small Commercial Gas Service',
    overview: 'G-NR1 is a simple rate schedule for small commercial natural gas customers. Flat rate structure without tiers.',
    howItWorks: [
      'Simple flat rate structure',
      'Single rate applies to all usage',
      'No tiered pricing',
      'Easy to understand and budget',
    ],
    keyFeatures: [
      'Simple rate structure',
      'Flat rate per therm',
      'No tiered pricing',
      'Lower fixed charges than large commercial',
    ],
    bestFor: [
      'Small commercial gas customers',
      'Businesses with moderate, consistent usage',
      'Customers who prefer simple billing',
    ],
    importantNotes: [
      'Flat rate structure - no volume discounts',
      'Consider G-NR2 or G-20 for high-volume users',
      'Effective January 1, 2025',
    ],
    billingDetails: {
      demandCharges: 'No demand charges for gas service.',
      energyCharges: 'Flat rate: $1.45/therm for all usage.',
      fixedCharges: 'Customer Charge: $25.00/month.',
    },
    eligibility: [
      'Small commercial gas service',
      'Moderate gas usage',
    ],
  },
  'pge-g-nr2': {
    rateCode: 'G-NR2',
    utility: 'PG&E',
    title: 'G-NR2 Large Commercial Gas Service',
    overview: 'G-NR2 is designed for large commercial and industrial natural gas customers. Volume discounts may apply for very high usage.',
    howItWorks: [
      'Blended rate structure',
      'Base rate applies to all usage',
      'Volume discounts may be available',
      'Lower per-therm rate than small commercial',
    ],
    keyFeatures: [
      'Blended rate structure',
      'Lower per-therm rate than G-NR1',
      'Volume discounts available',
      'Designed for high-volume users',
    ],
    bestFor: [
      'Large commercial gas customers',
      'Industrial facilities with high gas usage',
      'Customers with consistent high-volume usage',
    ],
    importantNotes: [
      'Lower per-therm rate than small commercial',
      'Volume discounts may apply for very high usage',
      'Contact PG&E for specific volume pricing',
      'Effective January 1, 2025',
    ],
    billingDetails: {
      demandCharges: 'No demand charges for gas service.',
      energyCharges: 'Base rate: $1.30/therm. Volume discounts may apply for usage over certain thresholds.',
      fixedCharges: 'Customer Charge: $50.00/month.',
    },
    eligibility: [
      'Large commercial or industrial gas service',
      'High-volume gas usage',
    ],
  },
  'pge-g-10': {
    rateCode: 'G-10',
    utility: 'PG&E',
    title: 'G-10 Medium Commercial Gas Service',
    overview: 'G-10 is designed for medium commercial natural gas customers. Balanced rate structure between small and large commercial.',
    howItWorks: [
      'Blended rate structure',
      'Single rate applies to all usage',
      'Moderate fixed charges',
      'Balanced pricing structure',
    ],
    keyFeatures: [
      'Blended rate structure',
      'Moderate per-therm rate',
      'Balanced for medium-volume users',
    ],
    bestFor: [
      'Medium commercial gas customers',
      'Businesses with moderate to high gas usage',
    ],
    importantNotes: [
      'Effective January 1, 2025',
      'Consider G-20 for very high-volume usage',
    ],
    billingDetails: {
      demandCharges: 'No demand charges for gas service.',
      energyCharges: 'Flat rate: $1.40/therm for all usage.',
      fixedCharges: 'Customer Charge: $35.00/month.',
    },
    eligibility: [
      'Medium commercial gas service',
      'Moderate to high gas usage',
    ],
  },
  'pge-g-20': {
    rateCode: 'G-20',
    utility: 'PG&E',
    title: 'G-20 Large Commercial Gas Service',
    overview: 'G-20 is designed for large commercial and industrial natural gas customers with tiered volume pricing. Lower rates apply to higher usage volumes.',
    howItWorks: [
      'Tiered volume pricing structure',
      'Lower rates for higher usage volumes',
      'First 10,000 therms at base rate',
      'Volume discounts for usage over 10,000 therms',
      'Designed to reward high-volume users',
    ],
    keyFeatures: [
      'Tiered volume pricing',
      'Volume discounts for high usage',
      'Lower per-therm rate at higher volumes',
      'Designed for industrial customers',
    ],
    bestFor: [
      'Large commercial gas customers',
      'Industrial facilities',
      'Customers with very high gas usage (10,000+ therms/month)',
    ],
    importantNotes: [
      'Volume discounts apply to usage over 10,000 therms',
      'Best for customers with consistent high-volume usage',
      'Effective January 1, 2025',
    ],
    billingDetails: {
      demandCharges: 'No demand charges for gas service.',
      energyCharges: 'First 10,000 therms: $1.35/therm. Next 40,000 therms: $1.25/therm. Over 50,000 therms: $1.15/therm.',
      fixedCharges: 'Customer Charge: $75.00/month.',
    },
    eligibility: [
      'Large commercial or industrial gas service',
      'Very high-volume gas usage (typically 10,000+ therms/month)',
    ],
  },
};

/**
 * Get explanation for a rate
 */
export function getRateExplanation(rateId: string): RateExplanation | undefined {
  return rateExplanations[rateId];
}

/**
 * Get explanation by rate code and utility
 */
export function getRateExplanationByCode(utility: string, rateCode: string): RateExplanation | undefined {
  const key = Object.keys(rateExplanations).find(
    k => rateExplanations[k].utility === utility && rateExplanations[k].rateCode === rateCode
  );
  return key ? rateExplanations[key] : undefined;
}
