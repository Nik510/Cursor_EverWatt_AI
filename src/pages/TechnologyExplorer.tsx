import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { TechPageLayout } from '../components/training/TechPageLayout';
import { LightingSchematic } from '../components/training/LightingSchematic';
import { InteractiveChillerSchematic } from '../components/training/InteractiveChillerSchematic';
import { BoilerSchematic } from '../components/training/BoilerSchematic';
import { VFDSchematic } from '../components/training/VFDSchematic';
import { InteractiveBatterySchematic } from '../components/training/InteractiveBatterySchematic';
import { CoolingTowerSchematic } from '../components/training/CoolingTowerSchematic';
import { VRFSchematic } from '../components/training/VRFSchematic';
import { LightingMasterCompendium } from '../components/training/LightingMasterCompendium';
import { MasterEquipmentExplorer } from '../components/training/MasterEquipmentExplorer';
import { CoolingSystemMap } from '../components/training/CoolingSystemMap';
import { TrainingSectionAccordion, type TrainingAudienceRole, type TrainingSectionItem } from '../components/training/TrainingSectionAccordion';
import { getTrainingContent } from '../data/training';
import type { TechPageData } from '../data/training/lighting-content';
import { masterEEDatabase } from '../data/master-ee-database';
import { getTrainingContentByCategory, getAllTrainingContent } from '../services/data-service';
import type { TrainingContent } from '../types/data-service';

interface TechnologyExplorerProps {
  embedded?: boolean;
}

export const TechnologyExplorer: React.FC<TechnologyExplorerProps> = ({ embedded = false }) => {
  const location = useLocation();
  const [activeComponent, setActiveComponent] = useState<string | null>(null);
  const [selectedTech, setSelectedTech] = useState<string>(
    (location.state as any)?.tech || 'lighting'
  );
  const [lightingView, setLightingView] = useState<'training' | 'compendium'>('training');
  const [showCoolingMeasures, setShowCoolingMeasures] = useState(false);
  const [expandedCoolingSubcategories, setExpandedCoolingSubcategories] = useState<Set<string>>(new Set());
  const [structuredContent, setStructuredContent] = useState<TrainingContent[]>([]);
  const [loadingStructured, setLoadingStructured] = useState(false);
  const [showStructuredContent, setShowStructuredContent] = useState(true);
  const [deepDiveTitle, setDeepDiveTitle] = useState<string | null>(null);
  const [deepDiveText, setDeepDiveText] = useState<string>('');
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [deepDiveError, setDeepDiveError] = useState<string | null>(null);
  const [coolingSystemsView, setCoolingSystemsView] = useState<'overview' | 'deep'>('overview');
  const [coolingRole, setCoolingRole] = useState<TrainingAudienceRole | 'all'>('all');
  const [coolingAutoExpandId, setCoolingAutoExpandId] = useState<string | null>(null);

  useEffect(() => {
    // keep noisy logs out of the console in production
    // (use logger if you need to debug)
  }, [selectedTech]);

  useEffect(() => {
    if (selectedTech !== 'cooling-systems') return;
    // Default to Sales Basics when entering this module.
    setCoolingSystemsView('overview');
    setCoolingRole('sales');
    setCoolingAutoExpandId(null);
  }, [selectedTech]);

  // Update selectedTech when location state changes
  useEffect(() => {
    if ((location.state as any)?.tech) {
      setSelectedTech((location.state as any).tech);
    }
  }, [location]);

  // Load structured training content when technology changes
  useEffect(() => {
    const loadStructuredContent = async () => {
      setLoadingStructured(true);
      try {
        // Map technology IDs to structured content categories
        const categoryMap: Record<string, string> = {
          'lighting': 'lighting',
          'chillers': 'hvac',
          'cooling-systems': 'hvac',
          'cooling-tower': 'hvac',
          'boilers': 'hvac',
          'vrf': 'hvac',
          'vfd': 'hvac',
          'ahu': 'hvac',
          'battery': 'battery',
        };

        const category = categoryMap[selectedTech];
        if (category) {
          const content = await getTrainingContentByCategory(category);
          setStructuredContent(content);
        } else {
          // For technologies without specific category, load all and filter by title/keywords
          const allContent = await getAllTrainingContent();
          const techKeywords: Record<string, string[]> = {
            'lighting': ['lighting', 'led', 'lamp', 'fixture', 'bulb'],
            'chillers': ['chiller', 'chilled water', 'centrifugal', 'screw'],
            'cooling-systems': ['cooling', 'chiller', 'hvac', 'air conditioning'],
            'cooling-tower': ['cooling tower', 'tower', 'condenser'],
            'boilers': ['boiler', 'steam', 'hot water', 'heating'],
            'vrf': ['vrf', 'vrv', 'variable refrigerant', 'heat pump'],
            'vfd': ['vfd', 'variable frequency', 'drive', 'motor'],
            'ahu': ['ahu', 'air handling', 'ventilation', 'air distribution'],
            'battery': ['battery', 'bess', 'energy storage', 'storage'],
          };

          const keywords = techKeywords[selectedTech] || [];
          const filtered = allContent.filter(content => {
            const titleLower = content.title.toLowerCase();
            const contentText = JSON.stringify(content.sections).toLowerCase();
            return keywords.some(keyword => 
              titleLower.includes(keyword) || contentText.includes(keyword)
            );
          });
          setStructuredContent(filtered);
        }
      } catch (error) {
        console.error('Error loading structured training content:', error);
        setStructuredContent([]);
      } finally {
        setLoadingStructured(false);
      }
    };

    if (selectedTech && selectedTech !== 'master-database' && selectedTech !== 'ahu') {
      loadStructuredContent();
    } else {
      setStructuredContent([]);
    }
  }, [selectedTech]);

  const technologies = [
    { id: 'lighting', name: 'LED Lighting & Controls', icon: '💡' },
    { id: 'cooling-systems', name: 'Cooling Systems (Complete)', icon: '❄️' },
    { id: 'chillers', name: 'Water-Cooled Chillers', icon: '❄️' },
    { id: 'boilers', name: 'Commercial Boilers', icon: '🔥' },
    { id: 'ahu', name: 'Air Handling Units (AHUs)', icon: '💨' },
    { id: 'vrf', name: 'Heat Pumps', icon: '🌡️' },
    { id: 'vfd', name: 'Variable Frequency Drives', icon: '⚙️' },
    { id: 'cooling-tower', name: 'Cooling Towers', icon: '🌊' },
    { id: 'battery', name: 'Battery Storage (BESS)', icon: '🔋' },
    { id: 'master-database', name: 'Master Equipment Database', icon: '📚' },
  ];

  const handleGenerateDeepDive = (title: string) => {
    void (async () => {
      setDeepDiveTitle(title);
      setDeepDiveText('');
      setDeepDiveError(null);
      setDeepDiveLoading(true);

      const training = getTrainingContent(selectedTech);
      const structuredPreview = structuredContent
        .slice(0, 3)
        .map((d) => {
          const excerpt = d.sections
            .slice(0, 3)
            .map((s) => `${s.heading ? `${s.heading}: ` : ''}${s.content}`)
            .join('\n');
          return `# ${d.title}\n${excerpt}`;
        })
        .join('\n\n');

      const context = [
        `Technology: ${selectedTech}`,
        `Title: ${title}`,
        training ? `Training content keys: ${Object.keys(training).join(', ')}` : '',
        structuredPreview ? `Structured training excerpt:\n${structuredPreview}` : '',
      ]
        .filter(Boolean)
        .join('\n\n')
        .slice(0, 6000);

      const fallbackText = [
        `Deep Dive: ${title}`,
        '',
        '## Overview',
        `This section provides a practical deep dive into ${title} with an audit-first mindset.`,
        '',
        '## What to look for on-site',
        '- Nameplate details (model, capacity, efficiency, refrigerant/fuel type)',
        '- Control sequence and setpoints (schedules, resets, deadbands)',
        '- Operating hours and load profile (peak vs off-peak behavior)',
        '- Maintenance history and known issues',
        '',
        '## Common efficiency opportunities',
        '- Control optimization (setpoint resets, scheduling, lockouts, staging)',
        '- Equipment right-sizing and part-load performance improvements',
        '- Heat recovery / economizer optimization where applicable',
        '- Preventive maintenance and sensor calibration',
        '',
        '## Data to collect for calculations',
        '- Baseline energy and demand (interval data if available)',
        '- Runtime / trend logs (BMS exports if available)',
        '- Equipment inventory (counts, capacities, efficiencies)',
        '- Utility rate and demand charges',
        '',
        '## Next steps',
        '- Identify 1–3 candidate measures and estimate savings',
        '- Confirm incentives and M&V requirements for the chosen path',
      ].join('\n');

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content:
                  'You are a senior energy engineer. Produce a concise but thorough technology deep dive with headings and bullet checklists. State assumptions and units. Avoid fluff.',
              },
              {
                role: 'user',
                content: `Generate a deep dive for this technology.\n\n${context}`,
              },
            ],
            temperature: 0.2,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || `AI request failed (${res.status})`);
        }
        setDeepDiveText(String(data.text || '').trim() || fallbackText);
      } catch (e) {
        setDeepDiveError(e instanceof Error ? e.message : 'Failed to generate deep dive');
        setDeepDiveText(fallbackText);
      } finally {
        setDeepDiveLoading(false);
      }
    })();
  };

  const renderTechContent = () => {
    // Special handling for master database
    if (selectedTech === 'master-database') {
      return (
        <div className="h-full">
          <MasterEquipmentExplorer />
        </div>
      );
    }
    
    // Special handling for AHUs - show filtered Master Equipment Explorer
    if (selectedTech === 'ahu') {
      return (
        <div className="h-full">
          <MasterEquipmentExplorer 
            category="air-distribution-ventilation"
            subcategory="air-handling-units-ahus-"
          />
        </div>
      );
    }
    
    // Special handling for lighting - show master compendium option
    if (selectedTech === 'lighting') {
      if (lightingView === 'compendium') {
        return (
          <div className="h-full overflow-auto">
            <div className="max-w-7xl mx-auto p-4">
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() => setLightingView('training')}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  ← Back to Training Content
                </button>
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setLightingView('training')}
                    className="px-4 py-2 rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-900"
                  >
                    Training Content
                  </button>
                  <button
                    onClick={() => setLightingView('compendium')}
                    className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-white text-blue-600 shadow-sm"
                  >
                    Master Compendium
                  </button>
                </div>
              </div>
              <LightingMasterCompendium />
            </div>
          </div>
        );
      }
      
      // Show training content with toggle
      const content = getTrainingContent(selectedTech);
      if (!content) return null;
      
      return (
        <div>
          <div className="max-w-5xl mx-auto px-8 pt-4 pb-2">
            <div className="flex items-center justify-end mb-4">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setLightingView('training')}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-white text-blue-600 shadow-sm"
                >
                  Training Content
                </button>
                <button
                  onClick={() => setLightingView('compendium')}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-900"
                >
                  Master Compendium
                </button>
              </div>
            </div>
          </div>
          {(() => {
            let schematicComponent = (
              <LightingSchematic
                activeComponent={activeComponent}
                setActiveComponent={setActiveComponent}
                tooltipData={content.tooltipData}
              />
            );
            return (
              <TechPageLayout
                data={content as TechPageData}
                schematicComponent={schematicComponent}
                onGenerate={handleGenerateDeepDive}
              />
            );
          })()}
        </div>
      );
    }
    
    const content = getTrainingContent(selectedTech);
    
    if (!content) {
      return (
        <div className="max-w-5xl mx-auto p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Technology Training</h1>
          <p className="text-gray-600">
            Select a technology from the sidebar to view training content.
          </p>
        </div>
      );
    }

    // Render with appropriate schematic based on technology
    let schematicComponent = null;

    if (content.tooltipData) {
      switch (selectedTech) {
        case 'lighting':
          schematicComponent = (
            <LightingSchematic
              activeComponent={activeComponent}
              setActiveComponent={setActiveComponent}
              tooltipData={content.tooltipData}
            />
          );
          break;
        case 'chillers':
          schematicComponent = (
            <InteractiveChillerSchematic
              activeComponent={activeComponent}
              setActiveComponent={setActiveComponent}
              tooltipData={content.tooltipData}
            />
          );
          break;
        case 'boilers':
          schematicComponent = (
            <BoilerSchematic
              activeComponent={activeComponent}
              setActiveComponent={setActiveComponent}
              tooltipData={content.tooltipData}
            />
          );
          break;
        case 'vfd':
          schematicComponent = (
            <VFDSchematic
              activeComponent={activeComponent}
              setActiveComponent={setActiveComponent}
              tooltipData={content.tooltipData}
            />
          );
          break;
        case 'vrf':
          schematicComponent = (
            <VRFSchematic
              activeComponent={activeComponent}
              setActiveComponent={setActiveComponent}
              tooltipData={content.tooltipData}
            />
          );
          break;
        case 'battery':
          schematicComponent = (
            <InteractiveBatterySchematic
              activeComponent={activeComponent}
              setActiveComponent={setActiveComponent}
              tooltipData={content.tooltipData}
            />
          );
          break;
        case 'cooling-tower':
        case 'tower':
          schematicComponent = (
            <CoolingTowerSchematic
              activeComponent={activeComponent}
              setActiveComponent={setActiveComponent}
              tooltipData={content.tooltipData}
            />
          );
          break;
        default:
          // No schematic for other technologies yet
          break;
      }
    }

    // Special handling for cooling-systems: show training content + measures section
    if (selectedTech === 'cooling-systems') {
      const coolingCategory = masterEEDatabase.categories.find(cat => cat.id === 'cooling-systems');

      const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      
      const toggleSubcategory = (subcategoryId: string) => {
        const newExpanded = new Set(expandedCoolingSubcategories);
        if (newExpanded.has(subcategoryId)) {
          newExpanded.delete(subcategoryId);
        } else {
          newExpanded.add(subcategoryId);
        }
        setExpandedCoolingSubcategories(newExpanded);
      };

      const sectionItems: TrainingSectionItem[] = Array.isArray((content as any)?.sections)
        ? ((content as any).sections as any[]).map((s) => ({
            id: String(s.id || s.title || '').toLowerCase().replace(/\s+/g, '-'),
            title: String(s.title || ''),
            icon: s.icon ? String(s.icon) : undefined,
            summary: s.summary ? String(s.summary) : undefined,
            content: String(s.content || ''),
            estimatedTime: typeof s.estimatedTime === 'number' ? s.estimatedTime : undefined,
            roles: Array.isArray(s.roles) ? (s.roles as any) : undefined,
            tags: Array.isArray(s.tags) ? (s.tags as any) : undefined,
          }))
        : [];

      const overviewCards = Array.isArray((content as any)?.overviewCards) ? ((content as any).overviewCards as any[]) : [];

      return (
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main */}
            <div className="lg:col-span-9">
              <TechPageLayout
                data={content}
                schematicComponent={schematicComponent}
                onGenerate={handleGenerateDeepDive}
                headerRight={
                  <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1 border border-slate-200">
                    <button
                      onClick={() => {
                        setCoolingSystemsView('overview');
                        setCoolingRole('sales');
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        coolingSystemsView === 'overview'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Sales Basics
                    </button>
                    <button
                      onClick={() => {
                        setCoolingSystemsView('deep');
                        setCoolingRole('all');
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        coolingSystemsView === 'deep'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Deep Dive
                    </button>
                  </div>
                }
                belowHeader={
                  <div className="space-y-5">
                    {/* Role chips */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Audience</span>
                      {(['all', 'sales', 'engineer', 'field'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setCoolingRole(r)}
                          className={[
                            'px-3 py-2 rounded-full text-xs font-semibold border transition-colors',
                            coolingRole === r
                              ? 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white border-transparent shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50',
                          ].join(' ')}
                        >
                          {r}
                        </button>
                      ))}
                    </div>

                    {/* Quick overview cards */}
                    {coolingSystemsView === 'overview' && overviewCards.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {overviewCards.map((card) => (
                          <button
                            key={String(card.id)}
                            type="button"
                            onClick={() => {
                              const jumpId = String(card.jumpToSectionId || '');
                              if (jumpId) {
                                setCoolingSystemsView('deep');
                                setCoolingAutoExpandId(jumpId);
                                setTimeout(() => scrollToSection(jumpId), 0);
                              }
                            }}
                            className="text-left bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-pink-600 text-white flex items-center justify-center shadow-md">
                                <span className="text-xl">{String(card.icon || '✨')}</span>
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-bold text-slate-900">{String(card.title || '')}</h3>
                                <p className="text-sm text-slate-600 mt-1 line-clamp-3">{String(card.description || '')}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                }
                belowCore={
                  <div className="mt-8 space-y-8">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                      <CoolingSystemMap
                        mode={coolingSystemsView}
                        onJumpToSection={(id) => {
                          setCoolingSystemsView('deep');
                          setCoolingAutoExpandId(id);
                          scrollToSection(id);
                        }}
                        onGenerateDeepDive={(title) => handleGenerateDeepDive(title)}
                      />
                    </div>

                    {/* Deep training sections */}
                    {sectionItems.length > 0 && (
                      <div className="bg-gradient-to-br from-slate-50 via-indigo-50 to-pink-50 rounded-2xl border border-slate-200 p-6">
                        <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
                          <div>
                            <h2 className="text-2xl font-extrabold text-slate-900">Deep Training</h2>
                            <p className="text-sm text-slate-600 mt-1">
                              Expand a section, or use the right-hand mini-TOC to jump fast.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCoolingSystemsView('deep')}
                            className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50"
                          >
                            Focus mode
                          </button>
                        </div>

                        <TrainingSectionAccordion
                          sections={sectionItems}
                          mode={coolingSystemsView}
                          roleFilter={coolingRole}
                          onGenerateDeepDive={handleGenerateDeepDive}
                          autoExpandId={coolingAutoExpandId}
                        />
                      </div>
                    )}
                  </div>
                }
              />

          {/* All Individual Measures Section */}
          <div id="cooling-measures" className="mt-12 bg-white rounded-xl border-2 border-blue-200 shadow-lg overflow-hidden">
            <button
              onClick={() => setShowCoolingMeasures(!showCoolingMeasures)}
              className="w-full flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">All Individual Measures</h2>
                <span className="text-sm text-gray-600">
                  ({coolingCategory?.subcategories.reduce((sum, sub) => sum + sub.measures.length, 0) || 0} total measures)
                </span>
              </div>
              <svg
                className={`w-6 h-6 text-gray-600 transition-transform ${showCoolingMeasures ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showCoolingMeasures && coolingCategory && (
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-600 mb-6">
                  Complete list of all cooling system measures from your Word document. Click any subcategory to see individual measures.
                </p>
                
                <div className="space-y-4">
                  {coolingCategory.subcategories.map((subcategory) => {
                    const isExpanded = expandedCoolingSubcategories.has(subcategory.id);
                    
                    return (
                      <div key={subcategory.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <button
                          onClick={() => toggleSubcategory(subcategory.id)}
                          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-semibold">
                                {isExpanded ? '−' : '+'}
                              </span>
                            </div>
                            <div className="text-left">
                              <h3 className="text-lg font-semibold text-gray-900">{subcategory.name}</h3>
                              <p className="text-sm text-gray-500 mt-1">
                                {subcategory.measures.length} {subcategory.measures.length === 1 ? 'measure' : 'measures'}
                              </p>
                            </div>
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-gray-200 bg-gray-50 p-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {subcategory.measures.map((measure) => (
                                <div
                                  key={measure.id}
                                  className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                                >
                                  <h4 className="font-medium text-gray-900 mb-2">{measure.name}</h4>
                                  {measure.keywords.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {measure.keywords.map((keyword, idx) => (
                                        <span
                                          key={idx}
                                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                                        >
                                          {keyword}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
            </div>

            {/* Sticky mini-TOC */}
            <aside className="lg:col-span-3">
              <div className="lg:sticky lg:top-6 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-pink-600 text-white">
                    <div className="font-bold">Jump to Section</div>
                    <div className="text-xs text-white/80">Fast navigation within Cooling Systems</div>
                  </div>
                  <div className="p-4 space-y-2">
                    <button
                      type="button"
                      onClick={() => scrollToSection('introduction')}
                      className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 border border-slate-200"
                    >
                      📚 Introduction
                    </button>
                    {sectionItems.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setCoolingSystemsView('deep');
                          scrollToSection(s.id);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 border border-slate-200"
                      >
                        {s.icon ? `${s.icon} ` : ''}{s.title}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setShowCoolingMeasures(true);
                        setTimeout(() => scrollToSection('cooling-measures'), 0);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-indigo-700 hover:bg-indigo-50 border border-indigo-200"
                    >
                      📋 All Individual Measures
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </div>

        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto">
        {/* Basic Training Content */}
        <TechPageLayout
          data={content}
          schematicComponent={schematicComponent}
          onGenerate={handleGenerateDeepDive}
        />

        {/* Comprehensive Structured Training Content */}
        {structuredContent.length > 0 && (
          <div className="mt-12 bg-white rounded-xl border-2 border-blue-200 shadow-lg overflow-hidden">
            <button
              onClick={() => setShowStructuredContent(!showStructuredContent)}
              className="w-full flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">
                  Comprehensive Training Library
                </h2>
                <span className="text-sm text-gray-600 bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                  {structuredContent.length} {structuredContent.length === 1 ? 'document' : 'documents'} • {structuredContent.reduce((sum, doc) => sum + doc.sections.length, 0)} sections
                </span>
              </div>
              <svg
                className={`w-6 h-6 text-gray-600 transition-transform ${showStructuredContent ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showStructuredContent && (
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                {loadingStructured ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading comprehensive training content...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-6">
                      Complete training content extracted from PDFs, Word documents, and technical manuals. 
                      This is the full knowledge base with {structuredContent.reduce((sum, doc) => sum + doc.sections.length, 0)} detailed sections.
                    </p>
                    
                    <div className="space-y-4">
                      {structuredContent.map((doc) => (
                        <div key={doc.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                          <div className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">{doc.title}</h3>
                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                  <span className="px-2 py-1 bg-gray-100 rounded">{doc.category}</span>
                                  <span>Source: {doc.source}</span>
                                  {doc.sections.length > 0 && (
                                    <span>{doc.sections.length} {doc.sections.length === 1 ? 'section' : 'sections'}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                              {doc.sections.map((section, idx) => (
                                <div key={idx} className="border-l-4 border-blue-200 pl-4 py-2">
                                  {section.heading && section.heading.trim() && (
                                    <h4 className="font-medium text-gray-900 mb-1">{section.heading}</h4>
                                  )}
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{section.content}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex ${embedded ? 'h-full' : 'h-screen'} bg-gray-50`}>
      {/* Technology Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Technologies</h2>
          <p className="text-xs text-gray-500">Select a technology to explore</p>
        </div>
        
        <nav className="p-4 space-y-2">
          {technologies.map((tech) => (
            <button
              key={tech.id}
              onClick={() => setSelectedTech(tech.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                selectedTech === tech.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{tech.icon}</span>
              <span>{tech.name}</span>
            </button>
          ))}
        </nav>

        {/* Quick Links */}
        <div className="p-4 border-t border-gray-200 mt-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Quick Links</h3>
          <div className="space-y-1">
            <a 
              href="/equipment-library" 
              className="block text-xs text-gray-600 hover:text-blue-600 px-2 py-1"
            >
              → Equipment Library
            </a>
            <a 
              href="/measures-library" 
              className="block text-xs text-gray-600 hover:text-blue-600 px-2 py-1"
            >
              → Measures Library
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8">
          {renderTechContent()}
        </div>
      </main>

      {/* Deep Dive Modal */}
      {deepDiveTitle && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            if (!deepDiveLoading) setDeepDiveTitle(null);
          }}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{deepDiveTitle}</h3>
                  <p className="text-sm text-gray-500">Generated deep dive (AI-assisted when configured)</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(deepDiveText || '').catch(() => {});
                    }}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                    disabled={!deepDiveText}
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => setDeepDiveTitle(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                    disabled={deepDiveLoading}
                  >
                    ×
                  </button>
                </div>
              </div>

              {deepDiveError && (
                <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  {deepDiveError}
                </div>
              )}

              {deepDiveLoading ? (
                <div className="text-gray-600">Generating…</div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  {deepDiveText}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

