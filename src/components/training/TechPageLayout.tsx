import React from 'react';
import { Quote, BrainCircuit, Flame, ArrowRight, Activity, AlertTriangle, Info, Wrench, Truck, CheckCircle2, XCircle, MapPin, Lightbulb, Target } from 'lucide-react';
import type { TechPageData } from '../../data/training/lighting-content';
import { EnhancedContentDisplay } from './EnhancedContentDisplay';
import { chillerEnhancedData as enhancedChillerData } from '../../data/training/chiller-content';
import { boilerEnhancedData as enhancedBoilerData } from '../../data/training/boiler-content';

interface TechPageLayoutProps {
  data: TechPageData;
  schematicComponent?: React.ReactNode;
  onGenerate?: (title: string) => void;
  headerRight?: React.ReactNode;
  belowHeader?: React.ReactNode;
  belowCore?: React.ReactNode;
}

export const TechPageLayout: React.FC<TechPageLayoutProps> = ({
  data,
  schematicComponent,
  onGenerate,
  headerRight,
  belowHeader,
  belowCore,
}) => {
  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* HEADER */}
      <div className="mb-8 border-b border-slate-200 pb-4">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{data.title}</h1>
            <p className="text-lg text-slate-500">{data.subtitle}</p>
          </div>
          {headerRight ? <div className="flex-shrink-0">{headerRight}</div> : null}
        </div>
        {belowHeader ? <div className="mt-5">{belowHeader}</div> : null}
      </div>

      {/* COMPREHENSIVE INTRODUCTION */}
      {data.introduction && (
        <div id="introduction" className="mb-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl border-2 border-blue-200 p-8 shadow-lg">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Info className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">What is {data.title}?</h2>
              <p className="text-base text-gray-700 leading-relaxed mb-6">{data.introduction.whatItIs}</p>

              {/* Where It's Typically Seen */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-lg border border-blue-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-gray-900">Where It's Typically Found</h3>
                  </div>
                  <ul className="space-y-2">
                    {data.introduction.whereItIsSeen.map((location, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>{location}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white rounded-lg border border-blue-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-gray-900">Physical Locations in Buildings</h3>
                  </div>
                  <ul className="space-y-2">
                    {data.introduction.typicalLocations.map((location, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-purple-600 mt-1">📍</span>
                        <span>{location}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Key Concepts */}
              <div className="bg-white rounded-lg border border-indigo-200 p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-bold text-gray-900">Key Concepts to Understand</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.introduction.keyConcepts.map((concept, idx) => (
                    <div key={idx} className="bg-indigo-50 border-l-4 border-indigo-400 p-3 rounded">
                      <p className="text-sm text-gray-800 leading-relaxed">{concept}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Why It Matters */}
              <div className="bg-green-50 border-l-4 border-green-500 p-5 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Why This Technology Matters
                </h3>
                <p className="text-sm text-gray-800 leading-relaxed">{data.introduction.whyItMatters}</p>
              </div>

              {/* Common Applications */}
              {data.introduction.commonApplications && data.introduction.commonApplications.length > 0 && (
                <div className="mt-6 bg-white rounded-lg border border-slate-200 p-5">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Common Applications
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.introduction.commonApplications.map((app, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{app}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* INTRO QUOTE */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 flex gap-4">
        <Quote className="w-12 h-12 text-slate-300 flex-shrink-0" />
        <div>
          <h3 className="font-bold text-slate-800 mb-2">Chief Engineer's Desk:</h3>
          <p className="text-sm text-slate-600 leading-relaxed italic">"{data.chiefEngineerQuote}"</p>
        </div>
      </div>

      {/* FIXTURE TYPES GRID */}
      {data.compressorTypes && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" /> Know Your Types
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {data.compressorTypes.map((type, idx) => {
              const borderColors: Record<string, string> = { 
                blue: 'border-t-blue-500', 
                emerald: 'border-t-emerald-500', 
                purple: 'border-t-purple-500',
                indigo: 'border-t-indigo-500',
                slate: 'border-slate-200',
                red: 'border-t-red-500',
                orange: 'border-t-orange-500',
              };
              return (
                <div 
                  key={idx} 
                  className={`bg-white p-6 rounded-xl border shadow-sm ${
                    type.color !== 'slate' ? `border-t-4 ${borderColors[type.color]}` : 'border-slate-200'
                  }`}
                >
                  <h3 className="font-bold text-slate-800">{type.name}</h3>
                  <p className="text-sm text-slate-600 mb-2 mt-1">{type.desc}</p>
                  <div className="text-xs bg-slate-50 p-2 rounded mb-1">
                    <strong>Range:</strong> {type.range}
                  </div>
                  <div className="text-xs text-slate-500">{type.application}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SCHEMATIC */}
      {schematicComponent && (
        <div className="mb-12">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" /> {data.schematicTitle}
          </h2>
          <div className="relative bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-800 shadow-2xl">
            {schematicComponent}
          </div>
          
          {/* Cycle Steps */}
          {data.cycleSteps && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              {data.cycleSteps.map((step) => (
                <div key={step.step} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {step.step}
                    </span>
                    <h4 className="font-bold text-sm text-slate-800">{step.title}</h4>
                  </div>
                  <p className="text-xs text-slate-600">{step.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REAL WORLD & ID GUIDE */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Truck className="w-6 h-6 text-slate-600" /> Schematic vs. Reality
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ID Table - Enhanced */}
          {data.identificationGuide && (
            <div className="bg-white p-6 rounded-xl border-2 border-slate-300 shadow-lg">
              <h3 className="font-bold text-lg text-slate-900 mb-6 text-center">Identification Guide</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-300">
                      <th className="px-6 py-4 text-left font-bold text-slate-700 uppercase text-xs tracking-wider">Feature</th>
                      <th className="px-6 py-4 text-center font-bold text-red-600 uppercase text-xs tracking-wider border-x border-slate-300">Standard</th>
                      <th className="px-6 py-4 text-center font-bold text-green-600 uppercase text-xs tracking-wider">High Efficiency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.identificationGuide.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800 bg-slate-50">{row.feature}</td>
                        <td className="px-6 py-4 text-slate-700 text-center border-x border-slate-200">{row.standard}</td>
                        <td className="px-6 py-4 font-bold text-green-700 text-center bg-green-50">{row.highEff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Image */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 text-center">The "Real World"</h3>
            <div className="aspect-video rounded-lg overflow-hidden shadow-lg border border-slate-300 relative group">
              <img 
                src={data.realWorldImage.src} 
                alt={data.realWorldImage.alt} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs backdrop-blur-sm">
                {data.realWorldImage.caption}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VOCABULARY */}
      <div className="mb-12 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-purple-600" /> The Engineer Whisperer
          </h2>
        </div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Term</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Definition</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-indigo-600 uppercase">Sales Hook</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200 text-sm">
            {data.vocabulary.map((item, idx) => (
              <tr key={idx}>
                <td className="px-6 py-4 font-bold text-slate-900">{item.term}</td>
                <td className="px-6 py-4 text-slate-600">{item.definition}</td>
                <td className="px-6 py-4 text-indigo-700 bg-indigo-50 italic">"{item.salesHook}"</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* STRATEGY */}
      {data.retrofitStrategy && (
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-orange-500" /> {data.retrofitStrategy.title}
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold text-slate-800 mb-2">{data.retrofitStrategy.oldWay.title}</h4>
              <p className="text-sm text-slate-600 mb-4">{data.retrofitStrategy.oldWay.desc}</p>
              
              <h4 className="font-bold text-slate-800 mb-2">{data.retrofitStrategy.newWay.title}</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                {data.retrofitStrategy.newWay.items.map((it, i) => (
                  <li key={i} className="flex gap-2">✅ {it}</li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-50 p-4 rounded">
              <h4 className="font-bold text-indigo-900 mb-2">{data.retrofitStrategy.utilityBenefit.title}</h4>
              <p className="text-sm text-slate-700">{data.retrofitStrategy.utilityBenefit.desc}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bulb Types Library (Lighting Only) */}
      {data.title === "LED Lighting & Networked Controls" && data.bulbTypes && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Info className="w-6 h-6 text-blue-600" /> Bulb Type Identification Library
          </h2>
          
          {/* Full Catalog Reference Image */}
          <div className="mb-8 bg-white rounded-xl border-2 border-blue-200 p-6 shadow-lg">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Complete Bulb Type Catalog Reference</h3>
            <p className="text-sm text-slate-600 mb-4">
              Use the catalog images below to identify bulb types in the field. Each catalog shows all bulb shapes and sizes organized by series.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-2">Catalog 1: Comprehensive Bulb Types</h4>
                <div className="aspect-video bg-white rounded border border-slate-300 overflow-hidden">
                  <img 
                    src="/images/bulb-types/bulb-types-1.png" 
                    alt="Complete bulb type catalog"
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Shows all bulb series: A, PS, B, C, CA, R, MR, BR, G, T, BT, E, ED, AR, PAR, and specialty types
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-2">Catalog 2: Common Bulb Types</h4>
                <div className="aspect-video bg-white rounded border border-slate-300 overflow-hidden">
                  <img 
                    src="/images/bulb-types/bulb-types-2.png" 
                    alt="Common bulb types infographic"
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Infographic showing 18 most common bulb types: Incandescent, LED, CFL, Halogen, Fluorescent, and more
                </p>
              </div>
            </div>
          </div>

          {/* Individual Bulb Type Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.bulbTypes.map((bulb, idx) => (
              <div key={idx} className="bg-white rounded-xl border-2 border-slate-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="aspect-video bg-slate-50 relative overflow-hidden group">
                  <img 
                    src={bulb.imageUrl} 
                    alt={bulb.name}
                    className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=' + encodeURIComponent(bulb.name);
                    }}
                  />
                  {/* Catalog reference indicator */}
                  {bulb.imageUrl?.includes('bulb-types-') && (
                    <div className="absolute bottom-2 right-2 bg-blue-600/90 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                      See Catalog Above
                    </div>
                  )}
                  {bulb.catalogPosition && (
                    <div className="absolute top-2 left-2 bg-green-600/90 text-white text-xs px-2 py-1 rounded backdrop-blur-sm max-w-[70%]">
                      {bulb.catalogPosition}
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-slate-900">{bulb.name}</h3>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">{bulb.type}</span>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <h4 className="font-semibold text-slate-700 mb-1">Identification:</h4>
                      <p className="text-slate-600 text-xs">{bulb.identification}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-slate-700 mb-1">Typical Locations:</h4>
                      <ul className="text-slate-600 text-xs space-y-1">
                        {bulb.typicalLocations.slice(0, 3).map((loc, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>{loc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <span className="text-xs font-semibold text-slate-500">Wattage:</span>
                        <p className="text-sm font-bold text-slate-800">{bulb.wattageRange}</p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500">Lifespan:</span>
                        <p className="text-sm font-bold text-slate-800">{bulb.lifeSpan}</p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500">Efficiency:</span>
                        <p className="text-sm font-bold text-slate-800">{bulb.efficiency}</p>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                      <h4 className="font-semibold text-slate-700 mb-1 text-xs">Replacement:</h4>
                      <p className="text-slate-700 text-xs font-medium">{bulb.replacement}</p>
                    </div>
                    
                    {bulb.notes && (
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                        <p className="text-slate-700 text-xs italic">{bulb.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best Practices Section */}
      {data.bestPractices && (
        <div className="mb-12 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-indigo-600" /> {data.bestPractices.title}
          </h2>
          <div className="space-y-6">
            {data.bestPractices.sections.map((section, idx) => (
              <div key={idx} className="bg-white rounded-lg border border-indigo-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-3">{section.heading}</h3>
                <p className="text-slate-700 mb-4 leading-relaxed">{section.content}</p>
                {section.items && (
                  <ul className="space-y-2">
                    {section.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-start gap-3 text-sm text-slate-700">
                        <CheckCircle2 className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ROI & Low Hanging Fruit */}
      {data.roiAndLowHangingFruit && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6 text-green-600" /> ROI & Low Hanging Fruit
          </h2>
          
          {/* Typical ROI */}
          {data.roiAndLowHangingFruit.typicalROI && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Typical ROI by Project Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.roiAndLowHangingFruit.typicalROI.map((roi, idx) => (
                  <div key={idx} className="bg-white rounded-lg border-2 border-green-200 p-5 shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-slate-900">{roi.project}</h4>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                        {roi.payback}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-semibold text-slate-700">Annual Savings: </span>
                        <span className="font-bold text-green-600">{roi.annualSavings}</span>
                      </div>
                      <p className="text-slate-600 text-xs">{roi.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low Hanging Fruit */}
          {data.roiAndLowHangingFruit.lowHangingFruit && (
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Low Hanging Fruit Opportunities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.roiAndLowHangingFruit.lowHangingFruit.map((fruit, idx) => (
                  <div key={idx} className="bg-white rounded-lg border-2 border-yellow-200 p-5 shadow-md">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-bold text-slate-900 flex-1">{fruit.opportunity}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        fruit.effort === 'Low' ? 'bg-green-100 text-green-700' :
                        fruit.effort === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {fruit.effort} Effort
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="font-semibold text-slate-700">Savings: </span>
                          <span className="font-bold text-green-600">{fruit.savings}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">Payback: </span>
                          <span className="font-bold text-blue-600">{fruit.payback}</span>
                        </div>
                      </div>
                      <p className="text-slate-600 text-xs">{fruit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Optimization vs Replacement */}
      {data.optimizationVsReplacement && (
        <div className="mb-12 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border-2 border-orange-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-600" /> Optimization vs Replacement Strategy
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Optimization Opportunities */}
            <div className="bg-white rounded-lg border border-orange-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" /> Optimization Opportunities
              </h3>
              <ul className="space-y-3">
                {data.optimizationVsReplacement.optimizationOpportunities.map((opt, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="text-green-600 mt-1 font-bold">✓</span>
                    <span>{opt}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-400 rounded">
                <p className="text-sm text-slate-700 font-medium">{data.optimizationVsReplacement.optimizationBenefits}</p>
              </div>
            </div>

            {/* When to Replace */}
            <div className="bg-white rounded-lg border border-orange-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" /> When to Replace Instead
              </h3>
              <ul className="space-y-3">
                {data.optimizationVsReplacement.whenToReplace.map((replace, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="text-red-600 mt-1 font-bold">→</span>
                    <span>{replace}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                <p className="text-sm text-slate-700 font-medium">{data.optimizationVsReplacement.replacementBenefits}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Content (Dual Perspectives) */}
      {data.title === "Water-Cooled Chillers" && enhancedChillerData && (
        <div className="mt-12">
          <EnhancedContentDisplay
            engineerPerspective={enhancedChillerData.engineerPerspective}
            salesPerspective={enhancedChillerData.salesPerspective}
            deepDive={enhancedChillerData.deepDive}
          />
        </div>
      )}

      {data.title === "Commercial Boilers" && enhancedBoilerData && (
        <div className="mt-12">
          <EnhancedContentDisplay
            engineerPerspective={enhancedBoilerData.engineerPerspective}
            salesPerspective={enhancedBoilerData.salesPerspective}
            deepDive={enhancedBoilerData.deepDive}
          />
        </div>
      )}

      {belowCore ? <div className="mt-10">{belowCore}</div> : null}

      {/* CTA */}
      {onGenerate && (
        <div className="mt-10 bg-slate-900 rounded-xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div>
            <h3 className="font-bold text-lg mb-1">Want more detail?</h3>
            <p className="text-slate-400 text-sm">Generate a site-specific guide.</p>
          </div>
          <button
            onClick={() => onGenerate(data.title)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold flex items-center gap-2"
          >
            Generate Deep Dive <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

