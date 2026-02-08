# Utility Rate Management System

A comprehensive system for storing, managing, and calculating utility rates for energy analysis.

## Features

- **Multiple Rate Types**: Supports TOU, Tiered, Demand, Blended, Real-Time, and Critical Peak rates
- **Pre-populated Data**: Includes common rates for PG&E, SCE, SDG&E
- **2025 Rates**: All rates updated to 2025 effective dates
- **Rate Calculations**: Calculate monthly and annual costs from interval data
- **Rate Storage**: In-memory storage with search and filtering
- **Rate Lookup**: Find best matching rates for customer profiles
- **Detailed Explanations**: Click any rate to see comprehensive explanation of how it works

## Rate Organization

### PG&E Rates (2025)

**Active Rates:**
- **B-19**: Medium General Demand-Metered TOU (20-999 kW)
- **B-20**: Large General Demand-Metered TOU (1,000+ kW)
- **B-10**: Commercial Only Service (simple rate, no TOU)

**Legacy Rates (Grandfathered Only):**
- **E-19**: Medium General Service TOU (being phased out)
- **E-20**: Large General Service TOU (being phased out)

### Rate Data Structure

All rates are organized with:
- Complete TOU period definitions (On-Peak, Partial-Peak, Off-Peak)
- Seasonal variations (Summer: June-September, Winter: October-May)
- Day type variations (Weekday, Weekend, Holiday)
- Multiple demand charge components
- Fixed charges (Customer Charge, Meter Charges)
- Effective dates and eligibility requirements

## Usage

### Basic Usage

```typescript
import { 
  getRateById, 
  calculateMonthlyCost, 
  calculateAnnualCost,
  findBestRate,
  getEffectiveDemandRate 
} from '../utils/rates';

// Get a rate
const rate = getRateById('pge-b-19');

// Calculate monthly cost from interval data
const monthlyCost = calculateMonthlyCost(rate, intervalData, 6, 2025);

// Calculate annual cost
const annualCost = calculateAnnualCost(rate, intervalData);

// Find best rate for a customer
const bestRate = findBestRate('PG&E', 500, 'Medium C&I', true);

// Get demand rate for existing code
const demandRate = getEffectiveDemandRate(rate); // Returns $/kW/month
```

### Rate Explanations

Each rate has a detailed explanation accessible via the UI or programmatically:

```typescript
import { getRateExplanation } from '../utils/rates/rate-explanations';

const explanation = getRateExplanation('pge-b-19');
// Returns comprehensive explanation including:
// - Overview
// - How it works
// - Key features
// - Best for
// - Billing details
// - Important notes
// - Examples
```

## 2025 Rate Updates

All rates have been updated to reflect 2025 effective dates:

- **B-19/B-20**: Effective January 1, 2025
- **B-10**: Updated September 1, 2025
- **E-19/E-20**: Legacy rates, effective January 1, 2025 (grandfathered only)

### Key 2025 Changes

- Peak hours: 3:00 PM to 8:00 PM (updated from 4:00 PM to 9:00 PM)
- Summer season: June through September (4 months)
- Demand charges: Updated to $19.20/kW maximum, $19.17/kW on-peak (summer)
- Energy rates: Updated across all TOU periods
- Fixed charges: Customer Charge $3,872.60/month, TOU Meter Charge $342.20/month

## Rate Storage

Rates are stored in-memory and can be accessed via:

```typescript
import { getAllRates, getRatesByUtility, searchRates } from '../utils/rates';

// Get all rates
const allRates = getAllRates();

// Get rates by utility
const pgeRates = getRatesByUtility('PG&E');

// Search rates
const results = searchRates({
  utility: 'PG&E',
  rateType: 'TOU',
  isActive: true,
  minDemand: 20,
  maxDemand: 999,
});
```

## Adding New Rates

```typescript
import { storeRate } from '../utils/rates';

const newRate: TOURate = {
  id: 'pge-custom-rate',
  utility: 'PG&E',
  rateCode: 'CUSTOM',
  rateName: 'Custom Rate',
  rateType: 'TOU',
  isActive: true,
  effectiveDate: '2025-01-01',
  // ... rate configuration
};

storeRate(newRate);
```

## Rate Calculations

### Monthly Cost Calculation
```typescript
const result = calculateMonthlyCost(rate, intervalData, 6, 2025);
// Returns:
// {
//   totalCost: 12500.50,
//   energyCost: 8500.00,
//   demandCost: 3500.00,
//   fixedCharges: 500.50,
//   breakdown: [...],
//   month: 6,
//   year: 2025,
// }
```

### Annual Cost Calculation
```typescript
const annual = calculateAnnualCost(rate, intervalData);
// Returns complete annual breakdown with monthly details
```

### Peak Shaving Savings
```typescript
const savings = calculatePeakShavingSavings(
  rate,
  originalPeakKw: 1000,
  newPeakKw: 800,
  months: 12
);
// Returns annual savings from demand reduction
```

## Integration with UI

The rate system is fully integrated with the Utilities and Programs page:

1. **Browse Rates**: View all rates with filtering and search
2. **Click for Details**: Click any rate card to see detailed explanation
3. **Rate Explanations**: Comprehensive modal showing how each rate works
4. **Dynamic Data**: All data pulled from storage system (not hard-coded)

## Data Organization

Rates are organized for easy discovery:

- **By Utility**: PG&E, SCE, SDG&E
- **By Status**: Active vs Legacy
- **By Type**: TOU, Tiered, Demand, Blended
- **By Customer Class**: Small C&I, Medium C&I, Large C&I
- **By Demand Range**: Minimum and maximum demand requirements

## Notes

- Rates are stored in-memory by default (can be extended to use database/API)
- Default rates are automatically loaded on import
- All calculations assume 15-minute interval data
- Season definitions: Summer (Jun-Sep), Winter (Oct-May)
- Day types: Weekday, Weekend, Holiday
- All rates updated to 2025 effective dates
