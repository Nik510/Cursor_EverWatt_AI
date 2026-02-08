import React from 'react';

interface TooltipData {
  title: string;
  desc: string;
  stats: string;
  style: React.CSSProperties;
}

interface CoolingTowerSchematicProps {
  activeComponent: string | null;
  setActiveComponent: (id: string | null) => void;
  tooltipData: Record<string, TooltipData>;
}

export const CoolingTowerSchematic: React.FC<CoolingTowerSchematicProps> = ({ 
  activeComponent, 
  setActiveComponent, 
  tooltipData 
}) => {
  return (
    <div className="relative w-full h-96 bg-slate-900 overflow-hidden">
      {activeComponent && tooltipData[activeComponent] && (
        <div 
          className="absolute z-20 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-lg text-white shadow-2xl pointer-events-none" 
          style={tooltipData[activeComponent].style}
        >
          <h4 className="font-bold text-sm text-yellow-300 mb-1">
            {tooltipData[activeComponent].title}
          </h4>
          <p className="text-xs text-slate-200 mb-2 max-w-[200px]">
            {tooltipData[activeComponent].desc}
          </p>
          <div className="text-[10px] font-mono bg-black/40 px-2 py-1 rounded text-yellow-100">
            {tooltipData[activeComponent].stats}
          </div>
        </div>
      )}
      
      <svg viewBox="0 0 800 400" className="w-full h-full">
        {/* Cooling Tower Structure */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'tower' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('tower')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          {/* Tower Base */}
          <rect x="250" y="200" width="300" height="150" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" rx="5" />
          
          {/* Fill Media (represented as horizontal lines) */}
          {[...Array(8)].map((_, i) => (
            <line 
              key={i}
              x1="270" 
              y1={220 + i * 15} 
              x2="530" 
              y2={220 + i * 15} 
              stroke="#60a5fa" 
              strokeWidth="1" 
              opacity="0.3"
            />
          ))}
          
          {/* Hot Water Distribution */}
          <rect x="250" y="200" width="300" height="10" fill="#ef4444" fillOpacity="0.3" />
          <text x="400" y="208" fill="#ef4444" fontSize="11" textAnchor="middle" fontWeight="bold">
            85-95°F Hot Water In
          </text>
          
          {/* Cool Water Collection */}
          <rect x="250" y="340" width="300" height="10" fill="#60a5fa" fillOpacity="0.3" />
          <text x="400" y="348" fill="#60a5fa" fontSize="11" textAnchor="middle" fontWeight="bold">
            70-85°F Cool Water Out
          </text>
        </g>

        {/* Fan */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'fan' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('fan')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <circle cx="400" cy="150" r="40" fill="#1e293b" stroke="#22c55e" strokeWidth="3" />
          {/* Fan Blades */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = 400 + 20 * Math.cos(rad);
            const y1 = 150 + 20 * Math.sin(rad);
            const x2 = 400 + 35 * Math.cos(rad);
            const y2 = 150 + 35 * Math.sin(rad);
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#22c55e" strokeWidth="3" />
            );
          })}
          <text x="400" y="110" fill="#22c55e" fontSize="12" textAnchor="middle" fontWeight="bold">
            VFD Fan
          </text>
          <text x="400" y="125" fill="#94a3b8" fontSize="10" textAnchor="middle">
            Variable Speed
          </text>
        </g>

        {/* Condenser Water Flow */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'condenser' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('condenser')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          {/* Hot Water from Chiller */}
          <path d="M 150 210 L 250 210" stroke="#ef4444" strokeWidth="4" markerEnd="url(#arrow-red)" />
          <text x="200" y="200" fill="#ef4444" fontSize="11" textAnchor="middle">From Chiller</text>
          
          {/* Cool Water to Chiller */}
          <path d="M 550 340 L 650 340" stroke="#60a5fa" strokeWidth="4" markerEnd="url(#arrow-blue)" />
          <text x="600" y="330" fill="#60a5fa" fontSize="11" textAnchor="middle">To Chiller</text>
          
          {/* Chiller */}
          <rect x="670" y="320" width="80" height="40" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" rx="3" />
          <text x="710" y="340" fill="#3b82f6" fontSize="11" textAnchor="middle">CHILLER</text>
        </g>

        {/* Air Flow */}
        <g className="opacity-60">
          {/* Air In (Bottom) */}
          <path d="M 350 360 L 350 380" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3 3" />
          <text x="360" y="385" fill="#94a3b8" fontSize="10">Air In</text>
          
          {/* Air Out (Top) */}
          <path d="M 400 110 L 400 90" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3 3" />
          <circle cx="400" cy="85" r="3" fill="#94a3b8" />
          <text x="410" y="85" fill="#94a3b8" fontSize="10">Air + Water Vapor Out</text>
        </g>

        {/* Fill Media Detail */}
        <g className="opacity-50">
          <rect x="50" y="280" width="80" height="60" fill="#1e293b" stroke="#60a5fa" strokeWidth="1" />
          <text x="90" y="295" fill="#60a5fa" fontSize="10" textAnchor="middle" fontWeight="bold">
            Fill Media
          </text>
          {[...Array(4)].map((_, i) => (
            <line 
              key={i}
              x1="60" 
              y1={305 + i * 8} 
              x2="120" 
              y2={305 + i * 8} 
              stroke="#60a5fa" 
              strokeWidth="1" 
              opacity="0.5"
            />
          ))}
          <text x="90" y="335" fill="#94a3b8" fontSize="9" textAnchor="middle">
            Heat Transfer Surface
          </text>
        </g>

        {/* Efficiency Comparison */}
        <g className="opacity-70">
          <rect x="150" y="280" width="100" height="60" fill="#ef4444" fillOpacity="0.1" stroke="#ef4444" strokeWidth="1" />
          <text x="200" y="295" fill="#ef4444" fontSize="10" textAnchor="middle" fontWeight="bold">
            Constant Speed
          </text>
          <text x="200" y="310" fill="#94a3b8" fontSize="9" textAnchor="middle">
            Fan: 100% Power
          </text>
          <text x="200" y="325" fill="#94a3b8" fontSize="9" textAnchor="middle">
            Condenser: 85°F
          </text>

          <rect x="550" y="280" width="100" height="60" fill="#22c55e" fillOpacity="0.1" stroke="#22c55e" strokeWidth="1" />
          <text x="600" y="295" fill="#22c55e" fontSize="10" textAnchor="middle" fontWeight="bold">
            VFD Control
          </text>
          <text x="600" y="310" fill="#94a3b8" fontSize="9" textAnchor="middle">
            Fan: 50-70% Power
          </text>
          <text x="600" y="325" fill="#94a3b8" fontSize="9" textAnchor="middle">
            Condenser: 70-75°F
          </text>
        </g>

        {/* Arrows */}
        <defs>
          <marker id="arrow-red" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
          </marker>
          <marker id="arrow-blue" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#60a5fa" />
          </marker>
        </defs>

        {/* Key Point */}
        <text x="400" y="380" fill="#94a3b8" fontSize="12" textAnchor="middle" fontWeight="bold">
          Lower Condenser Water Temp = Lower Chiller Lift = Less Energy
        </text>
      </svg>
    </div>
  );
};

