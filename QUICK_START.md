# EverWatt Engine - Quick Start Guide

## Project Status

✅ **Project Initialized**: TypeScript + Vite + React setup complete
✅ **Directory Structure**: Domain-driven design with modular architecture
✅ **Core Modules**: Battery, HVAC (placeholder), Financials
✅ **Engineering Manifesto**: Complete physics documentation

## Next Steps

### 1. Install Dependencies
```bash
cd everwatt-engine
npm install
```

### 2. Development Server
```bash
npm run dev
```

### 3. Add Training Data
- Training content is already included in:
  - `data/structured-training-content.json`
  - `public/data/structured-training-content.json`
- Additional raw documents (PDF/DOCX) are optional and only needed if you want to re-run extraction scripts.

### 4. Populate Battery Library
- Update `src/modules/battery/battery-library.ts` with actual battery models
- Add degradation curves from manufacturer data
- Include cost data and specifications

## Project Structure

```
everwatt-engine/
├── src/
│   ├── core/                    # Shared utilities
│   │   ├── types.ts             # Core type definitions
│   │   ├── data-processing.ts   # Data validation, unit detection
│   │   └── index.ts
│   ├── modules/
│   │   ├── battery/             # Battery storage module
│   │   │   ├── types.ts         # Battery type definitions
│   │   │   ├── degradation.ts   # Degradation modeling
│   │   │   ├── peak-shaving.ts  # Peak shaving simulation
│   │   │   ├── battery-library.ts # Battery catalog
│   │   │   └── index.ts
│   │   ├── hvac/                # HVAC module (placeholder)
│   │   │   └── index.ts
│   │   └── financials/          # Financial analysis
│   │       ├── types.ts
│   │       ├── calculations.ts  # NPV, IRR, Payback
│   │       └── index.ts
│   ├── project-manifesto.md     # Engineering physics documentation
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Key Features Implemented

### Battery Module
- ✅ Peak shaving simulation with multiple strategies
- ✅ Degradation modeling (linear, exponential, custom)
- ✅ Round-trip efficiency calculations
- ✅ SOC management and constraints
- ✅ Battery library structure (ready for training data)

### Financial Module
- ✅ NPV calculation
- ✅ IRR calculation (Newton-Raphson method)
- ✅ Simple and discounted payback
- ✅ Year-by-year financial breakdown
- ✅ CEFO financing calculations

### Core Utilities
- ✅ Interval data validation
- ✅ Unit detection (kW vs MW)
- ✅ Gap and outlier detection
- ✅ Data quality assessment

## Usage Example

```typescript
import { simulatePeakShaving, calculatePeakShavingSummary } from '@battery';
import { validateDataQuality } from '@core';
import type { IntervalDataPoint, PeakShavingConfig } from '@battery';

// Load interval data
const demandData: IntervalDataPoint[] = [...]; // 15-min intervals

// Validate data
const quality = validateDataQuality(demandData);

// Configure battery and peak shaving
const battery = findBatteryById('tesla-megapack-2');
const config: PeakShavingConfig = {
  threshold: 1000, // kW
  minSOC: 0.10,
  maxSOC: 0.90,
  strategy: 'optimized',
};

// Run simulation
const dispatches = simulatePeakShaving(demandData, battery, config);

// Calculate summary
const summary = calculatePeakShavingSummary(dispatches, battery);
```

## Performance Targets

- ✅ Handle 35,040 data points (full year, 15-min intervals)
- ✅ Real-time calculations (< 1 second)
- ✅ Modular architecture for scalability

## Engineering Standards

All calculations follow the physics documented in `src/project-manifesto.md`:
- Battery degradation curves
- Peak shaving dispatch logic
- Energy balance equations
- Financial formulas

## Training Data Integration

Once training data is available:
1. Parse battery specifications from PDFs
2. Extract degradation curves
3. Populate battery library
4. Validate calculations against manufacturer data
5. Update manifesto with specific formulas

## Notes

- **Battery + rate libraries**: Persisted in `data/library/batteries.json` and `data/library/rates.json` with admin CRUD via `/api/library/*`.
- **HVAC module**: Implemented (equipment library + calculations) backed by `src/data/hvac/*`.
- **Frontend**: Basic React app, UI development deferred per requirements

