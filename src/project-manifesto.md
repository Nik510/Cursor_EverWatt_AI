# EverWatt.AI - Engineering Physics Manifesto

> **⚠️ IMPORTANT**: This technical manifesto aligns with the [Core Vision & Guiding Compass](../EVERWATT_AI_CORE_VISION.md). All engineering decisions must support vendor-agnostic optimization, provable results, and scalable expertise.

## Project Overview

EverWatt.AI is a high-performance computational engine for energy modeling and optimization, focusing on battery storage simulation (peak shaving, arbitrage), HVAC optimization, and multi-technology analysis. All calculations are designed to support vendor-agnostic integration and provide M&V-grade proof of savings.

## Core Engineering Principles

### 1. Accuracy First
- **No Simplifications**: Complex physics equations are implemented fully
- **Realistic Modeling**: Accounts for degradation, efficiency losses, and real-world constraints
- **Validated Calculations**: All formulas must be traceable to engineering standards

### 2. Performance Requirements
- Handle 15-minute interval data for full year: **35,040 data points**
- Support multiple technology types simultaneously
- Real-time calculations without lag (< 1 second for full year analysis)

### 3. Modular Architecture (Domain-Driven Design)
- Each technology domain is self-contained
- Clear interfaces between modules
- Shared core utilities for common operations

---

## Battery Storage Module - Engineering Physics

### Peak Shaving Logic

#### Core Concept
Peak shaving reduces demand charges by discharging the battery when facility demand exceeds a threshold, effectively "shaving" the peak demand curve.

#### Mathematical Model

**State of Charge (SOC) Management:**
```
SOC(t) = E_stored(t) / E_usable(t)
```
Where:
- `E_stored(t)` = Energy stored at time t (kWh)
- `E_usable(t)` = Usable capacity accounting for DoD and degradation (kWh)

**Energy Balance:**
```
E_stored(t+1) = E_stored(t) - E_discharge(t) + (E_charge(t) × η_roundtrip)
```
Where:
- `E_discharge(t)` = Energy discharged in interval (kWh)
- `E_charge(t)` = Energy charged in interval (kWh)
- `η_roundtrip` = Round-trip efficiency (typically 0.85-0.95)

**Power Constraints:**
```
P_discharge ≤ min(P_battery, (SOC - SOC_min) × E_usable / Δt)
P_charge ≤ min(P_battery, (SOC_max - SOC) × E_usable / Δt)
```
Where:
- `P_battery` = Maximum charge/discharge power (kW)
- `Δt` = Time interval (0.25 hours for 15-min data)
- `SOC_min`, `SOC_max` = Operating limits (typically 0.10-0.90)

**Peak Shaving Dispatch Logic:**
```
IF demand(t) > threshold AND SOC(t) > SOC_min:
    P_discharge = min(
        P_battery,
        (SOC - SOC_min) × E_usable / Δt,
        demand(t) - threshold
    )
    demand_after(t) = demand(t) - P_discharge
```

#### Degradation Modeling

**Capacity Degradation Over Time:**
Battery capacity decreases due to:
1. **Calendar aging**: Time-based degradation
2. **Cycle aging**: Usage-based degradation (depth of discharge, charge/discharge rate)

**Degradation Curve:**
```
C(t) = C_0 × f_degradation(t, usage_factor)
```

Where `f_degradation` can be:
- **Linear**: `C(t) = C_0 × (1 - α × t)`
- **Exponential**: `C(t) = C_0 × exp(-β × t)`
- **Piecewise Linear**: Interpolated between known points (year 1, 5, 10, 20)

**Usage-Adjusted Degradation:**
```
adjusted_year = year × (0.5 + 0.5 × usage_factor)
```
Where `usage_factor` (0-1) accounts for:
- Depth of discharge frequency
- Charge/discharge rate
- Temperature effects (if available)

**Typical Degradation Curves:**
- **Li-ion (NMC)**: 2-3% year 1, 10-15% year 5, 20-30% year 10
- **LFP**: 1-2% year 1, 5-8% year 5, 15-20% year 10
- **Lead-acid**: 5-10% year 1, 20-30% year 5, 40-50% year 10

#### Round-Trip Efficiency

**Energy Losses:**
```
E_out = E_in × η_charge × η_discharge × η_inverter
```
Where:
- `η_charge` = Charging efficiency (typically 0.95-0.98)
- `η_discharge` = Discharging efficiency (typically 0.95-0.98)
- `η_inverter` = DC/AC conversion efficiency (typically 0.95-0.97)

**Typical Round-Trip Efficiencies:**
- Li-ion: 85-95%
- LFP: 90-95%
- Lead-acid: 70-85%

#### Capture Rate Calculation

**Capture Rate** = Energy actually discharged / Energy that could have been shaved
```
capture_rate = Σ E_discharged / Σ (demand_excess × Δt)
```
Where `demand_excess` = demand above threshold when battery was available

**Factors Affecting Capture Rate:**
- Battery size vs. peak demand
- SOC management strategy
- Round-trip efficiency
- Power limitations

#### Utilization Rate

**Utilization** = How much of battery capacity was actually used
```
utilization = Σ E_discharged / (E_usable × N_intervals × Δt)
```

---

## HVAC Module - Engineering Physics (Future Implementation)

### Energy Efficiency Quantification

#### Cooling Load Calculation

**Sensible Cooling Load:**
```
Q_sensible = m × c_p × (T_outdoor - T_indoor)
```
Where:
- `m` = Air mass flow rate (kg/s)
- `c_p` = Specific heat of air (1.006 kJ/kg·K)
- `T_outdoor`, `T_indoor` = Outdoor and indoor temperatures (°C)

**Latent Cooling Load:**
```
Q_latent = m × h_fg × (W_outdoor - W_indoor)
```
Where:
- `h_fg` = Latent heat of vaporization (2501 kJ/kg)
- `W` = Humidity ratio (kg water/kg dry air)

**Total Cooling Load:**
```
Q_total = Q_sensible + Q_latent
```

#### Efficiency Improvements

**VFD (Variable Frequency Drive) Savings:**
```
P_original = P_rated × (speed_ratio)^3
P_vfd = P_rated × (speed_ratio)^3 × η_vfd
Savings = P_original - P_vfd
```
Where:
- `speed_ratio` = Actual speed / Rated speed (0-1)
- `η_vfd` = VFD efficiency (typically 0.92-0.97)
- **Affinity Law**: Power ∝ (speed)³

**VRF (Variable Refrigerant Flow) Efficiency:**
```
COP_vrf = COP_rated × part_load_factor
EER_vrf = COP_vrf × 3.412
```
Where:
- `part_load_factor` = Efficiency multiplier at part load (typically 1.1-1.3)
- Modern VRF systems: COP 3.5-5.5, EER 12-19

**Controls Optimization:**
- **Setback/Setup**: Reduce load during unoccupied hours
- **Optimal Start/Stop**: Minimize runtime while maintaining comfort
- **Demand Limiting**: Reduce cooling during peak demand periods

#### Energy Savings Calculation

**Baseline Energy:**
```
E_baseline = Σ (P_baseline(t) × Δt)
```

**Improved Energy:**
```
E_improved = Σ (P_improved(t) × Δt)
```

**Savings:**
```
E_savings = E_baseline - E_improved
Savings % = (E_savings / E_baseline) × 100
```

**Demand Reduction:**
```
P_peak_baseline = max(P_baseline(t))
P_peak_improved = max(P_improved(t))
P_demand_reduction = P_peak_baseline - P_peak_improved
```

---

## Financial Analysis Module

### Net Present Value (NPV)

```
NPV = -C_0 + Σ (CF_t / (1 + r)^t)
```
Where:
- `C_0` = Initial investment
- `CF_t` = Cash flow in year t
- `r` = Discount rate (typically 0.06-0.12)

### Internal Rate of Return (IRR)

IRR is the discount rate where NPV = 0. Solved using Newton-Raphson method:
```
IRR: NPV(IRR) = 0
```

### Payback Period

**Simple Payback:**
```
Payback = Initial Cost / Annual Savings
```

**Discounted Payback:**
Time until cumulative discounted savings ≥ initial cost.

### Degradation-Adjusted Savings

**Year-by-Year Savings:**
```
Savings(t) = Baseline_Cost(t) - Improved_Cost(t) × Degradation_Factor(t)
```
Where `Degradation_Factor(t)` accounts for:
- Battery capacity loss
- HVAC efficiency degradation
- Equipment aging

---

## Data Processing Requirements

### Interval Data Handling

**15-Minute Intervals:**
- 4 intervals/hour × 24 hours/day × 365 days = 35,040 points/year
- Each point: timestamp, demand (kW), optional energy (kWh), optional temperature

**Unit Detection:**
- Auto-detect kW vs MW based on data magnitude
- Convert to consistent units for calculations

**Data Quality Validation:**
- Gap detection: Missing intervals
- Outlier detection: IQR method (Q1 - 1.5×IQR, Q3 + 1.5×IQR)
- Sample rate validation: Expected vs actual intervals

### Utility Rate Processing

**Time-of-Use (TOU) Rates:**
- Multiple periods per day (peak, off-peak, mid-peak)
- Seasonal variations (summer/winter)
- Energy charges ($/kWh) and demand charges ($/kW)

**Rate-Aware Dispatch:**
- Optimize battery charging during low-rate periods
- Discharge during high-rate periods
- Consider demand charge windows

---

## Performance Optimization Strategies

### Computational Efficiency

1. **Vectorized Operations**: Process arrays in batches
2. **Memoization**: Cache degradation calculations
3. **Lazy Evaluation**: Only calculate what's needed
4. **Parallel Processing**: Multi-threaded calculations for large datasets

### Memory Management

- Stream processing for large datasets
- Efficient data structures (typed arrays)
- Garbage collection optimization

---

## Validation & Testing Requirements

### Battery Module Tests

1. **Degradation Accuracy**: Compare against manufacturer curves
2. **Energy Balance**: Verify conservation of energy
3. **SOC Constraints**: Ensure SOC stays within bounds
4. **Power Limits**: Verify charge/discharge within battery specs

### Financial Module Tests

1. **NPV Validation**: Compare against Excel/standard calculators
2. **IRR Accuracy**: Verify against known test cases
3. **Payback Calculations**: Cross-check with manual calculations

---

## Future Enhancements

### Battery Module
- Arbitrage optimization (buy low, sell high)
- Multi-tariff dispatch optimization
- Thermal modeling (temperature effects on degradation)
- Grid services (frequency regulation, demand response)

### HVAC Module
- Detailed thermodynamic modeling
- Building load simulation
- Weather data integration
- Equipment library (VFDs, VRF systems, chillers)

### Multi-Technology Integration
- Combined battery + HVAC optimization
- Technology interaction effects
- Portfolio-level analysis

---

## Notes on Training Data

**Status**: Training content is already included in this repo as structured JSON.

**Primary Sources (in-repo)**:
- `data/structured-training-content.json`
- `public/data/structured-training-content.json`
- `src/data/master-ee-database/` (category JSON + `master-measures-database.json`)

**Optional (external) sources**:
- Raw PDFs/DOCX are only needed if you want to re-run extraction / ingestion scripts. The app runtime should not depend on a local `TRAINING_DATA/` folder.

---

## Engineering Standards & References

- **IEEE 1547**: Interconnection standards for distributed energy resources
- **ASHRAE 90.1**: Energy standard for buildings
- **NREL SAM**: System Advisor Model (validation reference)
- **Battery Standards**: UL 9540, IEEE 1679
- **HVAC Standards**: ASHRAE Handbook, AHRI standards

---

*This manifesto serves as the source of truth for all engineering calculations in the EverWatt Engine. All implementations must align with the physics and mathematics documented here.*

