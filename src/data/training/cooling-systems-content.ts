/**
 * COOLING SYSTEMS - Comprehensive Training Module
 * Complete training for all cooling technologies
 * Based on: ALL EE MEASURES 2.0.docx
 */

import type { TechPageData } from './lighting-content';

export const coolingSystemsContent: TechPageData = {
  title: "Commercial Cooling Systems",
  subtitle: "Complete Guide to Chillers, Cooling Towers, Heat Pumps & Distribution",

  overviewCards: [
    {
      id: "overview-lift",
      title: "The Big Lever: Lift",
      description: "Every 1°F lift reduction is ~2% compressor savings. CHW reset + CW reset is the fastest win.",
      icon: "📉",
      accent: "purple",
      jumpToSectionId: "controls-optimization",
      roles: ["engineer", "sales"],
    },
    {
      id: "overview-kpi",
      title: "KPIs That Matter",
      description: "kW/ton, IPLV, approach, ΔT, wet bulb. These are the dials that explain cost + comfort.",
      icon: "📊",
      accent: "indigo",
      jumpToSectionId: "introduction",
      roles: ["engineer", "sales"],
    },
    {
      id: "overview-tower",
      title: "Best ROI Upgrade",
      description: "VFD cooling tower fans: 1–2 year payback when paired with colder condenser water.",
      icon: "🌊",
      accent: "teal",
      jumpToSectionId: "cooling-towers",
      roles: ["engineer", "sales", "field"],
    },
    {
      id: "overview-deltaT",
      title: "ΔT = Hidden Pump Tax",
      description: "Low ΔT drives high flow → high pump kWh. Fix bypassing + controls before buying equipment.",
      icon: "💧",
      accent: "emerald",
      jumpToSectionId: "chilled-water-distribution",
      roles: ["engineer", "field"],
    },
    {
      id: "overview-field",
      title: "Fast Field ID",
      description: "Nameplate, refrigerant, tower fan type, and setpoints tell you where the savings are.",
      icon: "🔎",
      accent: "orange",
      jumpToSectionId: "field-identification",
      roles: ["field", "sales"],
    },
    {
      id: "overview-sell",
      title: "How to Sell It",
      description: "Lead with annual $ savings, risk reduction, and zero-capital optimization before replacement.",
      icon: "💰",
      accent: "pink",
      jumpToSectionId: "sales-strategies",
      roles: ["sales"],
    },
  ],
  
  introduction: {
    whatItIs: "Commercial cooling systems remove heat from buildings using refrigeration cycles, heat pumps, or evaporative cooling. These systems include chillers (water-cooled and air-cooled), cooling towers, chilled water pumps, and distribution piping. Cooling typically accounts for 30-50% of a commercial building's energy consumption, making it the largest opportunity for energy savings.",
    whereItIsSeen: [
      "Office buildings (data centers, server rooms, tenant spaces)",
      "Hospitals and medical facilities (operating rooms, imaging suites, laboratories)",
      "Manufacturing and industrial facilities (process cooling, clean rooms)",
      "Hotels and hospitality (guest rooms, kitchens, laundries)",
      "Retail and shopping centers (stores, food courts, refrigeration)",
      "Educational facilities (classrooms, laboratories, dining halls)",
    ],
    typicalLocations: [
      "Central plant: chillers, pumps, cooling towers",
      "Mechanical rooms: heat exchangers, distribution pumps",
      "Rooftop: cooling towers, air-cooled chillers",
      "Basement: condenser water pumps, strainers, plate-and-frame HX",
    ],
    keyConcepts: [
      "Lift = T_condenser - T_evaporator (every 1°F reduction saves ~2% energy)",
      "IPLV is more important than full-load kW/ton (systems run mostly at part load)",
      "Variable primary flow (VPF) cuts pump energy 30-50%",
      "Cooling tower optimization (VFD fans + lower CW temp) boosts chiller efficiency",
    ],
    whyItMatters: "Cooling systems are the #1 energy consumer in most commercial buildings. A 1% improvement in chiller efficiency can save $10,000-$50,000 annually in a typical 100,000 sq ft building. Understanding cooling system types, efficiency metrics, and optimization strategies is critical for any energy professional.",
    commonApplications: [
      "Comfort cooling for large commercial buildings (offices, schools, healthcare)",
      "Process cooling (manufacturing, labs, clean rooms)",
      "Data center cooling (CRAC/CRAH and chilled water plants)",
      "District/campus chilled water loops (universities, hospitals)",
      "Heat recovery for domestic hot water and reheat (hotels, hospitals)",
      "Electrification pathways (heat-pump chillers replacing boilers)",
    ],
  },

  chiefEngineerQuote:
    "If you only do two things: lower condenser water setpoint with VFD tower fans, and raise chilled water temperature. That's 20-30% savings before you buy a new chiller.",

  realWorldImage: {
    src: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80",
    alt: "Commercial cooling plant with chillers and cooling towers",
    caption: "Typical central plant: chillers, pumps, cooling towers, and distribution piping.",
  },

  vocabulary: [
    {
      term: "Lift",
      definition: "Temperature difference between condenser and evaporator (Tcond - Tevap); smaller lift = higher efficiency.",
      salesHook: "Every 1°F lift reduction saves ~2% compressor energy.",
    },
    {
      term: "IPLV",
      definition: "Integrated Part Load Value; weighted efficiency at 25/50/75/100% load—better indicator than full-load kW/ton.",
      salesHook: "Sell part-load efficiency—buildings live at 40-70% load.",
    },
    {
      term: "VPF",
      definition: "Variable Primary Flow pumping—single variable-speed loop; cuts pump kWh 30-50% and fixes low ΔT syndrome.",
      salesHook: "One pump set, big savings, simpler ops.",
    },
    {
      term: "Approach (Tower)",
      definition: "Leaving tower water temp minus entering wet-bulb; smaller approach = better tower performance.",
      salesHook: "Tighter approach = colder condenser water = cheaper tons.",
    },
  ],

  sections: [
    {
      id: "refrigeration-cycle",
      title: "The Refrigeration Cycle",
      icon: "🔄",
      summary: "Vapor-compression basics — the 4 steps, what “lift” really means, and why it drives kW/ton.",
      estimatedTime: 20,
      roles: ["engineer", "sales"],
      content: `All electric chillers rely on the same thermodynamic backbone: **vapor-compression refrigeration**.\n\n## The 4 steps (the whole story)\n\n1) **Compression (work in)**\n- Low-pressure vapor enters the compressor\n- Compressor raises pressure + temperature\n\n2) **Condensation (heat out)**\n- Hot, high-pressure vapor rejects heat in the condenser\n- Refrigerant becomes liquid\n\n3) **Expansion (pressure drop)**\n- Liquid passes through a metering device\n- Pressure (and temperature) drop sharply\n\n4) **Evaporation (cooling happens)**\n- Cold, low-pressure refrigerant absorbs heat in the evaporator\n- Refrigerant becomes vapor and returns to the compressor\n\n## The key KPI: Lift\n\n**Lift = T_condenser − T_evaporator**\n\n- Higher lift ⇒ higher compressor power\n- Practical rule-of-thumb: **every 1°F lift reduction ≈ ~2% compressor savings**\n\n## Quick engineering framing\n\nEnergy balance:\n\nQ_evap + W_comp = Q_cond\n\nCOP:\n\nCOP = Q_evap / W_comp\n\n**Sales translation:** the harder you have to “pump heat uphill,” the more kWh you burn. Reduce the temperature difference and you reduce cost.`,
    },
    {
      id: "electric-chillers",
      title: "Electric Chillers",
      icon: "❄️",
      summary: "Centrifugal, screw, scroll — how they work, where they fit, and what metrics drive savings.",
      estimatedTime: 30,
      roles: ["engineer", "sales", "field"],
      content: `**Electric chillers** are the workhorses of commercial cooling. They use vapor-compression refrigeration cycles with electric-driven compressors to produce chilled water (typically 42-48°F) for building cooling.

## Chiller Types

### 1. Centrifugal Chillers (50-5,000+ tons)
- **How it works**: High-speed impeller (3,600-10,000 RPM) compresses refrigerant using centrifugal force
- **Best for**: Large buildings, central plants, stable loads
- **Efficiency**: 0.45-0.60 kW/ton full-load, 0.35-0.45 kW/ton IPLV
- **Compressor types**: 
  - **Standard**: Fixed-speed, inlet guide vanes for capacity control
  - **Two-stage**: Two compressors in series, better part-load efficiency
  - **VFD**: Variable-speed, best part-load performance (0.35-0.40 kW/ton IPLV)
  - **Magnetic-bearing**: Oil-free, lowest friction, highest efficiency (0.38-0.45 kW/ton IPLV)

### 2. Screw Chillers (20-500 tons)
- **How it works**: Two intermeshing helical rotors compress refrigerant
- **Best for**: Mid-size buildings, partial redundancy, variable loads
- **Efficiency**: 0.60-0.75 kW/ton full-load, 0.50-0.65 kW/ton IPLV
- **Types**:
  - **Air-cooled**: No cooling tower needed, easier installation, lower efficiency
  - **Water-cooled**: Requires cooling tower, higher efficiency, better for large loads
  - **VFD**: Variable-speed compressor, excellent part-load efficiency

### 3. Scroll Chillers (5-150 tons)
- **How it works**: Orbiting scroll compresses refrigerant in spiral chambers
- **Best for**: Small buildings, rooftop units, distributed systems
- **Efficiency**: 0.70-0.90 kW/ton full-load, 0.60-0.75 kW/ton IPLV
- **Types**:
  - **Modular multi-scroll**: Multiple compressors for staging, better part-load
  - **Packaged air-cooled**: All-in-one unit, easy to install

### 4. Reciprocating Chillers (LEGACY - rarely specified today)
- **How it works**: Piston-driven compression (like a car engine)
- **Why legacy**: Lower efficiency, higher maintenance, noisier than modern options
- **Typical efficiency**: 0.80-1.20 kW/ton

## Key Efficiency Metrics

**kW/ton** = Power consumption per ton of cooling
- Lower is better
- Full-load vs. part-load efficiency matters (IPLV)

**IPLV (Integrated Part Load Value)** = Weighted average efficiency at part-load conditions
- More realistic than full-load efficiency
- Formula: IPLV = 0.01×EER₁₀₀ + 0.42×EER₇₅ + 0.45×EER₅₀ + 0.12×EER₂₅

**Lift** = Temperature difference between condenser and evaporator
- Lower lift = higher efficiency
- Lift reduction is the #1 optimization strategy

## When to Replace

**Priority: HIGH** if existing chiller is:
- **Old**: 15+ years (pre-2010 efficiency standards)
- **Inefficient**: >0.75 kW/ton full-load, >0.65 kW/ton IPLV
- **Refrigerant**: R-22 (being phased out, expensive to service)
- **Oversized**: Running <40% load most of the time
- **High maintenance**: Frequent repairs, oil changes, tube cleaning

**Typical payback**: 3-7 years
**Energy savings**: 30-50% vs. old chillers`,
      details: [
        "Centrifugal chillers use high-speed impellers to compress refrigerant",
        "VFD chillers offer best part-load efficiency for variable loads",
        "Magnetic-bearing chillers are oil-free and highly efficient",
        "Screw chillers are ideal for mid-size buildings with 20-500 ton loads",
        "Scroll chillers work well for small distributed systems",
        "Free-cooling / economizer chillers use low ambient temps to bypass compressor",
      ]
    },
    {
      id: "air-vs-water-cooled",
      title: "Air-Cooled vs Water-Cooled",
      icon: "🌡️",
      summary: "Heat rejection choice: first cost vs. operating cost vs. maintenance and water availability.",
      estimatedTime: 20,
      roles: ["engineer", "sales"],
      content: `Every chiller must reject heat somewhere. The choice between **air-cooled** and **water-cooled** has major implications.\n\n## Air-cooled (simpler)\n- Rejects heat directly to ambient air (fans + condenser coil)\n- **Pros:** no tower, no water treatment, faster installs\n- **Cons:** higher condensing temps ⇒ higher kW/ton, noise, outdoor exposure\n\n## Water-cooled (usually more efficient)\n- Rejects heat to condenser water, then tower rejects heat via evaporation\n- **Pros:** lower condensing temps ⇒ better kW/ton, quieter chiller indoors\n- **Cons:** tower + pumps + treatment, water consumption, more O&M\n\n## Quick decision frame\n\n- If annual run hours are low and simplicity is king → air-cooled can win.\n- If hours are high, demand charges matter, or it’s a big plant → water-cooled typically wins on lifecycle cost.\n\n**Field clue:** if you see a cooling tower, you’re in water-cooled territory.`,
    },
    {
      id: "absorption-gas-chillers",
      title: "Absorption & Gas Chillers",
      icon: "🔥",
      summary: "When heat (gas/steam/waste heat) drives cooling. A demand-charge story more than a kWh story.",
      estimatedTime: 20,
      roles: ["engineer", "sales"],
      content: `**Absorption chillers** use heat (not electricity) to drive the refrigeration cycle. They're powered by natural gas, steam, or waste heat instead of electric compressors.

## Absorption Chiller Types

### 1. Direct-Fired Absorption (LiBr - Lithium Bromide)
- **How it works**: Natural gas burner heats LiBr solution, drives absorption cycle
- **Efficiency**: 1.0-1.2 COP thermal (70-100% efficient vs. gas input)
- **Best for**: Buildings with low electricity costs, high gas costs, or demand charge issues
- **Capacity**: 100-1,500 tons
- **Key advantage**: Near-zero electrical demand (only pumps use electricity)

### 2. Double-Effect Absorption
- **How it works**: Two-stage absorption cycle for higher efficiency
- **Efficiency**: 1.2-1.4 COP thermal (better than single-effect)
- **Cost**: Higher first cost, better operating cost

### 3. Steam Absorption
- **How it works**: Uses low-pressure steam (10-15 psig) as heat source
- **Best for**: Buildings with existing steam infrastructure or waste steam
- **Efficiency**: 0.7-0.8 COP thermal

### 4. Natural Gas Engine-Driven Chiller
- **How it works**: Gas engine drives compressor (like electric chiller, but gas-powered)
- **Efficiency**: 1.2-1.5 COP (electric equivalent: 0.6-0.8 kW/ton)
- **Key advantage**: Heat recovery from engine jacket for heating/hot water

### 5. CHP Integrated Chiller
- **How it works**: Combined heat and power (CHP) system produces electricity + waste heat to drive absorption chiller
- **Best for**: Buildings with simultaneous heating and cooling loads
- **Typical system**: Natural gas microturbine + absorption chiller

## When to Specify

**Good fit when**:
- High demand charges (>$15/kW) - absorption eliminates demand
- High electricity rates (>$0.15/kWh) and low gas rates (<$0.80/therm)
- Waste heat available (steam, hot water, exhaust gas)
- Building has simultaneous heating and cooling needs

**Not recommended when**:
- Low demand charges
- Low electricity rates or high gas rates
- No waste heat available
- Part-load performance is critical (absorption doesn't load-follow well)

**Typical payback**: 5-10 years (economics-driven, not efficiency-driven)`,
      details: [
        "Absorption chillers use heat instead of electricity",
        "Best for buildings with high demand charges",
        "Direct-fired units burn natural gas to drive refrigeration",
        "Double-effect absorption offers higher efficiency",
        "Gas engine chillers can recover waste heat for heating",
      ]
    },
    {
      id: "heat-pump-chillers",
      title: "Heat Pump Chillers",
      icon: "🌡️",
      summary: "Electrification-ready systems that produce heating + cooling, including heat-recovery chillers.",
      estimatedTime: 25,
      roles: ["engineer", "sales"],
      content: `**Heat pump chillers** provide both cooling and heating by reversing the refrigeration cycle. They're ideal for buildings with simultaneous heating and cooling loads or moderate heating requirements.

## Heat Pump Chiller Types

### 1. Air-Source Heat Pump Chiller
- **How it works**: Refrigeration cycle with outdoor coil (air) and indoor coil (water)
- **Cooling mode**: Rejects heat to outdoor air
- **Heating mode**: Extracts heat from outdoor air
- **Efficiency**: 
  - Cooling: 0.70-0.90 kW/ton (similar to air-cooled chiller)
  - Heating: COP 2.5-3.5 (250-350% efficient vs. resistance heat)
- **Best for**: Buildings with moderate heating needs, no boiler

### 2. Water-Source Heat Pump Chiller
- **How it works**: Uses water loop (60-90°F) as heat source/sink
- **Efficiency**: 
  - Cooling: 0.50-0.65 kW/ton (better than air-source)
  - Heating: COP 3.5-4.5 (best heat pump efficiency)
- **Best for**: Buildings with cooling tower or geo-exchange loop

### 3. Reversible Heat Pump Chiller (4-pipe system)
- **How it works**: Can switch between heating and cooling modes
- **System**: Separate chilled water and hot water piping (4-pipe system)
- **Best for**: Hotels, hospitals, buildings with simultaneous heating/cooling zones

### 4. Heat-Recovery Chiller (Simultaneous Heat + Cooling)
- **How it works**: Produces chilled water AND hot water at the same time
- **Efficiency**: Recovers condenser heat for useful heating (free hot water)
- **Typical**: 42°F chilled water + 105-120°F hot water
- **Best for**: 
  - Hotels (cooling + domestic hot water)
  - Hospitals (cooling + sterilization water)
  - Food processing (cooling + cleaning/sanitizing water)
- **Energy benefit**: COP 5-7 (includes value of recovered heat)

### 5. High-Temp Heat Pump Chiller-Boiler (130-180°F)
- **How it works**: Heat pump producing high-temperature hot water (130-180°F)
- **Best for**: Boiler replacement, steam-to-hot-water conversions
- **Efficiency**: COP 2.5-3.5 at high temperatures (still better than boiler)
- **Refrigerant**: CO₂, HFO blends (handle high temperatures)

### 6. CO₂ Transcritical Heat Pump Chiller
- **How it works**: Uses CO₂ refrigerant at supercritical pressures
- **Key advantage**: Natural refrigerant (zero GWP), high-temp capability
- **Efficiency**: COP 3.0-4.0, excellent hot water production
- **Best for**: Food processing, commercial kitchens, laundries

## When to Specify

**Heat pump chillers make sense when**:
- Building has simultaneous heating and cooling loads
- No existing boiler or boiler is end-of-life
- Domestic hot water demand is high (hotels, hospitals)
- Electrification goals (eliminate gas boilers)
- Want to avoid fossil fuel combustion

**Typical payback**: 4-8 years (replaces both chiller and boiler)
**Energy savings**: 40-60% vs. separate chiller + boiler`,
      details: [
        "Heat pump chillers provide both cooling and heating",
        "Heat-recovery chillers produce hot water while cooling",
        "Water-source heat pumps are more efficient than air-source",
        "High-temp heat pumps can replace boilers (130-180°F)",
        "CO₂ transcritical heat pumps offer natural refrigerant solution",
      ]
    },
    {
      id: "cooling-towers",
      title: "Cooling Towers",
      icon: "🌊",
      summary: "The chiller’s partner: tower performance sets your condenser water temperature and lift.",
      estimatedTime: 25,
      roles: ["engineer", "field", "sales"],
      content: `**Cooling towers** reject heat from water-cooled chillers by evaporating water. They're essential components of water-cooled chiller systems and offer significant efficiency advantages over air-cooled systems.

## How Cooling Towers Work

**Evaporative cooling** uses water evaporation to remove heat:
- Hot condenser water (85-95°F) enters tower
- Water sprays over fill media, air flows through
- ~2% of water evaporates, cooling remaining water
- Cold water (75-85°F) returns to chiller

**Key principle**: Evaporation is 540 BTU/lb (latent heat), much more effective than sensible cooling

## Cooling Tower Upgrades

### 1. VFD Tower Fans
- **What it does**: Variable-speed control of tower fans based on condenser water temperature
- **Energy savings**: 30-50% fan energy, 10-15% total chiller plant energy
- **How it works**: As cooling load decreases, fan speed reduces, condenser water gets colder, chiller efficiency improves
- **Typical payback**: 2-3 years
- **Priority**: HIGH - this is the #1 cooling optimization

### 2. EC Fan Motors (Electronically Commutated)
- **What it does**: Replaces standard motors with high-efficiency EC motors
- **Energy savings**: 20-30% fan energy vs. standard motors
- **Key advantage**: Variable-speed capability built-in (no separate VFD needed)
- **Typical payback**: 3-4 years

### 3. Fill Media Upgrades
- **What it does**: Replaces old/fouled fill with high-efficiency film fill
- **Energy savings**: 5-15% by improving heat transfer
- **When needed**: Fill is 10+ years old, fouled, damaged, or low-efficiency splash fill

### 4. Nozzle Upgrades
- **What it does**: Replaces old spray nozzles with high-efficiency nozzles
- **Benefit**: Better water distribution, lower pumping pressure, reduced scaling

### 5. Drift Eliminators
- **What it does**: Reduces water droplets leaving tower (water loss + scaling issues)
- **Benefit**: Lower water consumption, less scaling on nearby surfaces

### 6. Basin Heaters Optimization
- **What it does**: Controls basin heaters only when needed (prevent freezing)
- **Energy savings**: 5,000-20,000 kWh/year (heaters often left on year-round)
- **Simple fix**: Add temperature sensor + timer control

### 7. Water Treatment Optimization
- **What it does**: Improves water chemistry to reduce scaling, fouling, corrosion
- **Benefit**: Maintains chiller and tower efficiency, extends equipment life
- **Key metrics**: Cycles of concentration, pH, conductivity, TDS

## Cooling Tower Best Practices

**Approach Temperature**: Difference between leaving water temp and wet-bulb temp
- Good design: 7-10°F approach
- Old/fouled towers: 12-15°F approach (poor performance)

**Range**: Temperature drop across tower (entering - leaving)
- Typical: 10-15°F range
- Higher range = more efficient tower (less water flow)

**Cycles of Concentration (COC)**: How many times dissolved solids concentrate before blowdown
- Good: 4-6 COC (less water waste)
- Poor: 2-3 COC (excessive water consumption)

**Optimization strategy**:
1. Add VFD fans (biggest impact)
2. Lower condenser water temperature setpoint (75-78°F vs. 85°F)
3. Maintain fill media (clean annually, replace every 10-15 years)
4. Optimize water treatment (higher COC = less water waste)`,
      details: [
        "Cooling towers use evaporative cooling to reject heat",
        "VFD tower fans are the #1 cooling optimization (30-50% savings)",
        "Lower condenser water temperature improves chiller efficiency",
        "Approach temperature indicates tower performance",
        "Water treatment optimization reduces scaling and water waste",
      ]
    },
    {
      id: "chilled-water-distribution",
      title: "Cooling Distribution (Pumps & Piping)",
      icon: "💧",
      summary: "Primary-secondary vs VPF, pump affinity laws, and how to fix low-ΔT syndrome.",
      estimatedTime: 25,
      roles: ["engineer", "field"],
      content: `**Cooling distribution systems** move chilled water from chillers to cooling coils in air handlers. Pumps typically consume 10-20% of total cooling system energy, making them a significant optimization opportunity.

## Chilled Water Pump Configurations

### 1. Primary-Only Pumping
- **Design**: Single set of constant-speed pumps serve chiller and building
- **Pro**: Simple, low first cost
- **Con**: Chillers must operate at building flow rate (often excessive)
- **When used**: Small systems (<100 tons), stable loads

### 2. Primary-Secondary Pumping (Traditional)
- **Design**: Primary pumps (constant-speed) serve chillers, secondary pumps (variable-speed) serve building
- **Pro**: Chillers see constant flow, building gets variable flow
- **Con**: Primary pumps run at full speed even at low loads (wasted energy)
- **Common in**: Older buildings, 1990s-2010s construction

### 3. Variable Primary Flow (VPF) - Modern Best Practice
- **Design**: Single set of variable-speed pumps serve chillers and building
- **Pro**: Pumps follow actual load (30-50% pump energy savings vs. primary-secondary)
- **Con**: Requires chillers with wide flow range (40-120% design flow)
- **When to use**: New construction, retrofit with modern chillers

## Pump Energy Optimization

### 1. Pump VFDs (Variable Frequency Drives)
- **What it does**: Variable-speed pump control based on ΔP or flow demand
- **Energy savings**: 30-50% pump energy (affinity laws: power ∝ speed³)
- **Typical payback**: 2-3 years
- **Priority**: HIGH - easy retrofit

### 2. Pump Impeller Trimming
- **What it does**: Reduces impeller diameter to match actual system requirements
- **When needed**: Pumps are oversized, running at low speed constantly
- **Energy savings**: 10-30% pump energy
- **Cost**: $500-$2,000 per pump (mechanical work)

### 3. Hydronic Balancing
- **What it does**: Balances flow to all zones for proper cooling
- **Benefit**: Eliminates over-pumping, improves comfort, reduces energy
- **When needed**: Hot/cold complaints, high ΔP, low ΔT

### 4. PICVs (Pressure Independent Control Valves)
- **What it does**: Maintains constant flow regardless of pressure (eliminates balancing issues)
- **Benefit**: Simpler system, better control, easier to balance
- **When to use**: Retrofit projects, systems with balance problems

## Chilled Water ΔT Optimization

**ΔT** = Temperature difference across chilled water system
- **Design**: 10-12°F ΔT (supply 42°F, return 52-54°F)
- **Reality**: Many systems achieve only 6-8°F ΔT (problem!)

**Low ΔT syndrome causes**:
- Oversized pumps (too much flow)
- Undersized coils (not enough heat transfer)
- Fouled coils (poor heat transfer)
- Bypass flow (piping issues)
- Control valve issues

**Why it matters**: Low ΔT = 50% higher pump flow = 3-4× higher pump energy

**Fix strategies**:
1. Reduce pump speed (increase ΔT to 10-12°F)
2. Clean coils (improve heat transfer)
3. Fix control valves (eliminate bypass flow)
4. Add ΔT monitoring and alarms`,
      details: [
        "Variable primary flow (VPF) is most efficient pumping strategy",
        "Pump VFDs save 30-50% pump energy using affinity laws",
        "Low ΔT syndrome wastes 50%+ pump energy",
        "Target 10-12°F ΔT for efficient chilled water systems",
        "PICVs simplify balancing and improve control",
      ]
    },
    {
      id: "controls-optimization",
      title: "Controls & Optimization",
      icon: "🎛️",
      summary: "15–30% savings is common with controls: lift reduction, staging, and VFD optimization.",
      estimatedTime: 30,
      roles: ["engineer", "sales"],
      content: `The best equipment in the world won’t save energy if it’s controlled poorly.\n\n## The “Big Three” optimizations\n\n1) **Lift reduction**\n- Raise CHWS setpoint when humidity/loads allow (CHW reset)\n- Lower CWS setpoint when wet bulb allows (CW reset)\n\n2) **Optimal chiller staging**\n- Avoid running multiple chillers at low part-load\n- Use trend data (kW/ton vs load) to pick lead/lag strategies\n\n3) **VFD optimization (towers + pumps + chillers)**\n- Use the cube law to your advantage: power ∝ speed³\n\n## Practical reset rules\n\n- CHW reset: raise until a representative valve position approaches ~90% open (or comfort/humidity limit)\n- CW reset: track wet bulb + approach target (and enforce minimum CW limits)\n\n**Sales angle:** start with “no-capital” tuning, then justify VFD retrofits with measured lift + fan/pump savings.`,
    },
    {
      id: "sales-strategies",
      title: "Sales Strategies & ROI",
      icon: "💰",
      summary: "Pitch the path: optimize first, retrofit next, replace last. Lead with dollars + risk reduction.",
      estimatedTime: 20,
      roles: ["sales"],
      content: `## The sequence that closes deals\n\n1) **No-capital optimization:** CHW reset + CW reset + staging\n2) **Fast-payback retrofits:** tower fan VFDs, pump VFDs, tube cleaning + instrumentation\n3) **Replacement only when needed:** refrigerant risk, reliability, or big efficiency delta\n\n## The “2% lift rule” script (short)\n\n\"Every 1°F we reduce lift saves about 2% compressor energy. If we move you from 43°F lift to 32°F lift, that’s ~22% savings. We can test this gradually and trend the results.\"\n\n## Objection handler\n\n- \"We need 42°F water\" → \"Let’s prove it. Most comfort loads tolerate 46–48°F. We’ll step up slowly and monitor comfort/humidity.\"`,
    },
    {
      id: "field-identification",
      title: "Field Identification Guide",
      icon: "🔍",
      summary: "What to read, what to photograph, and what signals “easy savings” on day one.",
      estimatedTime: 15,
      roles: ["field", "sales", "engineer"],
      content: `## Fast field checklist\n\n- Chiller: manufacturer/model, tonnage, refrigerant, year, kW and amps\n- Towers: VFD present? approach/range clues, visible scaling/fouling, fan condition\n- Pumps: primary-secondary vs VPF, VFDs present, evidence of bypassing\n- Setpoints: CHWS/CHWR, CWS/CWR, tower approach targets\n- Maintenance: last tube cleaning, water treatment practices\n\n## “Easy savings” signals\n\n- Constant-speed tower fans + fixed 85°F CWS\n- Fixed 42°F CHWS all season\n- Multiple chillers running at low load\n- Low ΔT (e.g., 6–8°F) with high pump flow`,
    },
    {
      id: "quick-reference",
      title: "Quick Reference: Measures by Subcategory",
      icon: "📋",
      summary: "Fast lookup list that maps the measures taxonomy to cooling subcategories.",
      estimatedTime: 10,
      roles: ["sales", "engineer", "field"],
      content: `Use this as a concise lookup. Full training above; measures align to the Word doc.

**1.1 Electric Chillers**
- Centrifugal chiller: Standard, Two-stage, VFD centrifugal, Magnetic-bearing centrifugal
- Screw chiller: Air-cooled screw, Water-cooled screw, VFD screw
- Scroll chiller: Modular multi-scroll, Packaged air-cooled scroll
- Legacy/other: Reciprocating chiller (legacy), Free-cooling / economizer chillers

**1.2 Absorption / Gas / Engine Chillers**
- Direct-fired absorption (LiBr)
- Double-effect absorption
- Steam absorption
- Natural gas engine-driven chiller
- CHP integrated chiller

**1.3 Heat Pump Chillers (under COOLING)**
- Air-source heat pump chiller
- Water-source heat pump chiller
- Reversible heat pump chiller (4-pipe)
- Heat-recovery chiller (simultaneous heat + cooling)
- High-temp heat pump chiller-boiler (130–180°F)
- CO₂ transcritical heat pump chiller

**1.4 Cooling Towers**
- Cooling tower replacements
- VFD tower fans
- EC fan motors
- Drift eliminators
- Fill media upgrades
- Nozzle upgrades
- Basin heaters optimization
- Side-stream filtration
- Water treatment optimization`,
      details: [
        "Maps each subcategory to the measures in the Word doc",
        "Use this to cross-reference the master measures database quickly",
      ]
    },
  ],

  tooltipData: {
    // Placeholders for interactive schematic - will be expanded
    chiller: {
      title: "Chiller",
      desc: "Vapor-compression refrigeration cycle produces chilled water",
      stats: "0.45-0.75 kW/ton",
      style: { top: '20%', left: '30%' }
    },
    tower: {
      title: "Cooling Tower",
      desc: "Evaporative cooling rejects heat to atmosphere",
      stats: "VFD fans save 30-50% energy",
      style: { top: '20%', right: '20%' }
    },
    pump: {
      title: "Chilled Water Pumps",
      desc: "Circulate chilled water to building loads",
      stats: "VFDs save 30-50% pump energy",
      style: { bottom: '30%', left: '40%' }
    },
  },

  fieldTips: [
    {
      category: "Chiller Selection",
      tips: [
        "Centrifugal for loads >200 tons, screw for 20-200 tons, scroll for <50 tons",
        "VFD chillers pay back in 2-4 years for variable loads",
        "Magnetic-bearing chillers are oil-free but require clean water",
        "Size chillers for 80-90% of peak load (avoid oversizing)",
      ]
    },
    {
      category: "Chiller Optimization",
      tips: [
        "Raise chilled water temperature from 42°F to 46-48°F (saves 8-12% energy)",
        "Lower condenser water temperature from 85°F to 75-78°F (saves 15-20% energy)",
        "Combined optimization: 25-30% total chiller plant savings",
        "Clean condenser tubes annually (fouling increases kW/ton by 10-30%)",
      ]
    },
    {
      category: "Cooling Tower",
      tips: [
        "VFD tower fans are the #1 optimization (2-3 year payback)",
        "Target 7-10°F approach temperature (measure entering WB temp)",
        "Clean fill media annually (pressure wash or chemical clean)",
        "Optimize water treatment for 4-6 cycles of concentration",
      ]
    },
    {
      category: "Pumping Systems",
      tips: [
        "Variable primary flow (VPF) saves 30-50% pump energy",
        "Target 10-12°F ΔT across chilled water system",
        "Trim pump impellers if running <50% speed constantly",
        "Add ΔT monitoring to identify low-ΔT syndrome",
      ]
    },
  ],

  deepDives: [
    {
      title: "Chiller Efficiency: kW/ton vs. IPLV",
      engineerExplanation: "Full-load kW/ton is useful for sizing but doesn't represent real-world performance. Chillers rarely run at 100% load - they typically operate at 40-70% load. IPLV (Integrated Part Load Value) weights efficiency at 25%, 50%, 75%, and 100% load to give a more realistic annual efficiency. VFD chillers excel at part-load (IPLV 0.35-0.45 kW/ton) even if full-load efficiency is similar to fixed-speed units (0.50-0.60 kW/ton).",
      salesExplanation: "Don't let customers compare full-load efficiency only - that's a trap. Show IPLV (part-load efficiency) because that's where the real savings are. A VFD chiller might be 0.55 kW/ton full-load (same as standard) but 0.40 kW/ton IPLV (25% better). Say: 'Your building rarely runs at 100% load. At 50% load, where you spend most of your time, this VFD chiller uses 35% less energy.' Use utility data to show actual load profile.",
      formulas: ["IPLV = 0.01×A + 0.42×B + 0.45×C + 0.12×D (where A=100%, B=75%, C=50%, D=25% load efficiency)"],
    },
    {
      title: "Lift Reduction: The 2% Rule",
      engineerExplanation: "Lift is the thermodynamic driving force in the refrigeration cycle (T_condenser - T_evaporator). Every 1°F reduction in lift improves compressor efficiency by approximately 2%. This is based on the Carnot equation: COP = T_evap / (T_cond - T_evap). Practical optimization: Raise CHW temp from 42°F to 46°F (-4°F lift) + Lower CW temp from 85°F to 78°F (-7°F lift) = 11°F total lift reduction = 22% energy savings. This is the single most powerful optimization strategy.",
      salesExplanation: "The '2% Rule' is your secret weapon: Every 1°F you reduce the lift (temperature difference), you save 2% energy. Here's the pitch: 'Right now your chiller is working at 85°F condenser and 42°F evaporator - that's 43°F lift. If we raise your chilled water to 46°F and lower your condenser water to 78°F, we get 32°F lift - that's 11°F reduction = 22% savings. This is free energy - just temperature setpoint changes.' Use this to justify VFD tower fans (lower condenser temp) and CHW temp reset controls.",
      formulas: ["Energy Savings % ≈ 2% × ΔLift (°F)", "Lift = T_Condenser - T_Evaporator"],
    },
  ],

  realWorldExamples: [
    {
      scenario: "200-ton centrifugal chiller replacement",
      solution: "Replace 1990s centrifugal chiller (0.75 kW/ton) with magnetic-bearing VFD chiller (0.45 kW/ton IPLV)",
      results: "40% energy savings, 2,500 hrs/year operation = $18,000/year savings",
      payback: "4.5 years on $350,000 project cost",
    },
    {
      scenario: "Cooling tower VFD retrofit",
      solution: "Add VFDs to (3) 25 HP tower fans, lower condenser water setpoint from 85°F to 78°F",
      results: "35% fan energy savings + 12% chiller energy savings = $12,000/year total savings",
      payback: "2.3 years on $28,000 project cost",
    },
    {
      scenario: "Variable primary flow conversion",
      solution: "Convert primary-secondary pumping to variable primary flow, add ΔT optimization controls",
      results: "45% pump energy savings + improved ΔT from 7°F to 11°F",
      payback: "2.8 years on $45,000 project cost",
    },
    {
      scenario: "Heat-recovery chiller for hotel",
      solution: "Replace air-cooled chiller (200 tons) + domestic hot water heaters with heat-recovery chiller",
      results: "Eliminates 80% of domestic hot water energy, 20% better cooling efficiency",
      payback: "5.2 years on $420,000 project cost (includes hot water piping)",
    },
  ],
};
