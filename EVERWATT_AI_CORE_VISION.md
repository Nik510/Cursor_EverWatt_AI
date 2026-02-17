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

---

## 17. PRODUCT SURFACES (2–3 SIDED)

EverWatt.AI is ultimately a **portfolio-scale operating system** with multiple tailored experiences:

### A) Internal EverWatt Cockpit (power-user)
- Built for engineering + delivery + sales enablement.
- Deep tools for tariff/bill decomposition, determinants, scenario modeling, opportunity discovery, and report/document generation.
- Portfolio triage: “top sites to focus this week,” “top opportunities,” “missing data,” “highest confidence wins.”

### B) Customer-Facing Building Command Center (chief engineer + ops + finance)
- Daily operational truth: “what changed,” “what’s wrong,” “what to do next,” with evidence and guardrails.
- High-level building and portfolio performance views (energy/cost/demand/carbon), drill-down to causes.
- Healthcare-ready explainability: comfort/critical spaces constraints are first-class.

### C) Optional Partner / API Surface (later)
- Integrations, exports, and onboarding tools for OEMs, integrators, utilities/programs, and customer ecosystems.

---

## 18. CANONICAL CAPABILITY MAP (WHAT WE ARE BUILDING)

This section is the canonical “say it to Cursor” capability definition.  
It expands the North Star into concrete product scope without changing any governance rules above.

### 18.1 Building Digital Twin (per site + portfolio)
- Maintain a complete, living digital twin of every building: equipment, lighting systems, controls/BMS, zones, sequences of operation, setpoints, schedules, critical spaces, and dependencies.
- Attach all evidence to the twin: as-builts, O&M manuals, submittals, cut sheets, TAB, commissioning, warranty info, photos, and service history.
- Portfolio rollups: define “what good looks like,” standardize naming/tagging, and highlight drift/outliers across dozens of sites.

### 18.2 Universal Data Ingestion
- Utility bills ingestion (PDF/CSV/portals/APIs): electric/gas first; water/steam where applicable.
- Interval / AMI ingestion: Green Button, utility APIs, and customer exports; support “thousands of lines of data” as normal.
- Weather ingestion: degree days, humidity, and extreme events; correlation and weather-normalized modeling inputs.
- BMS telemetry ingestion: trends, points, alarms, schedules, overrides, and equipment runtime.
- IoT/sensors ingestion: occupancy, IAQ, temp/humidity, vibration, power quality, lighting levels (foot-candles), and life-safety test telemetry where available.
- Document ingestion: automatically classify and attach documents to the correct building/equipment/space within the twin.

### 18.3 Deterministic Engines (truth) + AI Layer (interpretation)
- EverWatt.AI contains multiple deterministic engines that produce **auditable, reproducible outputs**.
- AI explains, operationalizes, and teaches — but does not invent numbers.
- Every result must support “how computed,” including: inputs used, assumptions, warnings for missing data, confidence, and reproducible steps.

Required engine families (non-exhaustive):
- Tariff engine: versioned snapshots, structured rules (TOU, demand, riders), and “what changed between snapshots.”
- Bill engine: deep bill decomposition (supply/delivery/taxes/riders), ratchets, penalties, aggregation rules, and error detection.
- Regression/baseline engine: weather normalization and defensible baselines for M&V.
- Utility pattern engine: peaks/lows, load shapes, anomalies, seasonality, operational signatures.
- Incentive/rebate engine: searchable catalog, versioned snapshots, eligibility logic (DSIRE-style).
- Solar/battery/DR engines: behind-the-meter strategies, dispatch value, program alignment, stacking rules, and conflicts.
- Microgrid & resiliency engine: islanding/backup value, critical-load mapping, outage exposure, and coordination between solar/storage/generators where present.
- Measure economics engine: ROI/payback, TRC/TSB/PAC outputs where required, EULs, risk bands, and sensitivity.

### 18.4 Automated Opportunity Discovery (“super-engineer” savings finding)
- Identify opportunities from data without requiring humans to guess where to look.
- Detect drift and faults: setpoints changed, schedules overridden, sensor failures, VFD hunting, economizers disabled, simultaneous heat/cool, short cycling, staging issues, etc.
- Mechanical diagnostics examples (under the hood):
  - VFD overload detection
  - Low delta‑T detection and correction opportunities
  - Static pressure optimization opportunities
  - VAV/damper failure detection
  - Chiller/boiler staging problems
  - Excess outside air / economizer faults
- Lighting diagnostics examples:
  - Under/over-lighting and code compliance (foot-candle validation)
  - Uniformity + CCT governance across a campus
  - SKU reduction / portfolio standardization opportunities
- Power quality / electrical diagnostics (where possible):
  - spikes, out-of-phase power, abnormal demand events, power factor flags
  - “what likely caused this” narratives (bounded by evidence)

### 18.5 Closed-Loop Optimization (not just dashboards)
- Recommend actions and — where allowed — push changes into control systems **only with approvals** and safe-change workflows.
- Ongoing tuning: continuously learn behavior and improve sequences over time, without violating truth governance.
- Vendor-neutral optimization across mixed brands/generations while keeping outcomes consistent.
- Guardrails: comfort, critical spaces, infection control, and healthcare-ready logic are first-class constraints.

### 18.6 Workflows, Tasks, and Operating System for Engineers
- Turn findings into work orders/tasks: who/what/why/steps/safety notes/expected savings/verification steps.
- Commissioning-style functional testing workflows: guided checklists + evidence capture.
- Track overrides and exceptions: who changed what, when, why, and what it cost.
- Playbooks: recurring issue knowledge that improves per client and equipment type.

### 18.7 Automated Testing & Compliance (big differentiator)
- App-based automation for:
  - emergency exit signs
  - emergency lights
  - emergency drivers
- Schedule and log monthly / 90-minute testing (or jurisdictional equivalents), reduce labor, prevent false failures, avoid unnecessary replacements.
- Expand to broader compliance automation: inspection scheduling, evidence capture, audit-ready logs, and lighting-level compliance correction (egress, code minimums, over-lighting waste).

### 18.8 Measurement & Verification (prove savings, not vibes)
- Six-month pre/post comparisons and two-year follow-up checks (evolve into continuous M&V).
- Weather-normalized performance reporting.
- Functional verification tied to measured outcomes: “we changed X → load shape improved → demand dropped.”
- Portfolio leaderboards: best sites, worst sites, where to focus next.

### 18.9 Cutovers, Modernization, and De-risking Vendor Lock-In
- Plan and execute BMS cutovers across portfolios:
  - inventory systems/points, map sequences/graphics/trends
  - validate critical alarms/safeties, ensure continuity
  - define universal hardware interface strategy where needed
- Modernization roadmap generator: stepwise plan to eliminate technical debt and reduce lock-in.

### 18.10 Portfolio Standardization & Governance
- Standardize lighting specs and controls standards across a portfolio.
- Enforce approved CCT, fixture families, performance bands, and warranty governance.
- Reduce SKU count materially while improving uniformity and maintainability.
- Standardize sequences and naming conventions (points, equipment, zones) across sites.

### 18.11 Financial + Program Strategy Layer (make projects financeable)
- Generate finance-ready packages: savings estimates, risk, verification plan, and required documentation sets.
- Support on-bill financing, performance contracting, and incentive stacking logic where applicable.
- Decision support: “best 3 projects this quarter” by ROI, risk, ease, disruption, and compliance urgency.

### 18.12 Document & Report Generation (push-button)
- Generate: energy assessment reports, M&V reports, commissioning/functional testing reports, compliance reports.
- Generate project docs: quotes/proposals/scopes (where appropriate), change orders, service agreements, cutover plans, validation checklists.
- Output client-usable formats (PDF/Word/Excel) with consistent EverWatt branding.

### 18.13 AI Engineer Assistant (copilot, tethered to evidence)
- Chat interface that answers:
  - “What’s wrong with AHU‑3 right now?”
  - “Why did demand spike last Tuesday at 2pm?”
  - “Which sites are failing compliance testing?”
  - “What’s the fastest way to save 10% this quarter?”
- Explanations are always tied to evidence, audit trails, and deterministic outputs.
- Training accelerator: help junior engineers troubleshoot with client-specific context.

### 18.14 Reliability, Security, and Auditability (enterprise-ready)
- Deterministic outputs are versioned, testable, and reproducible.
- Full provenance: data sources, snapshots, assumptions, and explicit missing-data warnings.
- Role-based access controls, logs, approvals, and safe-change workflows for any control writes.
- Clear separation between truth engines and AI interpretation to preserve trust.

### 18.15 Integrations & Ecosystem
- Integrate with CMMS/work order platforms, BMS front-ends, historians, and utility portals.
- Integrate with design/engineering workflows (export specs, point lists, sequences, submittal packages).
- Provide APIs so EverWatt can plug into customer ecosystems.

### 18.16 Extensible Technology & Measure Library (ingest new tech to sell)
- Maintain a versioned catalog of technologies/measures (existing and emerging): what it is, prerequisites, constraints, typical savings mechanisms, KPIs, and required data to size/verify it.
- Enable onboarding of new product categories (sensors, controllers, batteries, DR programs, microgrid components, etc.) and map them into the twin (assets/telemetry/expected outcomes).
- Portfolio targeting: “which customers are best fit for X and why,” with auditable value hypotheses and risk notes.
- Ensure new technologies can be evaluated side-by-side with existing strategies (pros/cons, conflicts/synergies, confidence, and missing-data checklists).

### 18.17 EverWatt Operating Model Support (how it helps the business)
- Act as EverWatt’s internal memory of every building, project, and result.
- Standardize how experts assess buildings and what gets captured.
- Enable scalable nationwide delivery by turning expert intuition into repeatable engines, workflows, and playbooks.

---

## 19. THE “WHY” DIFFERENTIATOR (CAUSALITY, NOT JUST REACTION)

Battery/DR/control platforms often react to outcomes (e.g., demand spike → discharge).  
EverWatt.AI must explain **why the spike happened** by linking utility and interval signals to:
- equipment runtime and staging behavior,
- schedules, overrides, and sequence drift,
- lighting/occupancy patterns,
- weather context and special events,
- power quality flags when available.

This “cause chain” must be presented as an evidence-backed narrative with confidence bounds — not a guess.

---

## 20. DAILY CHIEF ENGINEER REPORT (CANONICAL OUTPUT)

EverWatt.AI should generate a daily pre-shift report (email + in-app) including:
- system check summary (normal vs issues to review)
- overnight anomalies (demand spikes, baseload drift, unusual runtimes)
- alarms and overrides (new, persistent, and “older than X days”)
- equipment health signals (e.g., VFD overload, low delta‑T, static pressure drift, stuck dampers, short cycling)
- IAQ/weather context (e.g., smoke day ventilation implications, humidity risk, extreme weather risk)
- energy/demand forecast (expected peak window + confidence range)
- prioritized actions (1–3 items) with impact estimate, risk, and verification steps
- verification of prior actions (“improved / no change / needs investigation”)

