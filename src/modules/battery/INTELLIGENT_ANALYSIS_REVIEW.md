# Intelligent Peak Analysis System - Review Document

## Overview

The enhanced analysis system now thinks **holistically** about battery shaving scenarios, automatically identifying baseline operating patterns, detecting all spikes, and performing comprehensive cost-benefit analysis to determine which scenarios make economic sense.

## Key Enhancements

### 1. **Baseline Analysis** (`analyzeBaseline`)

**What it does:**
- Automatically identifies the **typical operating level** (not just mean, but actual most common operating level)
- Uses statistical binning to find the mode (most frequent operating level)
- Falls back to median if no clear mode exists
- Calculates baseline threshold for spike detection

**Example:**
- If facility typically operates at 120 kW for 60% of the time
- System identifies 120 kW as typical operating level
- Baseline threshold set to ~130 kW (120 + 10% buffer)
- Any demand above 130 kW is considered a spike

**Output:**
```typescript
{
  typicalOperatingKw: 120,      // Most common operating level
  baselineKw: 130,              // Threshold for spike detection
  meanKw: 135,                  // Statistical mean
  medianKw: 122,                // Statistical median
  stdDevKw: 45,                 // Standard deviation
  baselinePercentage: 60,       // % of time at baseline
  reasoning: [...]               // Explanation of calculations
}
```

### 2. **Intelligent Spike Detection** (`detectAllSpikes`)

**What it does:**
- Detects **all significant spikes** relative to baseline (not just one threshold)
- Identifies spike start/end times, duration, peak magnitude
- Calculates excess energy above baseline
- Sorts spikes by severity

**Key Features:**
- Uses baseline analysis (not just mean + std dev)
- Detects spikes that are 20%+ above typical operating level
- Minimum 15-minute duration
- Tracks multiple spikes throughout the day

**Example Output:**
```typescript
[
  {
    start: Date('2024-01-15T10:00:00'),
    end: Date('2024-01-15T14:00:00'),
    peakKw: 230,                // Peak during this spike
    avgKw: 210,                 // Average during spike
    durationHours: 4.0,         // 4-hour spike
    excessEnergyKwh: 320,       // Total excess energy
    baselineKw: 130,            // Baseline used
    severity: 2.4               // 2.4 std devs above baseline
  },
  {
    start: Date('2024-01-15T18:45:00'),
    end: Date('2024-01-15T19:30:00'),
    peakKw: 180,
    ...
  }
]
```

### 3. **Holistic Analysis** (`performHolisticAnalysis`)

**What it does:**
- **Main entry point** - performs complete analysis
- Combines baseline analysis + spike detection + scenario generation + economic analysis
- Generates scenarios based on **actual detected spikes** (not arbitrary caps)
- Tests all batteries in catalog for each scenario
- Performs full financial analysis (payback, ROI, NPV)
- Categorizes scenarios by economic viability

**Workflow:**
1. Analyze baseline operating level
2. Detect all spikes relative to baseline
3. Generate scenarios: one for each major spike + baseline scenario
4. For each scenario, test all batteries
5. Calculate financial metrics for each battery
6. Score economic viability (0-100)
7. Categorize: recommended / marginal / not recommended

**Output Structure:**
```typescript
{
  baseline: BaselineAnalysis,
  spikes: DetectedSpike[],
  scenarios: ShavingScenario[],
  recommendations: {
    bestScenario: ShavingScenario,      // Best overall
    viableScenarios: ShavingScenario[],  // Payback ≤ 7 years
    marginalScenarios: ShavingScenario[], // Payback 7-12 years
    notRecommended: ShavingScenario[],   // Payback > 12 years or infeasible
    summary: string[]                    // Human-readable summary
  }
}
```

### 4. **Economic Analysis** (Integrated)

**Financial Metrics Calculated:**
- **Annual Savings**: Based on demand reduction × demand rate
- **Payback Period**: Simple payback (years to recover investment)
- **ROI**: Return on investment percentage
- **NPV**: Net Present Value (accounts for time value of money)
- **Viability Score**: 0-100 composite score

**Viability Scoring:**
- Payback ≤ 5 years: +40 points
- Payback ≤ 10 years: +30 points
- ROI > 200%: +30 points
- NPV > system cost: +30 points
- **Total: 0-100 score**

**Recommendation Logic:**
- **Recommended**: Payback ≤ 7 years AND NPV > 0
- **Marginal**: Payback 7-12 years
- **Not Recommended**: Payback > 12 years OR infeasible

### 5. **Scenario Generation** (`generateSpikeBasedScenarios`)

**What it does:**
- Creates scenarios based on **actual detected spikes** (not arbitrary)
- Scenario 1: Shave to baseline (most aggressive)
- Scenario 2-N: Shave each major spike to baseline + 20%

**Example:**
- Baseline: 120 kW
- Spike 1: 230 kW (10:00-14:00)
- Spike 2: 180 kW (18:45-19:30)

**Scenarios Generated:**
1. Target: 120 kW (shave all spikes to baseline)
2. Target: 144 kW (shave spike 1 to baseline + 20%)
3. Target: 144 kW (shave spike 2 to baseline + 20%)

### 6. **Battery Requirements Calculator** (`calculateBatteryRequirements`)

**What it does:**
- Calculates minimum power and capacity needed for a shaving target
- Analyzes worst-case spike
- Accounts for multiple spikes per day
- Provides reasoning for requirements

**Output:**
```typescript
{
  minPowerKw: 110,              // Minimum power needed
  minCapacityKwh: 400,          // Minimum capacity needed
  worstCaseSpike: DetectedSpike,
  reasoning: [
    "Worst spike: 230.0 kW at 2024-01-15T10:00:00",
    "Shaving required: 100.0 kW",
    "Minimum power needed: 110 kW",
    "Worst-case energy: 320.0 kWh per spike",
    "Max spikes per day: 2",
    "Minimum capacity needed: 400 kWh"
  ]
}
```

## Usage Example

```typescript
import { performHolisticAnalysis } from './intelligent-peak-analysis';

const analysis = performHolisticAnalysis(loadProfile, {
  demandRate: 20,  // $/kW-month
  financialParams: {
    discountRate: 0.06,
    inflationRate: 0.02,
    projectLifetime: 15,
  },
  maxPaybackYears: 10,
});

// Access results
console.log('Baseline:', analysis.baseline.typicalOperatingKw, 'kW');
console.log('Spikes detected:', analysis.spikes.length);
console.log('Best scenario:', analysis.recommendations.bestScenario);
console.log('Summary:', analysis.recommendations.summary);
```

## Key Improvements Over Previous System

1. **Automatic Baseline Detection**: No manual threshold needed
2. **Spike-Based Scenarios**: Scenarios based on actual load patterns, not arbitrary caps
3. **Full Economic Analysis**: Payback, ROI, NPV, not just "can we do it"
4. **Intelligent Recommendations**: System determines if scenario makes economic sense
5. **Holistic Thinking**: Considers cost vs benefit, not just technical feasibility
6. **Multiple Spike Handling**: Analyzes all spikes throughout the day, not just one peak

## Next Steps

1. **UI Integration**: Display baseline analysis, detected spikes, and scenario recommendations
2. **Visualization**: Show baseline line on charts, highlight detected spikes
3. **Interactive Scenario Selection**: Let user explore different scenarios
4. **Export Reports**: Generate PDF reports with recommendations

## Questions for Review

1. **Baseline Detection**: Is the binning approach (5 kW bins) appropriate, or should we use a different method?
2. **Spike Threshold**: Is 20% above baseline the right threshold, or should it be configurable?
3. **Economic Criteria**: Are the payback thresholds (7/12 years) appropriate for your market?
4. **Viability Scoring**: Should we weight different factors differently?
5. **Scenario Generation**: Should we generate more scenarios (e.g., every 10 kW increment)?

