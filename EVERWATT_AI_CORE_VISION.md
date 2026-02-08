Below is one single, canonical, paste-ready “Core Vision / North Star” document that includes everything:

the Building Digital Twin

the Project Builder

all engine families (physics, tariff, optimization, viability, documents)

the Academy (internal + external, healthcare-safe)

the internal document & spreadsheet-replacement ecosystem

explicit recognition of “hidden / creative utility strategies” like PG&E Option S, including the exact philosophy behind “battery installed primarily to unlock tariff value, not dispatch”

This is written to be dropped directly into Cursor as the foundational truth.
Nothing else should override it unless versioned.

# EVERWATT.AI — CORE VISION / NORTH STAR (CANONICAL)

Version: 1.0  
Status: Foundational — Do Not Collapse or Simplify  
Audience: Product, Engineering, AI Agents, Architecture, Operations  
Owner: EverWatt  

---

## 1. WHAT EVERWATT.AI IS (NO MARKETING LANGUAGE)

EverWatt.AI is a **facility-centered Building Operating System**.

It maintains a living **Building Digital Twin** that represents:
- physical systems (electrical, mechanical, lighting, DERs),
- telemetry (utility interval data, BMS trends, meters),
- documents and evidence,
- projects (past, active, proposed),
- assumptions, decisions, and verification over time.

On top of this twin, EverWatt.AI runs **deterministic, physics-based, tariff-aware, and economically viable engines** that identify, propose, explain, and verify energy and demand savings — including **non-obvious, structural, and tariff-driven strategies** that humans and spreadsheets routinely miss.

EverWatt.AI is:
- NOT a dashboard
- NOT a single optimizer
- NOT a spreadsheet with AI
- NOT a black box

It IS:
> A **decision system with memory, proof, and guardrails** for understanding buildings, utility economics, and hidden savings opportunities over the full lifecycle of a facility.

---

## 2. ONE-SENTENCE NORTH STAR

**EverWatt.AI is a vendor-agnostic building operating system that maintains a living digital twin of facilities—systems, telemetry, documents, and projects—and continuously applies physics-based, rate-aware, and economically intelligent optimization to uncover, explain, and verify provable energy and demand savings over a building’s lifetime, without vendor lock-in.**

---

## 3. CORE MISSION (OPERATIONAL, NOT ASPIRATIONAL)

EverWatt.AI is a plug-and-play, vendor-agnostic optimization and intelligence layer that learns from building and utility data to continuously reduce energy cost, demand exposure, and operational waste — including **hidden tariff and regulatory arbitrage opportunities** — with provable, auditable results.

### What “provable” means
- Baselines are snapshotted
- Calculations are deterministic and reproducible
- Assumptions are explicit and tracked
- Evidence is linked
- Before/after results are attributable
- Every decision has a recorded rationale

### What “learns” means
- Improves detection and recommendation logic over time
- Encodes expert engineering and tariff knowledge
- Accumulates institutional memory
- NEVER silently mutates building truth or control logic

---

## 4. CORE INSIGHT THAT DEFINES THE PLATFORM

**Not all savings come from equipment operation.  
Some of the largest savings come from understanding how utilities bill customers.**

EverWatt.AI is explicitly designed to uncover:
- structural billing inefficiencies,
- tariff design loopholes,
- eligibility-based savings,
- rate modifiers and options,
- situations where installing equipment (e.g., batteries) is valuable **even if it is rarely or never dispatched**, because it unlocks a more favorable billing regime.

### Example (Canonical)
Installing a battery primarily to qualify for **PG&E Option S**, where:
- the tariff benefit alone justifies the project,
- dispatch is optional or secondary,
- savings are driven by **billing structure**, not kWh shifted.

This type of reasoning is **first-class** in EverWatt.AI.

---

## 5. SIX PILLARS (PRIMARY OBJECTIVES)

1. **Deeper savings than “normal automation”**
   - Continuous tuning of HVAC, VFDs, large loads
   - Detection of operational waste (simultaneous heat/cool, hunting valves, sequencing errors)
   - Verification of improvement over time

2. **Vendor-agnostic integration**
   - Works with any major BMS/EMS ecosystem
   - Uses universal interfaces (BACnet, Modbus, REST, CSV, interval uploads)
   - Structurally prevents vendor lock-in

3. **Telemetry + learning**
   - Ingests interval and live telemetry
   - Detects anomalies and drift
   - Improves recommendations over time
   - Does NOT auto-actuate controls

4. **Scale “supertech” expertise**
   - Encodes expert commissioning, controls, tariff, and optimization logic into repeatable engines
   - Replaces tribal knowledge with software

5. **M&V-grade proof**
   - Before/after attribution
   - Audit trails
   - Utility-program-ready defensibility
   - Healthcare-grade explainability

6. **Enable new business models**
   - Monitoring + optimization subscriptions
   - Performance contracts
   - Portfolio optimization
   - Demand response and tariff optimization

---

## 6. THE CENTER OF GRAVITY: BUILDING DIGITAL TWIN

### Fundamental Rule
**Everything lives inside a Building.**

Projects, calculators, monitoring, AI explanations, reports, training, and documents all operate **against the Building Digital Twin**.

### Nature of the Twin
- Semantic and system-based (not BIM-first)
- Asset-centric, not document-centric
- Designed to support reasoning, not visualization alone
- Spatial / CAD layers can be added later

This is effectively a **lightweight, explainable digital model of the building’s electrical and mechanical systems**, tethered to real data.

---

## 7. DEVELOPMENT PRINCIPLES (NON-NEGOTIABLE)

### Always
- Deterministic math for truth
- AI as support, not authority
- Evidence-backed claims
- Explicit assumptions
- Auditability
- Modular isolation
- No silent side effects

### Never
- Proprietary lock-in
- “Simplified” physics that break credibility
- AI that mutates truth
- Spreadsheet-driven tribal processes
- Black-box recommendations

---

## 8. THE TRUST CORE (ANTI-HALLUCINATION GOVERNANCE)

### Two Worlds
1. **Confirmed Graph (Truth)**
2. **Suggestions / Proposals**

### Rule
No engine, calculator, AI, or UI may directly mutate confirmed truth.

All changes must:
- be proposed,
- reviewed,
- accepted or rejected,
- logged with rationale.

This enables:
- healthcare safety
- regulatory defensibility
- long-term trust

---

## 9. BUILDING TWIN DATA MODEL (HIGH-LEVEL)

- Building (identity, utilities, constraints)
- Assets (hierarchical: mechanical, electrical, lighting, DERs)
- Secondary equipment (VFDs, economizers, sensors)
- Telemetry sources (interval, BMS, meters)
- Documents & evidence vault
- Projects / measures (with lifecycle states)
- Assumption ledger
- Decision ledger
- Verification / commissioning log
- Missing information checklist

---

## 10. ENGINE ECOSYSTEM (CORE INTELLIGENCE)

EverWatt.AI contains **multiple deterministic engine families** that work together.

### A) Physics-Based Engines
- Battery physics (SOC, power limits, efficiency, degradation)
- HVAC operating envelopes and constraints
- Fan/pump/VFD affinity logic
- Lighting runtime and controls modeling

### B) Tariff & Billing Engines
- Structured tariff models (energy, demand, TOU, tiers, modifiers)
- Utility billing engine (monthly max demand, TOU demand, kWh allocation)
- Rate scenario generator (eligible alternatives and options)

### C) Optimization Engines (Solvers)
- Deterministic LP/MILP dispatch optimization
- Monthly demand cap discovery
- Portfolio/bundle selection (multi-unit, mixed models)

### D) Viability Engines (“Physics ≠ Project”)
- Feasibility (interconnection, export, site, healthcare constraints)
- Economics (capex, incentives, payback, margin, financing rules)
- Risk & confidence (data quality, missing inputs, sensitivity)

### E) Diagnostics & Detection Engines
- Anomaly detection
- Fault detection & diagnostics (FDD)
- Drift identification

### F) Document & Procedure Engines
- Engineering report generation
- Utility & incentive workbook generation
- Sales summaries
- QA/QC, commissioning, verification forms
- Audit and assessment checklists

---

## 11. BATTERY & TARIFF INTELLIGENCE (CRITICAL DIFFERENTIATOR)

EverWatt.AI explicitly models **tariff-driven value independent of dispatch**.

### Core Concept
A battery may be economically justified **even if it is rarely or never dispatched**, because:
- it qualifies the customer for a different billing regime,
- it reduces demand charge exposure structurally,
- it unlocks tariff modifiers (e.g., PG&E Option S).

### System Requirements
- Option S and similar constructs are treated as **separate rate scenarios**
- Zero-dispatch, minimal-dispatch, and full-dispatch cases are all evaluated
- Eligibility rules are explicit and auditable
- Outputs must explain *why* the battery exists:
  - “Tariff unlock”
  - “Dispatch value”
  - or both

This logic is core to the platform — not an edge case.

---

## 12. INTERNAL DOCUMENT & PROCEDURE ECOSYSTEM

EverWatt.AI replaces outdated utility spreadsheets with a **templated document and procedure ecosystem**.

### Purpose
- Encode processes and procedures
- Eliminate ad-hoc Excel workflows
- Improve consistency, quality, and defensibility
- Preserve institutional knowledge

### Outputs
- Engineering reports
- Regression models
- Utility incentive workbooks
- OBF / CEFO backup
- DR eligibility summaries
- Sales and executive summaries
- QA/QC and commissioning forms

### Rules
- Documents are derived artifacts
- Templates declare required inputs
- Missing data is explicit
- Assumptions are logged
- Outputs are reproducible

---

## 13. ACADEMY (TRAINING & EXPLANATION)

### Purpose
Turn buildings into **living classrooms**.

### Audiences
1. Internal Sales
2. Internal Engineers
3. External Healthcare Engineers & Facilities Teams

### Modes
- Generic training (foundational concepts)
- Building-specific training (tethered to the twin and telemetry)

### Guardrail
The Academy explains and teaches.  
It never mutates truth or pushes control actions.

---

## 14. AI ENGINEER ASSISTANT

AI is a **support layer**, not a truth engine.

### Allowed
- Parsing tariffs into structured candidates
- Explaining calculations and strategies
- Identifying missing information
- Generating narratives and training content
- Supporting troubleshooting

### Disallowed
- Mutating confirmed truth
- Auto-changing controls
- Making unsupported claims

---

## 15. CORE WORKFLOW SPINE

1. Create building
2. Declare assets
3. Bind telemetry
4. Snapshot baseline
5. Run engines
6. Generate ProposalPack
7. Review via inbox
8. Accept / reject with rationale
9. Mutate confirmed graph
10. Verify outcomes over time

---

## 16. PLATFORM IDENTITY (FINAL)

EverWatt.AI is a **building-centric digital twin and decision platform** that understands:
- how buildings actually operate,
- how utilities actually bill,
- where hidden savings live,
- and how to prove value safely over time.

It replaces spreadsheets, black boxes, and vendor lock-in with **explainable, repeatable, and economically intelligent energy engineering**.

This document is the foundation.  
All future work must align with it.
