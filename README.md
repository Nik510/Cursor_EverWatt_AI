# EverWatt.AI

> **A plug-and-play, vendor-agnostic optimization layer that learns from building data to continuously reduce energy and demand—at scale—with provable results.**

EverWatt.AI turns building energy systems into something you can optimize like software—across any site, any controls vendor—so customers get real, provable savings without getting trapped in proprietary platforms.

**⭐ [Read the Canonical Core Vision / North Star](./EVERWATT_AI_CORE_VISION.md)** - Foundational truth (single canonical document).

---

## What We Are

A comprehensive energy optimization ecosystem that combines:
- Real-time equipment assessment with nameplate capture
- Physics-based calculations (battery, HVAC, lighting)
- AI-powered insights and recommendations
- Vendor-agnostic integration (works with any BMS/EMS)
- M&V-grade reporting for utilities and CFOs
- Ongoing optimization (not just one-time projects)

## Architecture

This project follows **Domain-Driven Design** principles with modular architecture:

- `src/core/` - Shared mathematical utilities and common logic
- `src/modules/battery/` - Battery storage simulation (peak shaving, arbitrage)
- `src/modules/hvac/` - HVAC energy efficiency analysis (placeholder for future)
- `src/modules/financials/` - ROI, NPV, IRR, and financial calculations

## Key Features

- **Multi-Technology Analysis**: Battery storage, HVAC upgrades, LED retrofits, EV charging
- **Intelligent Data Processing**: 15-minute interval data handling (35,040 points/year)
- **Advanced Financial Analysis**: Realistic savings with degradation modeling
- **Utility-Specific Intelligence**: Rate-aware dispatch optimization
- **AI-Powered Features**: Proposal generation, technical insights

## Development

```bash
npm install
npm run dev
```

Start everything (tariffs + API + UI):

```bash
npm run dev:all
```

- UI: http://localhost:5173
- API: http://localhost:3001

### Tariff snapshots (CA)

- Electric tariffs:
  - Ingest: `npm run tariffs:ingest:ca`
  - Status: `npm run tariffs:status`
- Gas tariffs (v0):
  - Ingest: `npm run tariffs:ingest:ca:gas`
  - Status: `npm run tariffs:status:gas`

## HVAC Optimizer Demo Dataset (FDD smoke test)

This repo includes a deterministic synthetic trend file generator so you can validate the full HVAC FDD pipeline without any client CSVs.

### 1) Generate the demo trend CSV

```bash
python scripts/generate_hvac_trend_csv.py
```

This writes: `data/hvac/demo_trends.csv` (7 days, 5-minute samples).

### 2) Start services

```bash
# Frontend
npm run dev

# Node API
npm run dev:server
```

```bash
# Python compute (FDD)
cd services/hvac_compute
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload
```

### 3) Run from UI

- Open: `http://localhost:5173/hvac-optimizer`
- Upload `data/hvac/demo_trends.csv`
- Map points:
  - timestamp column: `timestamp`
  - `SAT`, `CHW_VALVE_PCT`, `HW_VALVE_PCT`, `DUCT_STATIC`, `FAN_SPEED_PCT`
- Start run, then fetch:
  - `http://localhost:3001/api/hvac/runs/<RUN_ID>`

### 4) Automated smoke test (no server required)

```bash
python -m unittest services.hvac_compute.tests.test_demo_fdd_unittest
```

## Performance Requirements

- Handle 15-minute interval data for full year (35,040 data points)
- Support multiple technology types simultaneously
- Real-time calculations without lag

## Core Principles

**Vendor-Agnostic**: Integrate with anything (Ignition, Niagara, BACnet, Siemens, Johnson Controls, etc.) - never create proprietary lock-in.

**Accuracy First**: Complex physics (battery degradation, thermodynamic loads) are implemented fully, not simplified.

**Provable Results**: M&V-grade reporting that utilities and CFOs accept - with audit trails of what changed and why.

**Learn & Optimize**: Use telemetry + learning to improve performance over time, identifying waste and optimizing continuously.

**Scale Expertise**: Encode elite optimization knowledge into repeatable logic that can scale nationwide.

**Modular Design**: Each technology domain is self-contained with clear interfaces.

**Computational Performance**: Optimized for large-scale data processing (35,040 data points/year).

