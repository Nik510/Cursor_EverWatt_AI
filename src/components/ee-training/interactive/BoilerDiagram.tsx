/**
 * BoilerDiagram Component
 * Interactive animated condensing boiler diagram with component exploration
 */

import React, { useState } from 'react';
import { X, Flame, Droplets, Wind, Thermometer, Gauge, Zap, TrendingUp } from 'lucide-react';

interface BoilerComponent {
  id: string;
  name: string;
  shortDesc: string;
  x: number;
  y: number;
  width: number;
  height: number;
  engineering: {
    function: string;
    specs: string[];
    efficiency: string;
  };
  sales: {
    pitch: string;
    savingsImpact: string;
    talkingPoint: string;
  };
  icon: React.ReactNode;
}

export interface BoilerDiagramProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

const boilerComponents: BoilerComponent[] = [
  {
    id: 'burner',
    name: 'Modulating Burner',
    shortDesc: 'Variable-fire gas burner',
    x: 50,
    y: 200,
    width: 100,
    height: 60,
    engineering: {
      function: 'Combusts natural gas with precisely controlled air-fuel ratio. Modulating burners adjust firing rate from 10-100% to match load.',
      specs: ['Turndown ratio: 10:1', 'NOx emissions: < 20 ppm', 'Fuel: Natural gas or propane'],
      efficiency: 'Modulation prevents cycling losses (2-5% savings vs. on/off)',
    },
    sales: {
      pitch: 'The modulating burner is like cruise control for your boiler - it adjusts output to exactly match what you need.',
      savingsImpact: '5-10% efficiency gain vs. single-stage',
      talkingPoint: 'Fewer cycles means less wear and longer equipment life.',
    },
    icon: <Flame className="w-5 h-5" />,
  },
  {
    id: 'primary-exchanger',
    name: 'Primary Heat Exchanger',
    shortDesc: 'High-temperature heat transfer',
    x: 50,
    y: 100,
    width: 120,
    height: 80,
    engineering: {
      function: 'Transfers heat from combustion gases (1800°F+) to water. Stainless steel construction for condensing operation.',
      specs: ['Material: 316 stainless steel', 'Surface area: 15-25 sq ft/100 MBH', 'Approach temp: 20-40°F'],
      efficiency: 'Primary exchanger captures 80-85% of combustion heat.',
    },
    sales: {
      pitch: 'The stainless steel heat exchanger is built to last 25+ years and handles condensing operation.',
      savingsImpact: 'Foundation of high efficiency',
      talkingPoint: 'Quality construction means reliability you can count on.',
    },
    icon: <Thermometer className="w-5 h-5" />,
  },
  {
    id: 'secondary-exchanger',
    name: 'Secondary/Condensing Exchanger',
    shortDesc: 'Recovers latent heat',
    x: 200,
    y: 100,
    width: 120,
    height: 80,
    engineering: {
      function: 'Cools flue gases below 130°F dew point, condensing water vapor and recovering latent heat.',
      specs: ['Latent heat recovery: 10-15%', 'Condensate: ~0.5 gal/therm', 'pH: 3.5-4.5 (acidic)'],
      efficiency: 'The SECRET to 95%+ efficiency. Only works with return water < 130°F.',
    },
    sales: {
      pitch: 'This is the magic component - it captures heat that older boilers send up the chimney.',
      savingsImpact: '10-15% additional efficiency',
      talkingPoint: 'Every dollar your old boiler wastes, this captures 15 cents back.',
    },
    icon: <Droplets className="w-5 h-5" />,
  },
  {
    id: 'flue',
    name: 'Direct Vent/Flue',
    shortDesc: 'Exhaust and combustion air',
    x: 200,
    y: 30,
    width: 80,
    height: 50,
    engineering: {
      function: 'Exhausts flue gases (120-150°F) and brings in combustion air. PVC/CPVC for condensing, stainless for non-condensing.',
      specs: ['Material: PVC (condensing)', 'Max length: 100-150 ft', 'Temp: 120-150°F'],
      efficiency: 'Cool exhaust = evidence of condensing operation.',
    },
    sales: {
      pitch: 'The PVC vent pipe is a sign of efficiency - old boilers need expensive stainless because exhaust is too hot.',
      savingsImpact: 'Lower installation cost',
      talkingPoint: 'Simple venting means more flexibility in boiler location.',
    },
    icon: <Wind className="w-5 h-5" />,
  },
  {
    id: 'condensate',
    name: 'Condensate Drain',
    shortDesc: 'Drains acidic condensate',
    x: 300,
    y: 180,
    width: 80,
    height: 40,
    engineering: {
      function: 'Collects and neutralizes acidic condensate before drain. Condensate is slightly acidic (pH 3.5-4.5).',
      specs: ['Flow: 0.5 gal/therm', 'Neutralizer: Limestone chips', 'Must drain by gravity or pump'],
      efficiency: 'Essential for condensing operation.',
    },
    sales: {
      pitch: 'Yes, there is a drain - but it is simple to install and a small price for 15% more efficiency.',
      savingsImpact: 'Enables condensing mode',
      talkingPoint: 'We include the neutralizer kit - it is just a small maintenance item every few years.',
    },
    icon: <Droplets className="w-5 h-5" />,
  },
  {
    id: 'controls',
    name: 'Digital Controls',
    shortDesc: 'Modulation and reset control',
    x: 350,
    y: 100,
    width: 80,
    height: 60,
    engineering: {
      function: 'Controls burner modulation, outdoor reset, sequencing, and diagnostics. Often BMS-integrated.',
      specs: ['Protocols: BACnet, Modbus, LON', 'OAT reset: Included', 'Cascading: Up to 8 boilers'],
      efficiency: 'Outdoor reset can save 5-10% additional.',
    },
    sales: {
      pitch: 'Built-in smart controls automatically adjust output and implement reset strategies.',
      savingsImpact: '5-10% from reset',
      talkingPoint: 'Set it and forget it - or connect to your BMS for full visibility.',
    },
    icon: <Gauge className="w-5 h-5" />,
  },
];

const ComponentDetailPanel: React.FC<{
  component: BoilerComponent;
  onClose: () => void;
}> = ({ component, onClose }) => {
  const [activeTab, setActiveTab] = useState<'engineering' | 'sales'>('engineering');

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-amber-500 text-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              {component.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold">{component.name}</h3>
              <p className="text-orange-100 text-sm">{component.shortDesc}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('engineering')}
          className={`flex-1 py-3 text-sm font-medium transition-all ${
            activeTab === 'engineering'
              ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🔧 Engineering
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex-1 py-3 text-sm font-medium transition-all ${
            activeTab === 'sales'
              ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          💼 Sales
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        {activeTab === 'engineering' ? (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Function</h4>
              <p className="text-sm text-gray-600">{component.engineering.function}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Specifications</h4>
              <ul className="space-y-1">
                {component.engineering.specs.map((spec, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                    {spec}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-semibold text-orange-700">Efficiency Impact</span>
              </div>
              <p className="text-sm text-orange-600">{component.engineering.efficiency}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
              <h4 className="text-sm font-semibold text-orange-700 mb-2">💬 The Pitch</h4>
              <p className="text-sm text-gray-700 italic">"{component.sales.pitch}"</p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <span className="text-xs text-green-600 uppercase tracking-wider">Savings Impact</span>
                <p className="text-sm font-semibold text-green-700">{component.sales.savingsImpact}</p>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Talking Point</h4>
              <p className="text-sm text-gray-600">{component.sales.talkingPoint}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const BoilerDiagram: React.FC<BoilerDiagramProps> = ({
  title = 'Condensing Boiler System',
  subtitle = 'Click on components to learn more',
  className = '',
}) => {
  const [selectedComponent, setSelectedComponent] = useState<BoilerComponent | null>(null);

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-orange-500 via-red-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
          <Flame className="w-7 h-7 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* SVG Diagram */}
        <div className="flex-1 relative bg-gradient-to-br from-orange-50 via-gray-50 to-amber-50 rounded-xl p-4 min-h-[400px]">
          <svg viewBox="0 0 500 300" className="w-full h-full">
            {/* Boiler body */}
            <rect x="30" y="80" width="280" height="200" rx="10" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="2" />
            
            {/* Combustion chamber */}
            <rect x="45" y="180" width="110" height="80" rx="5" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2">
              <animate attributeName="fill" values="#fef3c7;#fed7aa;#fef3c7" dur="2s" repeatCount="indefinite" />
            </rect>
            
            {/* Flame animation */}
            <g transform="translate(60, 220)">
              <ellipse cx="40" cy="20" rx="30" ry="15" fill="#f97316" opacity="0.8">
                <animate attributeName="ry" values="15;20;15" dur="0.5s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx="40" cy="15" rx="20" ry="10" fill="#fbbf24">
                <animate attributeName="ry" values="10;15;10" dur="0.3s" repeatCount="indefinite" />
              </ellipse>
            </g>

            {/* Primary heat exchanger */}
            <rect x="45" y="95" width="130" height="75" rx="5" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="2" />
            <path d="M55 110 L165 110 M55 125 L165 125 M55 140 L165 140 M55 155 L165 155" stroke="#6b7280" strokeWidth="2" />

            {/* Secondary/Condensing exchanger */}
            <rect x="190" y="95" width="110" height="75" rx="5" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
            <path d="M200 110 L290 110 M200 125 L290 125 M200 140 L290 140 M200 155 L290 155" stroke="#60a5fa" strokeWidth="2" />
            
            {/* Water droplets (condensing) */}
            <g>
              <circle cx="210" cy="165" r="3" fill="#3b82f6">
                <animate attributeName="cy" values="165;180;165" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="250" cy="160" r="3" fill="#3b82f6">
                <animate attributeName="cy" values="160;185;160" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle cx="280" cy="168" r="3" fill="#3b82f6">
                <animate attributeName="cy" values="168;175;168" dur="2.2s" repeatCount="indefinite" />
              </circle>
            </g>

            {/* Flue */}
            <rect x="200" y="20" width="60" height="70" rx="5" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="2" />
            <text x="230" y="55" textAnchor="middle" className="text-xs fill-gray-500">FLUE</text>

            {/* Condensate drain */}
            <path d="M280 185 L330 185 L330 220 L350 220" stroke="#3b82f6" strokeWidth="3" fill="none" />
            <rect x="350" y="210" width="40" height="30" rx="3" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
            <text x="370" y="228" textAnchor="middle" className="text-[8px] fill-blue-600">DRAIN</text>

            {/* Controls panel */}
            <rect x="340" y="95" width="70" height="55" rx="5" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
            <circle cx="355" cy="110" r="4" fill="#22c55e">
              <animate attributeName="fill" values="#22c55e;#16a34a;#22c55e" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <rect x="365" y="105" width="35" height="10" fill="#1f2937" rx="2" />
            <rect x="350" y="125" width="50" height="15" fill="#e5e7eb" rx="2" />

            {/* Water flow arrows */}
            <g stroke="#3b82f6" strokeWidth="2" fill="none">
              <path d="M430 140 L320 140 L320 120 L180 120" markerEnd="url(#arrowBlue)">
                <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1s" repeatCount="indefinite" />
              </path>
              <path d="M180 150 L320 150 L320 170 L430 170" markerEnd="url(#arrowBlue)">
                <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1s" repeatCount="indefinite" />
              </path>
            </g>

            {/* Arrow markers */}
            <defs>
              <marker id="arrowBlue" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" />
              </marker>
            </defs>

            {/* Labels */}
            <text x="430" y="135" className="text-xs fill-blue-600">Return</text>
            <text x="430" y="175" className="text-xs fill-blue-600">Supply</text>

            {/* Clickable hotspots */}
            {boilerComponents.map((comp) => (
              <rect
                key={comp.id}
                x={comp.x}
                y={comp.y}
                width={comp.width}
                height={comp.height}
                fill="transparent"
                stroke={selectedComponent?.id === comp.id ? '#f97316' : 'transparent'}
                strokeWidth="3"
                strokeDasharray="5,5"
                rx="5"
                className="cursor-pointer hover:stroke-orange-400"
                onClick={() => setSelectedComponent(comp)}
              />
            ))}
          </svg>

          {/* Component labels */}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
            {boilerComponents.map((comp) => (
              <button
                key={comp.id}
                onClick={() => setSelectedComponent(comp)}
                className={`text-xs px-2 py-1 rounded-full transition-all ${
                  selectedComponent?.id === comp.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-white border border-gray-300 hover:border-orange-400 text-gray-700'
                }`}
              >
                {comp.name}
              </button>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="w-80">
          {selectedComponent ? (
            <ComponentDetailPanel
              component={selectedComponent}
              onClose={() => setSelectedComponent(null)}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-200 p-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                  <Flame className="w-8 h-8 text-orange-400" />
                </div>
                <h4 className="font-semibold text-gray-700 mb-2">Explore the Boiler</h4>
                <p className="text-sm text-gray-500">
                  Click on any component in the diagram or use the buttons below to learn more.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoilerDiagram;
