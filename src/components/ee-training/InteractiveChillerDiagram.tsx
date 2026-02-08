/**
 * InteractiveChillerDiagram Component
 * Click-to-explore chiller system diagram with detailed component info
 * Shows refrigeration cycle, water loops, and key components
 */

import React, { useState } from 'react';
import { X, Zap, Droplets, Wind, Thermometer, Gauge, DollarSign, Lightbulb, Target, AlertTriangle, TrendingUp, MessageSquare, CheckCircle } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface ChillerComponent {
  id: string;
  name: string;
  shortDesc: string;
  engineerDetail: string;
  salesDetail: string;
  specs: { label: string; value: string }[];
  tips: string[];
  icon: React.ReactNode;
}

interface InteractiveChillerDiagramProps {
  title?: string;
  chillerType?: 'centrifugal' | 'screw' | 'scroll';
  showWaterLoops?: boolean;
  onComponentSelect?: (component: ChillerComponent) => void;
}

// ============================================
// COMPONENT DATA
// ============================================

const CHILLER_COMPONENTS: ChillerComponent[] = [
  {
    id: 'compressor',
    name: 'Compressor',
    shortDesc: 'The heart of the chiller - increases refrigerant pressure and temperature',
    engineerDetail: `The compressor is the mechanical driver of the refrigeration cycle. It receives low-pressure, low-temperature refrigerant vapor from the evaporator and compresses it to high pressure and temperature.

**Compression Types:**
- **Centrifugal**: Uses high-speed impeller (3,600-10,000 RPM) for large capacity (200-5,000+ tons)
- **Screw**: Twin helical rotors, excellent part-load efficiency (50-500 tons)
- **Scroll**: Orbiting scroll pairs, ideal for small systems (5-150 tons)

**Key Efficiency Factor:**
Compressor work = function of (pressure ratio) = function of (lift)
Lower lift = less compressor work = better efficiency`,
    salesDetail: `**The Sales Angle:**
The compressor is where 90%+ of chiller energy goes. When you're talking about kW/ton or IPLV, you're really talking about compressor efficiency.

**Key Selling Points:**
- Variable-speed (VFD) compressors: 20-35% better than fixed-speed at part load
- Magnetic-bearing compressors: Oil-free, quietest, most efficient (0.30-0.40 kW/ton)
- Part-load matters most: Ask "What's your IPLV?" not just full-load efficiency

**The Pitch:**
"Your compressor is running 2,000+ hours per year. A 0.1 kW/ton improvement = $10,000+ annual savings on a 500-ton system."`,
    specs: [
      { label: 'Power Range', value: '50 - 2,000+ kW' },
      { label: 'Efficiency Impact', value: '90%+ of chiller energy' },
      { label: 'Types', value: 'Centrifugal, Screw, Scroll' },
      { label: 'VFD Savings', value: '20-35% at part load' },
    ],
    tips: [
      'Listen for unusual sounds - bearing wear shows up as high-pitched whine',
      'Check oil level weekly on oil-lubricated units',
      'VFD compressors should NOT short cycle - check staging logic',
      'Magnetic-bearing = no oil maintenance, but requires clean power',
    ],
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: 'condenser',
    name: 'Condenser',
    shortDesc: 'Rejects heat from refrigerant to condenser water (or air)',
    engineerDetail: `The condenser is where heat is rejected from the refrigeration cycle. High-pressure, high-temperature refrigerant vapor enters and condenses to liquid by transferring heat to the cooling medium.

**Heat Transfer:**
Q_condenser = Q_evaporator + W_compressor
(Condenser must reject evaporator load PLUS compressor work)

**Condenser Types:**
- **Shell-and-tube**: Water flows through tubes, refrigerant condenses on outside. Most common for water-cooled.
- **Air-cooled**: Finned coils with fans. No cooling tower needed but lower efficiency.

**Key Optimization:**
- Lower condenser temperature = lower lift = less compressor work
- Every 1°F reduction in condenser temp saves ~1.5-2% energy
- Target: 75-80°F leaving water (vs typical 85°F)`,
    salesDetail: `**The Sales Angle:**
The condenser is where you reject heat. Colder condenser = less work for compressor = lower energy bill.

**Key Selling Points:**
- Fouled tubes are money leaking: 10-30% efficiency loss
- Lower condenser water temp = instant savings (free!)
- VFD tower fans enable lower CW temps

**The Pitch:**
"Your condenser is running at 85°F. If we drop that to 75°F, you save 15-20% on chiller energy. That's $20,000/year on a 500-ton system. The VFD tower fans pay for themselves in 2 years."

**The Hook:**
Touch the condenser pipes. If they're scorching hot (>100°F), that's wasted energy going to the tower.`,
    specs: [
      { label: 'Temperature Range', value: '75-95°F typical' },
      { label: 'Approach', value: '3-5°F (refrigerant to water)' },
      { label: 'Fouling Impact', value: '10-30% efficiency loss' },
      { label: 'Optimization Savings', value: '1.5-2% per °F reduction' },
    ],
    tips: [
      'Annual tube cleaning is essential - schedule in shoulder season',
      'Check approach temperature: >5°F means fouling or poor flow',
      'Condenser water flow should be constant - check strainer ΔP',
      'Eddy current testing reveals tube wall thinning before failure',
    ],
    icon: <Thermometer className="w-5 h-5" />,
  },
  {
    id: 'evaporator',
    name: 'Evaporator',
    shortDesc: 'Absorbs heat from chilled water into refrigerant',
    engineerDetail: `The evaporator is where useful cooling happens. Low-pressure liquid refrigerant enters and evaporates (boils) by absorbing heat from the chilled water loop.

**Heat Transfer:**
Q_evap = m_dot × c_p × ΔT_chilled_water
Where ΔT is typically 10-14°F (e.g., 54°F return → 42°F supply)

**Key Optimization:**
- Higher evaporator temperature = higher refrigerant pressure = less lift
- Every 1°F increase in CHW supply saves ~1.5-2% energy
- But: Too high = inadequate cooling or dehumidification

**Design Considerations:**
- Flooded evaporator: Refrigerant surrounds tubes (better heat transfer)
- DX evaporator: Refrigerant inside tubes (simpler, smaller)
- Approach temperature: 2-4°F (CHW leaving - refrigerant temp)`,
    salesDetail: `**The Sales Angle:**
The evaporator makes the cold water that cools your building. Warmer = cheaper to make.

**Key Selling Points:**
- Most buildings run 42°F when 46-48°F would work fine
- Each degree warmer = 1.5-2% savings (free!)
- Combined with condenser optimization = 20-25% total savings

**The Pitch:**
"You're making 42°F water right now. Your building would be perfectly comfortable with 46°F water. That 4°F difference saves you 8% on chiller energy - about $8,000/year - and costs nothing to change."

**Objection Handler:**
"Won't it be too warm?" → "We'll raise it 1°F per week and monitor comfort. If anyone complains, we back off. Worst case: we go back to 42°F. Best case: you save 8% forever."`,
    specs: [
      { label: 'CHW Temperature', value: '42-48°F typical' },
      { label: 'ΔT', value: '10-14°F (design)' },
      { label: 'Approach', value: '2-4°F (CHW to refrigerant)' },
      { label: 'Optimization Savings', value: '1.5-2% per °F increase' },
    ],
    tips: [
      'Low ΔT (<10°F) means over-pumping or fouled coils',
      'Check for refrigerant charge - low charge = poor evaporator performance',
      'Freeze protection: Never run CHW below 38°F without glycol',
      'Evaporator approach >4°F indicates fouling or low refrigerant',
    ],
    icon: <Droplets className="w-5 h-5" />,
  },
  {
    id: 'expansion-valve',
    name: 'Expansion Device',
    shortDesc: 'Reduces refrigerant pressure, enabling evaporation',
    engineerDetail: `The expansion device is a restriction that drops refrigerant pressure from condenser pressure to evaporator pressure. This pressure drop causes the refrigerant to cool dramatically and partially flash to vapor.

**Types:**
- **TXV (Thermostatic Expansion Valve)**: Mechanical, responds to superheat
- **EEV (Electronic Expansion Valve)**: Precise control, better part-load
- **Orifice**: Fixed restriction, simple but limited control

**Thermodynamics:**
- Isenthalpic process (constant enthalpy)
- Entering: High-pressure liquid (~95°F)
- Leaving: Low-pressure two-phase mixture (~40°F)
- Flash gas: ~15-25% of refrigerant flashes to vapor

**Control Impact:**
Proper superheat control (6-12°F) ensures:
- Evaporator is fully utilized (no liquid return to compressor)
- Maximum efficiency (not wasting evaporator surface)`,
    salesDetail: `**The Sales Angle:**
The expansion valve is like the throttle in your car - it controls how much refrigerant flows through the system.

**Key Selling Points:**
- EEV (electronic) upgrade: Better part-load control, 5-10% efficiency gain
- Old TXV hunting = wasted energy and poor comfort
- Modern chillers have EEV standard

**The Pitch:**
"This is a small component with big impact. If your expansion valve is hunting (cycling), you're wasting energy and wearing out the compressor. An EEV retrofit is typically $5,000-10,000 with 2-3 year payback."

**Field Tip:**
If superheat is erratic (jumping around), the expansion valve is failing.`,
    specs: [
      { label: 'Types', value: 'TXV, EEV, Orifice' },
      { label: 'Superheat Target', value: '6-12°F' },
      { label: 'Flash Gas', value: '15-25% typical' },
      { label: 'EEV Upgrade Savings', value: '5-10% efficiency' },
    ],
    tips: [
      'Check superheat at evaporator outlet: 6-12°F is target',
      'High superheat = valve too restricted or low charge',
      'Low/negative superheat = flooding, compressor damage risk',
      'EEV motor failure = stuck valve = no cooling or flooded compressor',
    ],
    icon: <Gauge className="w-5 h-5" />,
  },
  {
    id: 'cooling-tower',
    name: 'Cooling Tower',
    shortDesc: 'Rejects condenser heat to atmosphere via evaporation',
    engineerDetail: `The cooling tower uses evaporative cooling to reject heat from condenser water to the atmosphere. About 1% of water evaporates for every 10°F of cooling, which is far more effective than sensible (air) cooling.

**Performance Metrics:**
- **Approach**: Leaving water temp - Wet bulb temp (Target: 5-7°F)
- **Range**: Entering - Leaving water temp (Typical: 10-15°F)
- **Effectiveness**: Range / (Range + Approach)

**Optimization Strategies:**
1. VFD on fans (biggest impact): 30-50% fan energy savings
2. Lower setpoint: 75-80°F vs 85°F default
3. Optimal staging: Run more cells at lower speed
4. Water treatment: Prevent scaling and biological growth

**Energy Impact:**
Lower tower water temp → Lower condenser temp → Less chiller work
Every 1°F colder water = 1.5-2% chiller savings`,
    salesDetail: `**The Sales Angle:**
The cooling tower is your secret weapon for chiller savings. Colder tower water = less work for the chiller.

**Key Selling Points:**
- VFD on tower fans: 2-year payback, 30-50% fan savings PLUS 10-15% chiller savings
- Most towers run at 85°F when 75°F is possible
- Combined savings: $15,000-30,000/year on 500-ton system

**The Pitch:**
"Your tower fans are running full speed 24/7 wasting energy when a VFD could run them at 30% speed most of the time. AND the colder water makes your chiller more efficient. Two savings for the price of one."

**The Close:**
"VFD tower fans are the single best ROI in a chiller plant. 1-2 year payback, guaranteed."`,
    specs: [
      { label: 'Approach Target', value: '5-7°F to wet bulb' },
      { label: 'Range', value: '10-15°F typical' },
      { label: 'VFD Savings', value: '30-50% fan + 10-15% chiller' },
      { label: 'Setpoint', value: '75-80°F optimal' },
    ],
    tips: [
      'Check approach temperature monthly - rising approach = fouled fill',
      'Clean fill media annually - pressure wash or chemical clean',
      'Water treatment is critical - scaling kills efficiency',
      'Basin heaters are often left on year-round - add controls',
    ],
    icon: <Wind className="w-5 h-5" />,
  },
];

// ============================================
// ANIMATED CHILLER SVG
// ============================================

const ChillerSVG: React.FC<{
  onComponentClick: (id: string) => void;
  selectedId: string | null;
}> = ({ onComponentClick, selectedId }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  const isActive = (id: string) => selectedId === id || hoveredId === id;
  
  return (
    <svg viewBox="0 0 800 500" className="w-full h-auto">
      {/* Background */}
      <defs>
        <pattern id="schematic-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
        </pattern>
        
        {/* Flow animation */}
        <marker id="flow-arrow" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" />
        </marker>
      </defs>
      
      <rect width="800" height="500" fill="url(#schematic-grid)" />
      
      {/* Title */}
      <text x="400" y="30" textAnchor="middle" className="text-lg font-bold fill-gray-800">
        Water-Cooled Chiller System - Click Components to Explore
      </text>
      
      {/* ===== PIPING ===== */}
      
      {/* Hot gas line (Compressor to Condenser) - RED */}
      <path
        d="M 240 200 Q 300 200 300 140 Q 300 100 400 100"
        fill="none"
        stroke="#ef4444"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <g>
        <circle r="6" fill="#fca5a5">
          <animateMotion dur="2s" repeatCount="indefinite">
            <mpath href="#hot-gas-path" />
          </animateMotion>
        </circle>
      </g>
      <path id="hot-gas-path" d="M 240 200 Q 300 200 300 140 Q 300 100 400 100" fill="none" stroke="none" />
      
      {/* Liquid line (Condenser to Expansion) - RED to AMBER */}
      <path
        d="M 560 100 Q 620 100 620 180 Q 620 250 560 250"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="8"
        strokeLinecap="round"
      />
      
      {/* Cold liquid (Expansion to Evaporator) - BLUE */}
      <path
        d="M 480 250 Q 400 250 400 320 Q 400 380 280 380"
        fill="none"
        stroke="#3b82f6"
        strokeWidth="8"
        strokeLinecap="round"
      />
      
      {/* Suction line (Evaporator to Compressor) - BLUE */}
      <path
        d="M 160 320 Q 100 320 100 260 Q 100 200 160 200"
        fill="none"
        stroke="#60a5fa"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <g>
        <circle r="6" fill="#93c5fd">
          <animateMotion dur="2.5s" repeatCount="indefinite">
            <mpath href="#suction-path" />
          </animateMotion>
        </circle>
      </g>
      <path id="suction-path" d="M 160 320 Q 100 320 100 260 Q 100 200 160 200" fill="none" stroke="none" />
      
      {/* Condenser water in/out */}
      <path d="M 400 60 L 400 80" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
      <path d="M 560 60 L 560 80" stroke="#f97316" strokeWidth="6" strokeLinecap="round" />
      <text x="400" y="50" textAnchor="middle" className="text-xs fill-red-600">CW In (85°F)</text>
      <text x="560" y="50" textAnchor="middle" className="text-xs fill-orange-600">CW Out (95°F)</text>
      
      {/* Chilled water in/out */}
      <path d="M 280 420 L 280 400" stroke="#60a5fa" strokeWidth="6" strokeLinecap="round" />
      <path d="M 160 420 L 160 400" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" />
      <text x="280" y="440" textAnchor="middle" className="text-xs fill-blue-400">CHW Return (54°F)</text>
      <text x="160" y="440" textAnchor="middle" className="text-xs fill-blue-600">CHW Supply (42°F)</text>
      
      {/* ===== COMPRESSOR ===== */}
      <g
        onClick={() => onComponentClick('compressor')}
        onMouseEnter={() => setHoveredId('compressor')}
        onMouseLeave={() => setHoveredId(null)}
        className="cursor-pointer"
      >
        <rect
          x="160"
          y="170"
          width="80"
          height="60"
          rx="8"
          fill={isActive('compressor') ? '#dbeafe' : '#1f2937'}
          stroke={isActive('compressor') ? '#3b82f6' : '#374151'}
          strokeWidth={isActive('compressor') ? 3 : 2}
        />
        <ellipse
          cx="200"
          cy="200"
          rx="25"
          ry="15"
          fill="#374151"
        />
        <ellipse cx="200" cy="200" rx="15" ry="8" fill="#60a5fa">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite" />
        </ellipse>
        <text x="200" y="250" textAnchor="middle" className="text-xs font-semibold fill-gray-700">
          COMPRESSOR
        </text>
        {isActive('compressor') && (
          <rect x="155" y="165" width="90" height="70" rx="10" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4,4">
            <animate attributeName="stroke-dashoffset" values="0;8" dur="0.5s" repeatCount="indefinite" />
          </rect>
        )}
      </g>
      
      {/* ===== CONDENSER ===== */}
      <g
        onClick={() => onComponentClick('condenser')}
        onMouseEnter={() => setHoveredId('condenser')}
        onMouseLeave={() => setHoveredId(null)}
        className="cursor-pointer"
      >
        <rect
          x="400"
          y="80"
          width="160"
          height="50"
          rx="8"
          fill={isActive('condenser') ? '#fee2e2' : '#fef2f2'}
          stroke={isActive('condenser') ? '#ef4444' : '#fca5a5'}
          strokeWidth={isActive('condenser') ? 3 : 2}
        />
        {/* Tubes */}
        {[0.25, 0.5, 0.75].map((r, i) => (
          <line key={i} x1="420" y1={80 + 50 * r} x2="540" y2={80 + 50 * r} stroke="#ef4444" strokeWidth="3" opacity="0.5" />
        ))}
        <text x="480" y="150" textAnchor="middle" className="text-xs font-semibold fill-gray-700">
          CONDENSER
        </text>
        {/* Heat arrows */}
        {[0.3, 0.5, 0.7].map((r, i) => (
          <g key={i} transform={`translate(${400 + 160 * r}, 70)`}>
            <path d="M0,0 L4,-8 L-4,-8 Z" fill="#ef4444">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
            </path>
          </g>
        ))}
        {isActive('condenser') && (
          <rect x="395" y="75" width="170" height="60" rx="10" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4,4">
            <animate attributeName="stroke-dashoffset" values="0;8" dur="0.5s" repeatCount="indefinite" />
          </rect>
        )}
      </g>
      
      {/* ===== EXPANSION VALVE ===== */}
      <g
        onClick={() => onComponentClick('expansion-valve')}
        onMouseEnter={() => setHoveredId('expansion-valve')}
        onMouseLeave={() => setHoveredId(null)}
        className="cursor-pointer"
      >
        <path
          d="M 480 230 L 560 250 L 560 270 L 480 290 Z"
          fill={isActive('expansion-valve') ? '#fef3c7' : '#fefce8'}
          stroke={isActive('expansion-valve') ? '#f59e0b' : '#fcd34d'}
          strokeWidth={isActive('expansion-valve') ? 3 : 2}
        />
        <circle cx="520" cy="260" r="5" fill="#f59e0b">
          <animate attributeName="r" values="3;6;3" dur="0.5s" repeatCount="indefinite" />
        </circle>
        <text x="520" y="310" textAnchor="middle" className="text-xs font-semibold fill-gray-700">
          EXPANSION
        </text>
        <text x="520" y="322" textAnchor="middle" className="text-xs font-semibold fill-gray-700">
          VALVE
        </text>
        {isActive('expansion-valve') && (
          <rect x="475" y="225" width="90" height="70" rx="10" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4,4">
            <animate attributeName="stroke-dashoffset" values="0;8" dur="0.5s" repeatCount="indefinite" />
          </rect>
        )}
      </g>
      
      {/* ===== EVAPORATOR ===== */}
      <g
        onClick={() => onComponentClick('evaporator')}
        onMouseEnter={() => setHoveredId('evaporator')}
        onMouseLeave={() => setHoveredId(null)}
        className="cursor-pointer"
      >
        <rect
          x="160"
          y="340"
          width="160"
          height="50"
          rx="8"
          fill={isActive('evaporator') ? '#dbeafe' : '#eff6ff'}
          stroke={isActive('evaporator') ? '#3b82f6' : '#93c5fd'}
          strokeWidth={isActive('evaporator') ? 3 : 2}
        />
        {/* Tubes */}
        {[0.25, 0.5, 0.75].map((r, i) => (
          <line key={i} x1="180" y1={340 + 50 * r} x2="300" y2={340 + 50 * r} stroke="#3b82f6" strokeWidth="3" opacity="0.5" />
        ))}
        <text x="240" y="410" textAnchor="middle" className="text-xs font-semibold fill-gray-700">
          EVAPORATOR
        </text>
        {isActive('evaporator') && (
          <rect x="155" y="335" width="170" height="60" rx="10" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4,4">
            <animate attributeName="stroke-dashoffset" values="0;8" dur="0.5s" repeatCount="indefinite" />
          </rect>
        )}
      </g>
      
      {/* ===== COOLING TOWER ===== */}
      <g
        onClick={() => onComponentClick('cooling-tower')}
        onMouseEnter={() => setHoveredId('cooling-tower')}
        onMouseLeave={() => setHoveredId(null)}
        className="cursor-pointer"
        transform="translate(650, 150)"
      >
        <path
          d="M 10 120 L 25 0 L 85 0 L 100 120 Z"
          fill={isActive('cooling-tower') ? '#f3f4f6' : '#f9fafb'}
          stroke={isActive('cooling-tower') ? '#6b7280' : '#9ca3af'}
          strokeWidth={isActive('cooling-tower') ? 3 : 2}
        />
        {/* Fan */}
        <circle cx="55" cy="15" r="18" fill="#e5e7eb" stroke="#6b7280" strokeWidth="2" />
        <g transform="translate(55, 15)">
          {[0, 90, 180, 270].map((a, i) => (
            <rect key={i} x="-2" y="-14" width="4" height="12" fill="#374151" transform={`rotate(${a})`} />
          ))}
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="1.5s" repeatCount="indefinite" />
        </g>
        {/* Water droplets */}
        {[25, 55, 85].map((x, i) => (
          <circle key={i} cx={x} cy="50" r="3" fill="#60a5fa">
            <animate attributeName="cy" values="40;100;40" dur="2s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.3;1" dur="2s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
          </circle>
        ))}
        {/* Basin */}
        <rect x="0" y="110" width="110" height="15" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" rx="2" />
        <text x="55" y="145" textAnchor="middle" className="text-xs font-semibold fill-gray-700">
          COOLING TOWER
        </text>
        {isActive('cooling-tower') && (
          <rect x="-5" y="-5" width="120" height="135" rx="10" fill="none" stroke="#6b7280" strokeWidth="2" strokeDasharray="4,4">
            <animate attributeName="stroke-dashoffset" values="0;8" dur="0.5s" repeatCount="indefinite" />
          </rect>
        )}
      </g>
      
      {/* Tower piping */}
      <path d="M 560 60 Q 600 60 600 100 Q 600 150 650 150" stroke="#f97316" strokeWidth="4" fill="none" />
      <path d="M 650 270 Q 600 270 600 200 Q 600 140 480 140 Q 400 140 400 80" stroke="#ef4444" strokeWidth="4" fill="none" />
      
      {/* Legend */}
      <g transform="translate(20, 460)">
        <rect x="0" y="0" width="400" height="30" fill="white" fillOpacity="0.9" rx="4" stroke="#e5e7eb" />
        <circle cx="20" cy="15" r="6" fill="#ef4444" />
        <text x="35" y="19" className="text-xs fill-gray-600">High Pressure Hot</text>
        <circle cx="140" cy="15" r="6" fill="#f59e0b" />
        <text x="155" y="19" className="text-xs fill-gray-600">Transition</text>
        <circle cx="240" cy="15" r="6" fill="#3b82f6" />
        <text x="255" y="19" className="text-xs fill-gray-600">Low Pressure Cold</text>
        <circle cx="360" cy="15" r="6" fill="#60a5fa" />
        <text x="375" y="19" className="text-xs fill-gray-600">Suction</text>
      </g>
    </svg>
  );
};

// ============================================
// COMPONENT DETAIL PANEL
// ============================================

const ComponentDetailPanel: React.FC<{
  component: ChillerComponent;
  onClose: () => void;
}> = ({ component, onClose }) => {
  const [activeTab, setActiveTab] = useState<'engineer' | 'sales'>('engineer');
  
  // Parse sales detail into sections
  const parseSalesContent = (content: string) => {
    const sections: { title: string; content: string; type: 'pitch' | 'objection' | 'hook' | 'general' }[] = [];
    const lines = content.split('\n');
    let currentSection = { title: '', content: '', type: 'general' as const };
    
    lines.forEach(line => {
      if (line.startsWith('**The Sales Angle:**') || line.startsWith('**Key Selling Points:**')) {
        if (currentSection.content) sections.push({ ...currentSection });
        currentSection = { title: 'Sales Angle', content: '', type: 'general' };
      } else if (line.startsWith('**The Pitch:**')) {
        if (currentSection.content) sections.push({ ...currentSection });
        currentSection = { title: 'The Pitch', content: '', type: 'pitch' };
      } else if (line.startsWith('**The Hook:**') || line.startsWith('**The Close:**')) {
        if (currentSection.content) sections.push({ ...currentSection });
        currentSection = { title: line.replace(/\*\*/g, '').replace(':', ''), content: '', type: 'hook' };
      } else if (line.startsWith('**Objection Handler:**')) {
        if (currentSection.content) sections.push({ ...currentSection });
        currentSection = { title: 'Objection Handler', content: '', type: 'objection' };
      } else {
        currentSection.content += line + '\n';
      }
    });
    if (currentSection.content) sections.push(currentSection);
    return sections;
  };
  
  const salesSections = parseSalesContent(component.salesDetail);
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 shadow-lg">
              {component.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">{component.name}</h3>
              <p className="text-blue-100 text-sm mt-0.5">{component.shortDesc}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-all hover:scale-110">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Enhanced Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setActiveTab('engineer')}
          className={`flex-1 py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'engineer'
              ? 'text-blue-600 border-b-3 border-blue-600 bg-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Zap className="w-4 h-4" />
          Engineering Deep Dive
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex-1 py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'sales'
              ? 'text-emerald-600 border-b-3 border-emerald-600 bg-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Sales Playbook
        </button>
      </div>
      
      {/* Content */}
      <div className="p-5 max-h-[450px] overflow-y-auto bg-gradient-to-b from-white to-gray-50">
        {activeTab === 'engineer' ? (
          <div className="space-y-4">
            {/* Engineering content with better formatting */}
            <div className="prose prose-sm max-w-none">
              <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                {component.engineerDetail}
              </div>
            </div>
            
            {/* Specs Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                Key Specifications
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {component.specs.map((spec, i) => (
                  <div key={i} className="bg-white rounded-lg p-2.5 shadow-sm border border-blue-100">
                    <div className="text-xs text-blue-600 font-medium">{spec.label}</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">{spec.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick Win Banner */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold">Quick Win Opportunity</h4>
                  <p className="text-emerald-100 text-sm">This component offers high-value optimization potential</p>
                </div>
              </div>
            </div>
            
            {/* Sales sections with enhanced styling */}
            {salesSections.map((section, i) => (
              <div key={i} className={`rounded-xl p-4 border ${
                section.type === 'pitch' 
                  ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200' 
                  : section.type === 'objection'
                  ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
                  : section.type === 'hook'
                  ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'
                  : 'bg-white border-gray-200'
              }`}>
                <h4 className={`text-sm font-bold mb-2 flex items-center gap-2 ${
                  section.type === 'pitch' ? 'text-amber-800' :
                  section.type === 'objection' ? 'text-red-800' :
                  section.type === 'hook' ? 'text-purple-800' :
                  'text-gray-800'
                }`}>
                  {section.type === 'pitch' && <MessageSquare className="w-4 h-4" />}
                  {section.type === 'objection' && <AlertTriangle className="w-4 h-4" />}
                  {section.type === 'hook' && <Lightbulb className="w-4 h-4" />}
                  {section.title}
                </h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {section.content.replace(/\*\*/g, '').trim()}
                </div>
              </div>
            ))}
            
            {/* Key selling points as pills */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Key Value Props
              </h4>
              <div className="flex flex-wrap gap-2">
                {component.specs.map((spec, i) => (
                  <span key={i} className="px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
                    {spec.label}: {spec.value}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Field Tips - Always visible */}
        <div className="mt-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 text-white">
          <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            Field Tips from the Pros
          </h4>
          <ul className="space-y-2">
            {component.tips.map((tip, i) => (
              <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                <span className="text-amber-400 mt-0.5 flex-shrink-0">▸</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const InteractiveChillerDiagram: React.FC<InteractiveChillerDiagramProps> = ({
  title = 'Interactive Chiller System Diagram',
  onComponentSelect,
}) => {
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  
  const selectedComponent = CHILLER_COMPONENTS.find(c => c.id === selectedComponentId);
  
  const handleComponentClick = (id: string) => {
    setSelectedComponentId(id);
    const component = CHILLER_COMPONENTS.find(c => c.id === id);
    if (component && onComponentSelect) {
      onComponentSelect(component);
    }
  };
  
  return (
    <div className="interactive-chiller-diagram">
      {title && (
        <div className="mb-6 flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 rotate-3 hover:rotate-0 transition-transform">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">Click on any component to learn more about it</p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Diagram */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <ChillerSVG
            onComponentClick={handleComponentClick}
            selectedId={selectedComponentId}
          />
        </div>
        
        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedComponent ? (
            <ComponentDetailPanel
              component={selectedComponent}
              onClose={() => setSelectedComponentId(null)}
            />
          ) : (
            <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 border border-blue-700 rounded-xl p-6 text-center h-full flex flex-col items-center justify-center relative overflow-hidden shadow-xl">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
                      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid-pattern)" />
                </svg>
              </div>
              
              {/* Animated rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border border-blue-500/20 rounded-full animate-pulse" />
                <div className="absolute w-48 h-48 border border-blue-400/30 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
              </div>
              
              <div className="relative z-10">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-5 mx-auto shadow-lg shadow-blue-500/30 rotate-3 hover:rotate-0 transition-transform">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Explore the Chiller System</h3>
                <p className="text-sm text-blue-200 mb-6 max-w-xs mx-auto">
                  Click any component in the diagram to unlock engineering specs, sales playbooks, and field tips
                </p>
                
                {/* Quick start buttons */}
                <div className="space-y-3">
                  <p className="text-xs text-blue-300 font-medium uppercase tracking-wider">Quick Start</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {CHILLER_COMPONENTS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleComponentClick(c.id)}
                        className="group px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-xs font-medium text-white hover:bg-white hover:text-blue-900 transition-all hover:scale-105 hover:shadow-lg flex items-center gap-2"
                      >
                        <span className="w-5 h-5 flex items-center justify-center opacity-60 group-hover:opacity-100">
                          {c.icon}
                        </span>
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Stats teaser */}
                <div className="mt-6 pt-5 border-t border-white/10">
                  <div className="flex items-center justify-center gap-6 text-xs text-blue-200">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">5</div>
                      <div>Components</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-400">20+</div>
                      <div>Sales Tips</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-400">15+</div>
                      <div>Field Tips</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractiveChillerDiagram;
