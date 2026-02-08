# Utility Summary Report v1

Generated: 2026-01-01T00:00:00.000Z

## Building metadata
- **projectId**: efe17ae8-9678-4668-bd69-40115d4a5ad9
- **territory**: PGE
- **customerType**: n/a
- **naicsCode**: n/a
- **currentRate**: n/a

## Key load shape metrics (deterministic)
- **baseloadKw**: 25.0
- **peakKw**: 167.0
- **loadFactor**: 0.43
- **peakinessIndex**: 6.68
- **operatingScheduleBucket**: business_hours (conf=0.70)

## Rate fit
- **status**: unknown (conf=0.10)
- **because**:
  - Current tariff/rate code is missing; cannot evaluate rate fit deterministically.
  - Collect the exact rate code from the utility bill or portal before comparing alternatives.
- **topAlternatives**:
- PG&E B-19S (needs_eval): potential improvement; needs inputs for deterministic delta
- PG&E E-19S (needs_eval): potential improvement; needs inputs for deterministic delta
- PG&E A-10 (needs_eval): potential improvement; needs inputs for deterministic delta
- PG&E B-19 (needs_eval): potential improvement; needs inputs for deterministic delta

## Option S / storage relevance
- **status**: unknown (conf=0.15)
- **because**:
  - Insufficient inputs to determine Option S relevance deterministically.
  - Provide interval kW data and demand charge presence to evaluate daily-demand structures.

## Demand response + utility/ISO programs
- **topMatches**:
- pge.dr.automated_dr_v1 (unknown, score=0.31)
- pge.dr.nonres_cpp_v1 (unknown, score=0.31)
- pge.incentives.healthcare_efficiency_v1 (unknown, score=0.14)
- pge.incentives.k12_efficiency_v1 (unknown, score=0.14)
- pge.fin.onbill_financing_v1 (unknown, score=0.14)

## Battery screening (v1)
- **gate**: recommended
- **because**:
  - Observed peakKw≈167.0 and baseloadKw≈25.0 (delta≈142.0 kW).
  - peakinessIndex≈6.68, loadFactor≈0.43, loadShiftingScore≈0.83.
  - Profile is sufficiently peaky with repeatable peak windows; battery evaluation is recommended.
- **topCandidates**:
- 1. ACME ACME-LFP-100-215 fitScore=0.765
- 2. ACME ACME-LFP-50-100 fitScore=0.737 disq=[insufficient_energy_kwh]
- 3. BetaStorage BETA-NMC-60-120 fitScore=0.676

## Missing inputs checklist (conservative)
- Current tariff/rate code required to evaluate rate fit
- NAICS code required to match many utility/ISO programs
- Customer segment/type required to match many utility/ISO programs
- Weather series not available; provide weather data or configure provider.
- Current tariff/rate code required to compare rates.
- Demand charge presence (meterMeta.hasDemandChargesKnown) required to interpret Option S relevance.
- Customer type required for this program (segment-gated).
- Monthly kWh required for this program (minMonthlyKwh gate).
- NAICS code required for this program.
- Annual kWh required for this program (minAnnualKwh gate).
