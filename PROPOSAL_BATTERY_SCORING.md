# Battery Recommendation Scoring System - Proposal

## Current Issues
- Complex weighted scoring doesn't prioritize what matters most
- Not considering S-rate eligibility benefits
- Not accounting for threshold-based benefits (X factor)
- Need clearer focus on value per dollar spent

## Proposed New Scoring System

### Primary Metric: Peak Savings per Dollar
**Formula:** `Peak Reduction (kW) / System Cost ($)`
- Higher is better
- This directly measures "bang for buck" in peak reduction

### Secondary Metrics (for tie-breaking and validation):
1. **Payback Period** - Lower is better (shorter payback = faster return)
2. **S-Rate Eligibility Value** - Additional annual savings if batteries enable S-rate qualification
3. **Threshold Benefit (X Factor)** - Additional value if demand stays below a critical threshold

## Questions for Clarification

### 1. Threshold-Based Benefits (X Factor)
- **What is the threshold?** Is it:
  - A specific kW level (e.g., "if demand stays below 500 kW")?
  - A percentage of original peak (e.g., "if demand stays below 80% of original peak")?
  - A utility-defined threshold (e.g., "if demand stays below 1 MW, qualify for different rate")?
  
- **What are the benefits?** Is it:
  - Lower demand charge rate?
  - Avoidance of demand response penalties?
  - Qualification for a different rate schedule?
  - Other financial benefits?

### 2. S-Rate Eligibility
- **How should we value S-rate?** Should we:
  - Calculate estimated S-rate savings vs current rate and add to annual savings?
  - Only consider S-rate if peak shaving alone doesn't justify the batteries?
  - Show S-rate as a separate "bonus" benefit?
  
- **What if customer is already on S-rate?** Should we:
  - Still show S-rate optimization potential?
  - Focus only on peak shaving benefits?

### 3. Display Options
- **How many options to show?**
  - Option A: Show 2-3 tiered options (e.g., "Best Value", "Best Peak Reduction", "S-Rate Optimized")
  - Option B: Show single best recommendation with alternatives listed below
  - Option C: Show all viable options ranked by peak savings per dollar

### 4. Scoring Priority
**Proposed ranking:**
1. **Peak Savings per Dollar** (primary) - `kW reduced / $ cost`
2. **Payback Period** (secondary) - Lower is better
3. **S-Rate Value** (bonus) - Additional annual savings from S-rate
4. **Threshold Benefit** (bonus) - Additional value from staying below threshold

## Proposed Implementation

### New Scoring Function
```typescript
function scoreBatteryOption(
  peakReductionKw: number,
  systemCost: number,
  paybackYears: number,
  sRateValue?: number,  // Annual savings from S-rate eligibility
  thresholdValue?: number  // Annual value from threshold benefit
): {
  primaryScore: number;  // Peak savings per dollar
  paybackScore: number;  // Normalized payback (lower = better)
  totalAnnualValue: number;  // Peak savings + S-rate + threshold
  overallScore: number;  // Combined score for ranking
}
```

### Display Format
Show 2-3 options with clear labels:
- **"Best Value"** - Highest peak savings per dollar
- **"S-Rate Optimized"** - Best option if S-rate eligibility is valuable
- **"Maximum Reduction"** - Highest peak reduction (if different from best value)

Each option shows:
- Peak reduction (kW)
- System cost ($)
- Peak savings per dollar (kW/$)
- Payback period
- S-rate value (if applicable)
- Threshold benefit (if applicable)
- Total annual value

## Next Steps
Please provide answers to the questions above so I can implement the exact logic you need.

