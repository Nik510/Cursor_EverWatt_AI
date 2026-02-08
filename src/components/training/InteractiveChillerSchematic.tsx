import React, { useState } from 'react';

interface TooltipData {
  title: string;
  desc: string;
  stats: string;
  style: React.CSSProperties;
}

interface ChillerType {
  id: string;
  name: string;
  efficiency: string;
  description: string;
  application: string;
  color: string;
  details: ChillerTypeDetails;
}

interface InteractiveChillerSchematicProps {
  activeComponent: string | null;
  setActiveComponent: (id: string | null) => void;
  tooltipData: Record<string, TooltipData>;
}

interface ChillerTypeDetails {
  compressorType: string;
  internalStructure: 'centrifugal' | 'positive-displacement' | 'absorption';
  compressorVisible: boolean;
  compressorStyle: {
    x: number;
    y: number;
    width: number;
    height: number;
    shape: 'circle' | 'helix' | 'scroll' | 'none';
  };
  keyFeatures: string[];
  differences: string;
  visualIndicator: string;
}

const CHILLER_TYPES: (ChillerType & { details: ChillerTypeDetails })[] = [
  {
    id: 'centrifugal-legacy',
    name: 'Centrifugal (Legacy)',
    efficiency: '0.65 - 0.85 kW/ton',
    description: '20+ year old standard efficiency chillers',
    application: 'Large central plants, 200+ tons',
    color: 'red',
    details: {
      compressorType: 'Centrifugal Compressor (Oil-Lubricated)',
      internalStructure: 'centrifugal',
      compressorVisible: true,
      compressorStyle: {
        x: 420,
        y: 220,
        width: 60,
        height: 30,
        shape: 'circle',
      },
      keyFeatures: [
        'Oil-lubricated bearings (friction)',
        'Fixed speed or limited VFD',
        'Uses R-22 or R-123 refrigerant',
        'Requires oil system maintenance',
        'Good full-load efficiency, poor part-load',
      ],
      differences: 'Uses oil-lubricated bearings that create friction and heat loss. Limited speed control means it runs at full speed even when lightly loaded, wasting energy.',
      visualIndicator: 'Oil pump and lubrication system visible',
    },
  },
  {
    id: 'centrifugal-maglev',
    name: 'Magnetic-Bearing Centrifugal',
    efficiency: '0.30 - 0.40 kW/ton',
    description: 'Modern high-efficiency, oil-free operation',
    application: 'Large central plants, premium efficiency',
    color: 'green',
    details: {
      compressorType: 'Centrifugal Compressor (Magnetic Bearings)',
      internalStructure: 'centrifugal',
      compressorVisible: true,
      compressorStyle: {
        x: 420,
        y: 220,
        width: 60,
        height: 30,
        shape: 'circle',
      },
      keyFeatures: [
        'Magnetic bearings = zero friction',
        'Variable speed (10-100%)',
        'Uses R-134a or R-513A',
        'No oil = no oil heat losses',
        'Excellent part-load efficiency',
      ],
      differences: 'Magnetic levitation eliminates all friction - the compressor "floats" on magnetic fields. Can modulate down to 10% load while maintaining efficiency.',
      visualIndicator: 'Magnetic field lines, variable speed indicator',
    },
  },
  {
    id: 'screw',
    name: 'Screw Compressor',
    efficiency: '0.50 - 0.65 kW/ton',
    description: 'Positive displacement, good part-load',
    application: 'Medium-large systems, 100-500 tons',
    color: 'blue',
    details: {
      compressorType: 'Helical Screw Compressor',
      internalStructure: 'positive-displacement',
      compressorVisible: true,
      compressorStyle: {
        x: 440,
        y: 210,
        width: 80,
        height: 60,
        shape: 'helix',
      },
      keyFeatures: [
        'Two intermeshing rotors',
        'Slide valve for capacity control',
        'Good part-load performance',
        'Oil-flooded or oil-free',
        'Wide operating range',
      ],
      differences: 'Two helical rotors mesh together to compress refrigerant. Slide valve allows capacity modulation from 25-100% efficiently.',
      visualIndicator: 'Twin helical rotors visible',
    },
  },
  {
    id: 'scroll',
    name: 'Scroll Compressor',
    efficiency: '0.60 - 0.75 kW/ton',
    description: 'Small to medium systems',
    application: 'Small-medium systems, < 150 tons',
    color: 'orange',
    details: {
      compressorType: 'Scroll Compressor',
      internalStructure: 'positive-displacement',
      compressorVisible: true,
      compressorStyle: {
        x: 450,
        y: 220,
        width: 60,
        height: 60,
        shape: 'scroll',
      },
      keyFeatures: [
        'Two spiral scrolls',
        'Fixed or digital scroll',
        'Lower capacity range',
        'Simple, reliable',
        'Limited modulation',
      ],
      differences: 'Two spiral scrolls compress refrigerant between them. Digital scroll can step down capacity but has limited range compared to screw or centrifugal.',
      visualIndicator: 'Spiral scrolls visible',
    },
  },
  {
    id: 'absorption',
    name: 'Absorption Chiller',
    efficiency: '1.0 - 1.2 kW/ton',
    description: 'Gas-fired or waste heat driven',
    application: 'Waste heat utilization, steam available',
    color: 'purple',
    details: {
      compressorType: 'Thermal Compressor (No Mechanical)',
      internalStructure: 'absorption',
      compressorVisible: false,
      compressorStyle: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        shape: 'none',
      },
      keyFeatures: [
        'No mechanical compressor',
        'Uses heat (gas/steam)',
        'LiBr-H2O or NH3-H2O',
        'Quiet operation',
        'High electrical efficiency (no motor)',
      ],
      differences: 'Uses heat instead of electricity to drive refrigeration cycle. No compressor - uses absorption/desorption of refrigerant in solution. Much lower electrical use but lower overall efficiency.',
      visualIndicator: 'Burner/generator visible, no compressor',
    },
  },
];

export const InteractiveChillerSchematic: React.FC<InteractiveChillerSchematicProps> = ({ 
  activeComponent, 
  setActiveComponent, 
  tooltipData 
}) => {
  const [selectedChillerType, setSelectedChillerType] = useState<(typeof CHILLER_TYPES[0]) | null>(CHILLER_TYPES[1]); // Default to MagLev
  const [animatingFlow, setAnimatingFlow] = useState(true);

  const getEfficiencyRange = () => {
    return selectedChillerType.efficiency;
  };

  const getChillerColor = () => {
    const colors: Record<string, string> = {
      red: '#ef4444',
      green: '#22c55e',
      blue: '#3b82f6',
      orange: '#f97316',
      purple: '#a855f7',
    };
    return colors[selectedChillerType.color] || '#3b82f6';
  };

  return (
    <div className="w-full space-y-6">
      {/* Chiller Type Selector Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
        {CHILLER_TYPES.map((chiller) => (
          <button
            key={chiller.id}
            onClick={() => setSelectedChillerType(chiller)}
            className={`
              p-4 rounded-lg border-2 transition-all duration-300 text-left relative
              ${selectedChillerType?.id === chiller.id 
                ? 'border-blue-500 bg-blue-50 shadow-lg scale-105' 
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }
            `}
          >
            {selectedChillerType.id === chiller.id && (
              <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            )}
            <h4 className="font-semibold text-sm text-gray-900 mb-2 pr-4">{chiller.name}</h4>
            <p className="text-xs text-gray-600 mb-2">{chiller.description}</p>
            <div className="text-xs font-mono text-blue-600 mb-1 font-bold">
              {chiller.efficiency}
            </div>
            <p className="text-xs text-gray-500">{chiller.application}</p>
          </button>
        ))}
      </div>

      {/* Selected Chiller Explanation - Always Show */}
      {selectedChillerType && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {CHILLER_TYPES.findIndex(c => c.id === selectedChillerType.id) + 1}
                </span>
                {selectedChillerType.name} - How It Works
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2 text-sm">Key Differences:</h4>
                  <p className="text-sm text-gray-700 leading-relaxed mb-3">
                    {selectedChillerType.details.differences}
                  </p>
                  
                  <h4 className="font-semibold text-gray-800 mb-2 text-sm">Compressor Type:</h4>
                  <p className="text-sm text-gray-700 font-mono bg-white px-3 py-2 rounded border border-gray-200 inline-block">
                    {selectedChillerType.details.compressorType}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2 text-sm">Key Features:</h4>
                  <ul className="space-y-1.5">
                    {selectedChillerType.details.keyFeatures.map((feature, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-white/60 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-gray-600">
                  <strong className="text-gray-800">Visual Indicator:</strong> {selectedChillerType.details.visualIndicator}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Diagram */}
      <div className="relative w-full h-[500px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden rounded-xl border border-slate-700">
        {activeComponent && tooltipData[activeComponent] && (
          <div 
            className="absolute z-20 bg-white/95 backdrop-blur-md border border-white/20 p-4 rounded-lg text-gray-900 shadow-2xl pointer-events-none" 
            style={tooltipData[activeComponent].style}
          >
            <h4 className="font-bold text-sm text-blue-600 mb-1">
              {tooltipData[activeComponent].title}
            </h4>
            <p className="text-xs text-gray-700 mb-2 max-w-[200px]">
              {tooltipData[activeComponent].desc}
            </p>
            <div className="text-[10px] font-mono bg-blue-50 px-2 py-1 rounded text-blue-700">
              {tooltipData[activeComponent].stats}
            </div>
          </div>
        )}
        
        <svg viewBox="0 0 900 500" className="w-full h-full">
          {/* Animated Background Gradient */}
          <defs>
            <linearGradient id="chilledWaterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={animatingFlow ? 0.8 : 0.4}>
                {animatingFlow && <animate attributeName="stop-opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />}
              </stop>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={animatingFlow ? 0.8 : 0.4}>
                {animatingFlow && <animate attributeName="stop-opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />}
              </stop>
            </linearGradient>
            
            <linearGradient id="condenserWaterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={animatingFlow ? 0.8 : 0.4}>
                {animatingFlow && <animate attributeName="stop-opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />}
              </stop>
              <stop offset="100%" stopColor="#dc2626" stopOpacity={animatingFlow ? 0.8 : 0.4}>
                {animatingFlow && <animate attributeName="stop-opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />}
              </stop>
            </linearGradient>

            {/* Arrow markers */}
            <marker id="arrow-blue" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#60a5fa" />
            </marker>
            <marker id="arrow-red" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
            </marker>
            <marker id="arrow-green" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#22c55e" />
            </marker>
          </defs>

          {/* Chilled Water Loop (Left - Blue) */}
          <g 
            className={`transition-all duration-300 cursor-pointer ${activeComponent && activeComponent !== 'chilledWater' ? 'opacity-30' : 'opacity-100'}`}
            onMouseEnter={() => setActiveComponent('chilledWater')}
            onMouseLeave={() => setActiveComponent(null)}
          >
            {/* Return Water (Warm) */}
            <path 
              d="M 100 250 L 350 250" 
              stroke="url(#chilledWaterGrad)" 
              strokeWidth="8" 
              fill="none"
              markerEnd="url(#arrow-blue)"
            />
            <text x="200" y="240" fill="#60a5fa" fontSize="14" fontWeight="bold" textAnchor="middle">
              Chilled Water Return
            </text>
            <text x="200" y="255" fill="#94a3b8" fontSize="12" textAnchor="middle">
              54°F → Building Load
            </text>

            {/* Supply Water (Cold) */}
            <path 
              d="M 350 200 L 100 200" 
              stroke="#60a5fa" 
              strokeWidth="8" 
              fill="none"
              strokeDasharray="10 5"
              markerEnd="url(#arrow-blue)"
            >
              {animatingFlow && (
                <animate
                  attributeName="stroke-dashoffset"
                  values="0;-15"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              )}
            </path>
            <text x="200" y="190" fill="#60a5fa" fontSize="14" fontWeight="bold" textAnchor="middle">
              Chilled Water Supply
            </text>
            <text x="200" y="205" fill="#94a3b8" fontSize="12" textAnchor="middle">
              44°F → Cooling Building
            </text>

            {/* Temperature Indicator */}
            <rect x="80" y="180" width="40" height="80" rx="5" fill="#1e293b" stroke="#60a5fa" strokeWidth="2" />
            <text x="100" y="210" fill="#60a5fa" fontSize="11" textAnchor="middle">ChW</text>
            <text x="100" y="225" fill="#60a5fa" fontSize="10" textAnchor="middle">44°F</text>
            <text x="100" y="240" fill="#94a3b8" fontSize="10" textAnchor="middle">→</text>
            <text x="100" y="255" fill="#60a5fa" fontSize="10" textAnchor="middle">54°F</text>
          </g>

          {/* Chiller Unit (Center) - Changes based on type */}
          <g 
            className={`transition-all duration-300 cursor-pointer ${activeComponent && activeComponent !== 'chiller' ? 'opacity-30' : 'opacity-100'}`}
            onMouseEnter={() => setActiveComponent('chiller')}
            onMouseLeave={() => setActiveComponent(null)}
          >
            <rect 
              x="350" 
              y="150" 
              width="200" 
              height="150" 
              fill="#1e293b" 
              stroke={getChillerColor()} 
              strokeWidth="4" 
              rx="8"
              className="shadow-lg"
            />
            <text x="450" y="185" fill={getChillerColor()} fontSize="18" fontWeight="bold" textAnchor="middle">
              CHILLER
            </text>
            <text x="450" y="205" fill="#94a3b8" fontSize="12" textAnchor="middle">
              {selectedChillerType.name}
            </text>
            <rect x="370" y="220" width="160" height="30" rx="4" fill="#0f172a" />
            <text x="450" y="223" fill={getChillerColor()} fontSize="12" fontWeight="bold" textAnchor="middle">
              {getEfficiencyRange()}
            </text>

            {/* Internal Compressor Visualization - Changes by Type */}
            {selectedChillerType && selectedChillerType.details && (
              <>
                {/* Centrifugal Compressor (Circle/Impeller) */}
                {selectedChillerType.details.compressorStyle.shape === 'circle' && (
                  <g>
                    {/* Compressor Housing */}
                    <circle 
                      cx={selectedChillerType.details.compressorStyle.x} 
                      cy={selectedChillerType.details.compressorStyle.y} 
                      r={selectedChillerType.details.compressorStyle.width / 2} 
                      fill="#0f172a" 
                      stroke={getChillerColor()} 
                      strokeWidth="2" 
                    />
                    {/* Impeller Blades */}
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                      const rad = angle * Math.PI / 180;
                      const x1 = selectedChillerType.details.compressorStyle.x;
                      const y1 = selectedChillerType.details.compressorStyle.y;
                      const x2 = x1 + Math.cos(rad) * (selectedChillerType.details.compressorStyle.width / 2 - 5);
                      const y2 = y1 + Math.sin(rad) * (selectedChillerType.details.compressorStyle.width / 2 - 5);
                      return (
                        <line
                          key={i}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={getChillerColor()}
                          strokeWidth="2"
                        >
                          {animatingFlow && selectedChillerType.id === 'centrifugal-maglev' && (
                            <animateTransform
                              attributeName="transform"
                              type="rotate"
                              values={`0 ${x1} ${y1};360 ${x1} ${y1}`}
                              dur="2s"
                              repeatCount="indefinite"
                            />
                          )}
                          {animatingFlow && selectedChillerType.id === 'centrifugal-legacy' && (
                            <animateTransform
                              attributeName="transform"
                              type="rotate"
                              values={`0 ${x1} ${y1};360 ${x1} ${y1}`}
                              dur="1.5s"
                              repeatCount="indefinite"
                            />
                          )}
                        </line>
                      );
                    })}
                    
                    {/* Magnetic Bearings Indicator (for MagLev) */}
                    {selectedChillerType.id === 'centrifugal-maglev' && (
                      <>
                        {[0, 120, 240].map((angle, i) => {
                          const rad = angle * Math.PI / 180;
                          const x = selectedChillerType.details.compressorStyle.x + Math.cos(rad) * (selectedChillerType.details.compressorStyle.width / 2 + 8);
                          const y = selectedChillerType.details.compressorStyle.y + Math.sin(rad) * (selectedChillerType.details.compressorStyle.width / 2 + 8);
                          return (
                            <circle key={i} cx={x} cy={y} r="3" fill="#22c55e" opacity="0.8">
                              {animatingFlow && (
                                <animate attributeName="opacity" values="0.8;1;0.8" dur="1s" repeatCount="indefinite" />
                              )}
                            </circle>
                          );
                        })}
                        <text x={selectedChillerType.details.compressorStyle.x} y={selectedChillerType.details.compressorStyle.y + 35} fill="#22c55e" fontSize="11" textAnchor="middle" fontWeight="bold">
                          MagLev Bearings
                        </text>
                        <text x={selectedChillerType.details.compressorStyle.x} y={selectedChillerType.details.compressorStyle.y + 48} fill="#64748b" fontSize="9" textAnchor="middle">
                          Zero Friction
                        </text>
                      </>
                    )}
                    
                    {/* Oil System (for Legacy) */}
                    {selectedChillerType.id === 'centrifugal-legacy' && (
                      <>
                        <rect x={selectedChillerType.details.compressorStyle.x - 25} y={selectedChillerType.details.compressorStyle.y + 20} width="20" height="15" fill="#ef4444" fillOpacity="0.3" stroke="#ef4444" strokeWidth="1" rx="2" />
                        <text x={selectedChillerType.details.compressorStyle.x - 15} y={selectedChillerType.details.compressorStyle.y + 30} fill="#ef4444" fontSize="9" textAnchor="middle" fontWeight="bold">Oil System</text>
                        <text x={selectedChillerType.details.compressorStyle.x - 15} y={selectedChillerType.details.compressorStyle.y + 42} fill="#64748b" fontSize="8" textAnchor="middle">Friction Loss</text>
                        <line 
                          x1={selectedChillerType.details.compressorStyle.x - 15} 
                          y1={selectedChillerType.details.compressorStyle.y + 20} 
                          x2={selectedChillerType.details.compressorStyle.x - selectedChillerType.details.compressorStyle.width / 2} 
                          y2={selectedChillerType.details.compressorStyle.y} 
                          stroke="#ef4444" 
                          strokeWidth="1" 
                          strokeDasharray="2 2"
                        />
                      </>
                    )}
                  </g>
                )}

                {/* Screw Compressor (Helical Rotors) */}
                {selectedChillerType.details.compressorStyle.shape === 'helix' && (
                  <g>
                    {/* Male Rotor */}
                    <ellipse 
                      cx={selectedChillerType.details.compressorStyle.x - 10} 
                      cy={selectedChillerType.details.compressorStyle.y} 
                      rx="12" 
                      ry="25" 
                      fill="#0f172a" 
                      stroke={getChillerColor()} 
                      strokeWidth="2" 
                    />
                    {/* Helical grooves on male */}
                    {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                      const rad = angle * Math.PI / 180;
                      const x1 = selectedChillerType.details.compressorStyle.x - 10 + Math.cos(rad) * 8;
                      const y1 = selectedChillerType.details.compressorStyle.y + Math.sin(rad) * 15;
                      return (
                        <path
                          key={i}
                          d={`M ${x1} ${y1} Q ${x1 + 3} ${y1 + 5} ${x1} ${y1 + 10}`}
                          stroke={getChillerColor()}
                          strokeWidth="1.5"
                          fill="none"
                        >
                          {animatingFlow && selectedChillerType && (
                            <animateTransform
                              attributeName="transform"
                              type="rotate"
                              values={`0 ${selectedChillerType.details.compressorStyle.x - 10} ${selectedChillerType.details.compressorStyle.y};360 ${selectedChillerType.details.compressorStyle.x - 10} ${selectedChillerType.details.compressorStyle.y}`}
                              dur="3s"
                              repeatCount="indefinite"
                            />
                          )}
                        </path>
                      );
                    })}
                    
                    {/* Female Rotor */}
                    <ellipse 
                      cx={selectedChillerType.details.compressorStyle.x + 15} 
                      cy={selectedChillerType.details.compressorStyle.y} 
                      rx="14" 
                      ry="28" 
                      fill="#0f172a" 
                      stroke={getChillerColor()} 
                      strokeWidth="2.5" 
                    />
                    {/* Helical lobes on female */}
                    {[0, 72, 144, 216, 288].map((angle, i) => {
                      const rad = angle * Math.PI / 180;
                      const x1 = selectedChillerType.details.compressorStyle.x + 15 + Math.cos(rad) * 8;
                      const y1 = selectedChillerType.details.compressorStyle.y + Math.sin(rad) * 15;
                      return (
                        <path
                          key={i}
                          d={`M ${x1} ${y1 - 3} Q ${x1 + 2} ${y1} ${x1} ${y1 + 3} Q ${x1 - 2} ${y1} ${x1} ${y1 - 3}`}
                          stroke={getChillerColor()}
                          strokeWidth="1.5"
                          fill="none"
                        >
                          {animatingFlow && selectedChillerType && (
                            <animateTransform
                              attributeName="transform"
                              type="rotate"
                              values={`0 ${selectedChillerType.details.compressorStyle.x + 15} ${selectedChillerType.details.compressorStyle.y};-360 ${selectedChillerType.details.compressorStyle.x + 15} ${selectedChillerType.details.compressorStyle.y}`}
                              dur="3s"
                              repeatCount="indefinite"
                            />
                          )}
                        </path>
                      );
                    })}
                    
                    <text x={selectedChillerType.details.compressorStyle.x} y={selectedChillerType.details.compressorStyle.y + 50} fill={getChillerColor()} fontSize="11" textAnchor="middle" fontWeight="bold">
                      Helical Screw
                    </text>
                    <text x={selectedChillerType.details.compressorStyle.x} y={selectedChillerType.details.compressorStyle.y + 63} fill="#64748b" fontSize="9" textAnchor="middle">
                      Intermeshing Rotors
                    </text>
                  </g>
                )}

                {/* Scroll Compressor */}
                {selectedChillerType.details.compressorStyle.shape === 'scroll' && (
                  <g>
                    {/* Fixed Scroll */}
                    <path
                      d={`M ${selectedChillerType.details.compressorStyle.x} ${selectedChillerType.details.compressorStyle.y} 
                          Q ${selectedChillerType.details.compressorStyle.x + 5} ${selectedChillerType.details.compressorStyle.y - 5} 
                            ${selectedChillerType.details.compressorStyle.x + 10} ${selectedChillerType.details.compressorStyle.y}
                          Q ${selectedChillerType.details.compressorStyle.x + 15} ${selectedChillerType.details.compressorStyle.y + 5} 
                            ${selectedChillerType.details.compressorStyle.x + 10} ${selectedChillerType.details.compressorStyle.y + 10}
                          Q ${selectedChillerType.details.compressorStyle.x + 5} ${selectedChillerType.details.compressorStyle.y + 15} 
                            ${selectedChillerType.details.compressorStyle.x} ${selectedChillerType.details.compressorStyle.y + 10}
                          Q ${selectedChillerType.details.compressorStyle.x - 5} ${selectedChillerType.details.compressorStyle.y + 5} 
                            ${selectedChillerType.details.compressorStyle.x} ${selectedChillerType.details.compressorStyle.y}
                          Z`}
                      fill="#0f172a"
                      stroke={getChillerColor()}
                      strokeWidth="2"
                    />
                    {/* Orbiting Scroll */}
                    <path
                      d={`M ${selectedChillerType.details.compressorStyle.x + 2} ${selectedChillerType.details.compressorStyle.y + 2} 
                          Q ${selectedChillerType.details.compressorStyle.x + 7} ${selectedChillerType.details.compressorStyle.y - 3} 
                            ${selectedChillerType.details.compressorStyle.x + 12} ${selectedChillerType.details.compressorStyle.y + 2}
                          Q ${selectedChillerType.details.compressorStyle.x + 17} ${selectedChillerType.details.compressorStyle.y + 7} 
                            ${selectedChillerType.details.compressorStyle.x + 12} ${selectedChillerType.details.compressorStyle.y + 12}
                          Q ${selectedChillerType.details.compressorStyle.x + 7} ${selectedChillerType.details.compressorStyle.y + 17} 
                            ${selectedChillerType.details.compressorStyle.x + 2} ${selectedChillerType.details.compressorStyle.y + 12}
                          Q ${selectedChillerType.details.compressorStyle.x - 3} ${selectedChillerType.details.compressorStyle.y + 7} 
                            ${selectedChillerType.details.compressorStyle.x + 2} ${selectedChillerType.details.compressorStyle.y + 2}
                          Z`}
                      fill="#0f172a"
                      fillOpacity="0.5"
                      stroke={getChillerColor()}
                      strokeWidth="2"
                    >
                      {animatingFlow && (
                        <animateTransform
                          attributeName="transform"
                          type="translate"
                          values="0,0; 3,-3; 0,0"
                          dur="1.5s"
                          repeatCount="indefinite"
                        />
                      )}
                    </path>
                    <text x={selectedChillerType.details.compressorStyle.x} y={selectedChillerType.details.compressorStyle.y + 45} fill={getChillerColor()} fontSize="11" textAnchor="middle" fontWeight="bold">
                      Scroll Compressor
                    </text>
                    <text x={selectedChillerType.details.compressorStyle.x} y={selectedChillerType.details.compressorStyle.y + 58} fill="#64748b" fontSize="9" textAnchor="middle">
                      Orbiting Scrolls
                    </text>
                  </g>
                )}

                {/* Absorption Chiller - No Compressor, Has Generator */}
                {selectedChillerType.details.compressorStyle.shape === 'none' && (
                  <g>
                    {/* Generator (heat source) */}
                    <rect x="380" y="220" width="40" height="30" fill="#f97316" fillOpacity="0.3" stroke="#f97316" strokeWidth="2" rx="3" />
                    <text x="400" y="235" fill="#f97316" fontSize="10" textAnchor="middle" fontWeight="bold">GEN</text>
                    <text x="400" y="247" fill="#94a3b8" fontSize="8" textAnchor="middle">Heat</text>
                    
                    {/* Absorber */}
                    <rect x="440" y="220" width="40" height="30" fill="#a855f7" fillOpacity="0.3" stroke="#a855f7" strokeWidth="2" rx="3" />
                    <text x="460" y="235" fill="#a855f7" fontSize="10" textAnchor="middle" fontWeight="bold">ABS</text>
                    
                    {/* Solution Pump */}
                    <g>
                      <circle cx="430" cy="260" r="8" fill="#0f172a" stroke="#a855f7" strokeWidth="2">
                        {animatingFlow && (
                          <animateTransform
                            attributeName="transform"
                            type="rotate"
                            values="0 430 260;360 430 260"
                            dur="2s"
                            repeatCount="indefinite"
                          />
                        )}
                      </circle>
                      <line x1="425" y1="260" x2="435" y2="260" stroke="#a855f7" strokeWidth="2" />
                    </g>
                    
                    <text x="450" y="275" fill="#a855f7" fontSize="9" textAnchor="middle" fontWeight="bold">
                      No Compressor
                    </text>
                    <text x="450" y="285" fill="#94a3b8" fontSize="9" textAnchor="middle">
                      Thermal Compression
                    </text>
                    <text x="450" y="295" fill="#64748b" fontSize="8" textAnchor="middle">
                      Heat-Driven (No Motor)
                    </text>
                  </g>
                )}
              </>
            )}

            {/* Evaporator Coil */}
            <rect x="340" y="180" width="30" height="90" fill="#60a5fa" fillOpacity="0.2" stroke="#60a5fa" strokeWidth="2" rx="3" />
            <line x1="345" y1="190" x2="365" y2="190" stroke="#60a5fa" strokeWidth="1" />
            <line x1="345" y1="210" x2="365" y2="210" stroke="#60a5fa" strokeWidth="1" />
            <line x1="345" y1="230" x2="365" y2="230" stroke="#60a5fa" strokeWidth="1" />
            <line x1="345" y1="250" x2="365" y2="250" stroke="#60a5fa" strokeWidth="1" />

            {/* Condenser Coil */}
            <rect x="530" y="180" width="30" height="90" fill="#ef4444" fillOpacity="0.2" stroke="#ef4444" strokeWidth="2" rx="3" />
            <line x1="535" y1="190" x2="555" y2="190" stroke="#ef4444" strokeWidth="1" />
            <line x1="535" y1="210" x2="555" y2="210" stroke="#ef4444" strokeWidth="1" />
            <line x1="535" y1="230" x2="555" y2="230" stroke="#ef4444" strokeWidth="1" />
            <line x1="535" y1="250" x2="555" y2="250" stroke="#ef4444" strokeWidth="1" />
          </g>

          {/* Condenser Water Loop (Right - Red) */}
          <g 
            className={`transition-all duration-300 cursor-pointer ${activeComponent && activeComponent !== 'condenserWater' ? 'opacity-30' : 'opacity-100'}`}
            onMouseEnter={() => setActiveComponent('condenserWater')}
            onMouseLeave={() => setActiveComponent(null)}
          >
            {/* Hot Water to Tower */}
            <path 
              d="M 560 250 L 750 250" 
              stroke="url(#condenserWaterGrad)" 
              strokeWidth="8" 
              fill="none"
              markerEnd="url(#arrow-red)"
            />
            <text x="650" y="240" fill="#ef4444" fontSize="14" fontWeight="bold" textAnchor="middle">
              Condenser Water (Hot)
            </text>
            <text x="650" y="255" fill="#94a3b8" fontSize="12" textAnchor="middle">
              95°F → Cooling Tower
            </text>

            {/* Cool Water from Tower */}
            <path 
              d="M 750 200 L 560 200" 
              stroke="#ef4444" 
              strokeWidth="8" 
              fill="none"
              strokeDasharray="10 5"
              markerEnd="url(#arrow-red)"
            >
              {animatingFlow && (
                <animate
                  attributeName="stroke-dashoffset"
                  values="0;-15"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              )}
            </path>
            <text x="650" y="190" fill="#ef4444" fontSize="14" fontWeight="bold" textAnchor="middle">
              Condenser Water (Cool)
            </text>
            <text x="650" y="205" fill="#94a3b8" fontSize="12" textAnchor="middle">
              85°F ← From Tower
            </text>
          </g>

          {/* Cooling Tower */}
          <g 
            className={`transition-all duration-300 cursor-pointer ${activeComponent && activeComponent !== 'tower' ? 'opacity-30' : 'opacity-100'}`}
            onMouseEnter={() => setActiveComponent('tower')}
            onMouseLeave={() => setActiveComponent(null)}
          >
            <ellipse cx="800" cy="180" rx="70" ry="35" fill="#1e293b" stroke="#fbbf24" strokeWidth="3" />
            <rect x="785" y="180" width="30" height="120" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
            
            {/* VFD Fan */}
            <circle cx="800" cy="155" r="18" fill="#cbd5e1" stroke="#fbbf24" strokeWidth="2">
              {animatingFlow && (
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="0 800 155;360 800 155"
                  dur="3s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
            <text x="800" y="125" fill="#fbbf24" fontSize="12" textAnchor="middle" fontWeight="bold">
              VFD Fan
            </text>

            {/* Water Spray Animation */}
            {animatingFlow && (
              <g>
                <circle cx="780" cy="195" r="2" fill="#60a5fa" opacity="0.6">
                  <animate attributeName="cy" values="195;205" dur="1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0" dur="1s" repeatCount="indefinite" />
                </circle>
                <circle cx="800" cy="195" r="2" fill="#60a5fa" opacity="0.6">
                  <animate attributeName="cy" values="195;205" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0" dur="1.2s" repeatCount="indefinite" />
                </circle>
                <circle cx="820" cy="195" r="2" fill="#60a5fa" opacity="0.6">
                  <animate attributeName="cy" values="195;205" dur="1.1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0" dur="1.1s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
          </g>

          {/* Strategy Label */}
          <rect x="300" y="350" width="300" height="80" rx="8" fill="#1e293b" fillOpacity="0.8" stroke="#3b82f6" strokeWidth="2" />
          <text x="450" y="375" fill="#3b82f6" fontSize="16" fontWeight="bold" textAnchor="middle">
            Lift Reduction Strategy
          </text>
          <text x="450" y="395" fill="#94a3b8" fontSize="13" textAnchor="middle">
            Lower Lift = Lower Energy
          </text>
          <text x="450" y="410" fill="#22c55e" fontSize="12" textAnchor="middle" fontWeight="bold">
            Optimize: Raise ChW, Lower CondW
          </text>
          <text x="450" y="425" fill="#64748b" fontSize="11" textAnchor="middle">
            Target: 10°F ΔT (ChW), 7°F Approach (CondW)
          </text>

          {/* Lift Calculation */}
          <rect x="650" y="350" width="200" height="80" rx="8" fill="#1e293b" fillOpacity="0.8" stroke="#22c55e" strokeWidth="2" />
          <text x="750" y="375" fill="#22c55e" fontSize="14" fontWeight="bold" textAnchor="middle">
            Current Lift
          </text>
          <text x="750" y="395" fill="#94a3b8" fontSize="12" textAnchor="middle">
            CondW: 95°F - ChW: 44°F
          </text>
          <text x="750" y="415" fill="#fbbf24" fontSize="18" fontWeight="bold" textAnchor="middle">
            51°F Lift
          </text>
          <text x="750" y="425" fill="#64748b" fontSize="10" textAnchor="middle">
            (Lower is better)
          </text>
        </svg>

        {/* Animation Control */}
        <button
          onClick={() => setAnimatingFlow(!animatingFlow)}
          className="absolute top-4 right-4 px-3 py-2 bg-blue-600/80 hover:bg-blue-600 text-white text-xs rounded-lg backdrop-blur-sm transition-colors"
        >
          {animatingFlow ? '⏸️ Pause Flow' : '▶️ Play Flow'}
        </button>
      </div>
    </div>
  );
};

