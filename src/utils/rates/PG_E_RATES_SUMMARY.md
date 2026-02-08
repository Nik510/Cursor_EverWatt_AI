# PG&E Rate Library - Complete Summary

## Overview

This document lists all PG&E (Pacific Gas and Electric) rates included in the rate management system, updated to 2025 effective dates.

## Electric Rates

### Commercial/Industrial Electric Rates

#### Active Rates (Available to New Customers)

1. **A-1** - Small General Service
   - Type: Blended
   - Customer Class: Small C&I
   - Demand Range: Under 20 kW
   - Description: Simple rate structure without demand metering
   - Effective: January 1, 2025

2. **A-6** - Small General Time-of-Use Service
   - Type: TOU
   - Customer Class: Small C&I
   - Demand Range: Under 20 kW
   - Description: TOU pricing for small commercial without demand charges
   - Effective: January 1, 2025

3. **A-10** - Medium General Demand-Metered Service
   - Type: TOU
   - Customer Class: Medium C&I
   - Demand Range: 75-500 kW
   - Description: Medium commercial with demand metering
   - Effective: January 1, 2025

4. **B-10** - Commercial Only Service
   - Type: Blended
   - Customer Class: Small C&I
   - Description: Simple commercial rate, no TOU or demand charges
   - Effective: September 1, 2025

5. **B-19** - Medium General Demand-Metered TOU
   - Type: TOU
   - Customer Class: Medium C&I
   - Demand Range: 20-999 kW
   - Description: Medium C&I with multi-part demand charges
   - S-Rate Eligible: Yes
   - Effective: January 1, 2025

6. **B-20** - Large General Demand-Metered TOU
   - Type: TOU
   - Customer Class: Large C&I
   - Demand Range: 1,000+ kW
   - Description: Large C&I, legacy rate grandfathered for solar customers
   - S-Rate Eligible: Yes
   - Effective: January 1, 2025

7. **E-10** - Large General Service
   - Type: TOU
   - Customer Class: Large C&I
   - Demand Range: 1,000+ kW
   - Description: Large commercial/industrial service
   - Effective: January 1, 2025

#### Legacy Rates (Grandfathered Only)

8. **E-19** - Medium General Service TOU (Legacy)
   - Type: TOU
   - Customer Class: Medium C&I
   - Demand Range: 20-999 kW
   - Status: Being phased out
   - Description: Legacy rate being replaced by B-19
   - Effective: January 1, 2025

9. **E-20** - Large General Service TOU (Legacy)
   - Type: TOU
   - Customer Class: Large C&I
   - Demand Range: 1,000+ kW
   - Status: Being phased out
   - Description: Legacy rate being replaced by B-20
   - Effective: January 1, 2025

### Residential Electric Rates

10. **E-1** - Residential Service
    - Type: Tiered
    - Customer Class: Residential
    - Description: Standard residential with tiered pricing and baseline allowance
    - Effective: January 1, 2025

11. **E-6** - Residential Time-of-Use Service
    - Type: TOU
    - Customer Class: Residential
    - Description: Alternative residential TOU plan
    - Effective: January 1, 2025

12. **E-TOU-C** - Residential Time-of-Use (Peak 4-9 PM Daily)
    - Type: TOU
    - Customer Class: Residential
    - Description: Residential TOU with peak pricing 4-9 PM every day
    - Effective: March 1, 2025

13. **E-TOU-D** - Residential Time-of-Use (Peak 5-8 PM Weekdays)
    - Type: TOU
    - Customer Class: Residential
    - Description: Residential TOU with peak pricing 5-8 PM weekdays only
    - Effective: January 1, 2025

## Gas Rates

### Residential Gas Rates

14. **G-1** - Residential Gas Service
    - Type: Tiered
    - Customer Class: Residential
    - Description: Standard residential natural gas with tiered pricing and baseline allowance
    - Effective: January 1, 2025

### Commercial/Industrial Gas Rates

15. **G-NR1** - Small Commercial Gas Service
    - Type: Blended
    - Customer Class: Small C&I
    - Description: Small commercial natural gas service
    - Effective: January 1, 2025

16. **G-10** - Medium Commercial Gas Service
    - Type: Blended
    - Customer Class: Medium C&I
    - Description: Medium commercial natural gas service
    - Effective: January 1, 2025

17. **G-NR2** - Large Commercial Gas Service
    - Type: Blended
    - Customer Class: Large C&I
    - Description: Large commercial and industrial natural gas service
    - Effective: January 1, 2025

18. **G-20** - Large Commercial Gas Service (Volume Pricing)
    - Type: Tiered
    - Customer Class: Large C&I
    - Description: Large commercial/industrial with tiered volume pricing
    - Effective: January 1, 2025

## Rate Statistics

- **Total PG&E Rates**: 18
- **Electric Rates**: 13 (9 Commercial/Industrial, 4 Residential)
- **Gas Rates**: 5 (1 Residential, 4 Commercial/Industrial)
- **Active Rates**: 15
- **Legacy Rates**: 2 (E-19, E-20)
- **S-Rate Eligible**: 2 (B-19, B-20)

## Rate Organization

Rates are organized in the following files:

1. **`pge-rates-comprehensive.ts`** - All PG&E rates (electric and gas)
2. **`rate-data.ts`** - Other utility rates (SCE, SDG&E) and imports PG&E rates
3. **`rate-explanations.ts`** - Detailed explanations for each rate

## 2025 Rate Updates

All rates have been updated to reflect 2025 effective dates:

- **Peak Hours**: Updated to 3:00 PM - 8:00 PM (from 4:00 PM - 9:00 PM)
- **Summer Season**: June through September (4 months)
- **Demand Charges**: Updated to $19.20/kW maximum, $19.17/kW on-peak (summer)
- **Energy Rates**: Updated across all TOU periods
- **Fixed Charges**: Updated customer charges and meter charges

## Notes

- Rates are stored in the rate management system (not hard-coded in components)
- All rates are accessible programmatically via `getAllRates()`, `getRatesByUtility()`, etc.
- Each rate has a detailed explanation accessible via the UI
- Rates can be filtered by utility, service type (Electric/Gas), rate type, and customer class
- All rates include complete TOU periods, demand charges, fixed charges, and eligibility requirements

## Missing Rates (To Be Added)

The following PG&E rates may need to be added in the future:

- **Agricultural Rates**: AG-1, AG-2, AG-3
- **Special Purpose Rates**: Various specialized rates for specific industries
- **EV Charging Rates**: BEV (Business Electric Vehicle) rates
- **Peak Day Pricing**: PDP rates
- **Additional Gas Rates**: G-2, G-3, G-30, G-NT (transportation-only)

These can be added as needed by following the same structure in `pge-rates-comprehensive.ts`.
