/**
 * Utilities and Programs Landing Page
 * Comprehensive resource for utility rates, programs, OBF financing, and incentives
 * Well-organized, searchable, and easy to navigate
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Building2, 
  Users, 
  ArrowRight,
  Zap,
  Award,
  TrendingUp,
  DollarSign,
  Search,
  CheckCircle,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  defaultUtilityPrograms, 
  obfEligibilityRules, 
  obfEligibilityByCategory,
  getEligibleMeasuresByUtility,
  pgeOBFPathways as simplePathways,
  nmecPathways,
  type UtilityProvider,
  type PGEOBFPathway,
  type NMECPathway
} from '../data/obf/obf-eligibility';
import { 
  pgeOBFPathways,
  getRequiredDocumentsForPathway,
  type PGEOBFPathwayType
} from '../data/pge/pge-obf-pathways';
import { OBFCalculator } from '../components/obf/OBFCalculator';
import { PathwayComparison } from '../components/obf/PathwayComparison';
import { utilityPrograms } from '../data/utility-programs';
import { getAllRates } from '../utils/rates';

export const UtilitiesAndProgramsLanding: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'obf' | 'rates' | 'programs'>('overview');
  const [expandedOBFSection, setExpandedOBFSection] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const rates = getAllRates();
  const utilityProgramsList = utilityPrograms;

  const sections = [
    {
      id: 'rates',
      title: 'Utility Rate Schedules',
      description: 'Comprehensive library of utility rate schedules including TOU, tiered, demand, and blended rates. Filter by utility, rate type, and service type.',
      icon: FileText,
      gradient: 'from-blue-600 to-indigo-600',
      route: '/utilities/rates',
      stats: `${rates.length}+ Rate Schedules`,
      badge: 'Legacy/Beta',
    },
    {
      id: 'tariffs-ca',
      title: 'Tariffs (CA)',
      description: 'Browse the latest CA IOU tariff snapshots (metadata only) with staleness and source links.',
      icon: FileText,
      gradient: 'from-cyan-600 to-blue-600',
      route: '/utilities/tariffs-ca',
      stats: 'PG&E • SCE • SDG&E',
      badge: 'Authoritative',
    },
    {
      id: 'utility-programs',
      title: 'Utility Programs',
      description: 'Direct utility-sponsored programs including rebates, incentives, and demand response programs offered by PG&E, SCE, SDG&E, and other California utilities.',
      icon: Building2,
      gradient: 'from-green-600 to-emerald-600',
      route: '/utilities/programs',
      stats: `${utilityProgramsList.length} Programs`,
      badge: 'Legacy/Beta',
    },
    {
      id: '3p-programs',
      title: '3P Programs',
      description: 'Third-party energy efficiency programs including statewide initiatives, market transformation programs, and custom commercial/industrial projects.',
      icon: Users,
      gradient: 'from-purple-600 to-pink-600',
      route: '/utilities/3p-programs',
      stats: '100+ Programs',
      badge: 'Legacy/Beta',
    },
    {
      id: 'incentives',
      title: 'Incentives',
      description: 'Incentive intelligence will be layered on top of tariffs and program structure once snapshots + provenance are finalized.',
      icon: Award,
      gradient: 'from-slate-400 to-slate-500',
      route: '',
      stats: 'Coming soon',
      badge: 'Coming soon',
      disabled: true,
    },
  ];

  const toggleOBFSection = (section: string) => {
    setExpandedOBFSection(expandedOBFSection === section ? null : section);
  };

  const filteredUtilityPrograms = searchTerm
    ? utilityProgramsList.filter(program =>
        program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        program.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        program.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : utilityProgramsList;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Utilities & Programs</h1>
              <p className="text-slate-600 mt-2">
                Comprehensive resource for utility rates, On-Bill Financing (OBF), rebates, and energy efficiency programs
              </p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-slate-800">
            <div className="font-semibold text-slate-900">Authoritative, versioned utility intelligence</div>
            <div className="text-slate-700 mt-1">
              This module provides authoritative utility rate and program intelligence used by EverWatt analyses. All data is versioned and traceable.
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{rates.length}+</p>
                <p className="text-sm text-slate-600">Rate Schedules</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{utilityProgramsList.length}+</p>
                <p className="text-sm text-slate-600">Utility Programs</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">0%</p>
                <p className="text-sm text-slate-600">OBF Interest</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">4</p>
                <p className="text-sm text-slate-600">Major Utilities</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="flex border-b border-slate-200">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'obf', label: 'On-Bill Financing (OBF)' },
              { id: 'rates', label: 'Rate Schedules' },
              { id: 'programs', label: 'Utility Programs' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Main Sections */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <div
                      key={section.id}
                      onClick={() => {
                        if (section.disabled) return;
                        if (section.route) navigate(section.route);
                      }}
                      className={[
                        'group bg-white rounded-2xl p-8 shadow-sm border border-slate-200 transition-all',
                        section.disabled ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-xl hover:border-slate-300 cursor-pointer',
                      ].join(' ')}
                    >
                      <div className={`w-16 h-16 bg-gradient-to-br ${section.gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h2 className="text-2xl font-bold text-slate-900">{section.title}</h2>
                        {section.badge && (
                          <span
                            className={[
                              'px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap',
                              section.badge === 'Authoritative'
                                ? 'bg-blue-100 text-blue-800'
                                : section.badge === 'Coming soon'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-amber-100 text-amber-800',
                            ].join(' ')}
                            title={
                              section.badge === 'Authoritative'
                                ? 'Snapshot-backed, versioned, and traceable (metadata only).'
                                : section.badge === 'Coming soon'
                                  ? 'Scaffold only (disabled).'
                                  : 'Legacy/beta surface; not DSIRE-audited yet.'
                            }
                          >
                            {section.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 mb-6 leading-relaxed">{section.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-500">{section.stats}</span>
                        {!section.disabled && (
                          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* OBF Quick Overview */}
              <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">On-Bill Financing (OBF)</h2>
                    <p className="text-slate-600">0% interest financing for energy efficiency projects</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">What is OBF?</h3>
                    <p className="text-slate-600 mb-4">
                      On-Bill Financing (OBF) is a utility-sponsored financing program that allows commercial customers 
                      to finance energy efficiency upgrades with <strong>0% interest</strong> and repay the loan through 
                      their monthly utility bill. The loan is tied to the meter, not the customer, making it transferable 
                      if the property is sold.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Key Benefits</h3>
                    <ul className="space-y-2 text-slate-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span><strong>0% interest</strong> - No interest charges on the loan</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span><strong>Up to $400,000</strong> per project (PG&E 2026), <strong>$6M</strong> per account (varies by utility)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span><strong>10-year terms</strong> - Extended repayment periods</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span><strong>Meter-based</strong> - Loan transfers with property</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('obf')}
                  className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2"
                >
                  Learn More About OBF
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* OBF Tab */}
          {activeTab === 'obf' && (
            <div className="space-y-6">
              {/* OBF Overview */}
              <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">On-Bill Financing (OBF)</h2>
                    <p className="text-slate-600">Comprehensive guide to utility On-Bill Financing programs</p>
                  </div>
                </div>

                {/* What is OBF */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">What is On-Bill Financing?</h3>
                  <div className="prose max-w-none text-slate-700 space-y-4">
                    <p>
                      <strong>On-Bill Financing (OBF)</strong> is a utility-sponsored financing program that enables 
                      commercial and industrial customers to finance energy efficiency upgrades with <strong>0% interest</strong> 
                      and repay the loan through their monthly utility bill. This innovative financing mechanism makes 
                      energy efficiency projects more accessible by eliminating upfront capital requirements.
                    </p>
                    <p>
                      The loan is <strong>meter-based</strong>, meaning it's tied to the utility meter rather than the 
                      customer. This unique feature allows the loan to transfer with the property if it's sold, making 
                      OBF an attractive option for property owners and tenants alike.
                    </p>
                  </div>
                </div>

                {/* How OBF Works */}
                <div className="mb-8">
                  <button
                    onClick={() => toggleOBFSection('how-it-works')}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <h3 className="text-lg font-bold text-slate-900">How OBF Works</h3>
                    {expandedOBFSection === 'how-it-works' ? (
                      <ChevronUp className="w-5 h-5 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-600" />
                    )}
                  </button>
                  {expandedOBFSection === 'how-it-works' && (
                    <div className="mt-4 p-6 bg-slate-50 rounded-lg space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-1">1</div>
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-1">Project Identification</h4>
                            <p className="text-slate-600">Identify eligible energy efficiency measures that meet OBF requirements (equipment-based with measurable savings).</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-1">2</div>
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-1">Application & Approval</h4>
                            <p className="text-slate-600">Submit application to utility with project details, savings calculations, and contractor information. Utility reviews and approves eligible projects.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-1">3</div>
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-1">Installation</h4>
                            <p className="text-slate-600">Licensed contractor installs equipment. Utility may require pre/post installation verification.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-1">4</div>
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-1">Financing & Repayment</h4>
                            <p className="text-slate-600">Utility funds the project upfront. Customer repays loan through monthly utility bill over the term (typically 5-10 years at 0% interest).</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* NMEC Pathways Explanation */}
                <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-3">Understanding NMEC Pathways</h3>
                  <p className="text-slate-700 mb-4">
                    NMEC (Normalized Metered Energy Consumption) has <strong>two distinct pathways</strong>:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(nmecPathways).map(([key, pathway]) => (
                      <div key={key} className="bg-white rounded-lg p-4 border border-blue-200">
                        <h4 className="font-bold text-slate-900 mb-2">{pathway.name}</h4>
                        <p className="text-sm text-slate-600 mb-2">{pathway.description}</p>
                        <p className="text-xs text-slate-700 mb-2"><strong>Use Case:</strong> {pathway.useCase}</p>
                        {pathway.notes && (
                          <p className="text-xs text-blue-700 font-semibold">{pathway.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-white rounded border border-blue-300">
                    <p className="text-sm text-slate-700">
                      <strong>Note for OBF:</strong> Only <strong>Site-Specific NMEC (Site_NMEC)</strong> is used for On-Bill Financing projects. 
                      Population-Level NMEC (Pop-NMEC) is used for Market Access Programs (MAP) with aggregated portfolios, not individual OBF projects.
                    </p>
                  </div>
                </div>

                {/* PG&E OBF Pathways */}
                {defaultUtilityPrograms.PGE.pathways && (
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">PG&E OBF Pathways</h3>
                    <p className="text-slate-600 mb-4">
                      PG&E offers three distinct pathways for On-Bill Financing, each suited for different project types:
                    </p>
                    <div className="mb-6">
                      <PathwayComparison onSelectPathway={(id) => navigate(`/utilities/obf/pathway/${id}`)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {defaultUtilityPrograms.PGE.pathways.map((pathway) => {
                        const pathwayInfo = pgeOBFPathways[pathway as PGEOBFPathwayType];
                        const requiredDocs = getRequiredDocumentsForPathway(pathway as PGEOBFPathwayType);
                        return (
                          <div key={pathway} className="border border-slate-200 rounded-lg p-6 bg-slate-50">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-bold text-slate-900">{pathwayInfo.name}</h4>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {pathwayInfo.typicalTimeline.review}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mb-3">{pathwayInfo.description}</p>
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-slate-700 mb-1">Best For:</p>
                              <p className="text-xs text-slate-600">{pathwayInfo.useCase}</p>
                            </div>
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-slate-700 mb-1">Key Requirements:</p>
                              <ul className="text-xs text-slate-600 space-y-1">
                                {pathwayInfo.requirements.slice(0, 3).map((req) => (
                                  <li key={req.id} className="flex items-start gap-1">
                                    <span className="text-blue-600 mt-0.5">•</span>
                                    <span>{req.requirement}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-slate-700 mb-1">
                                Required Documents ({requiredDocs.length}):
                              </p>
                              <p className="text-xs text-slate-500">
                                {requiredDocs.slice(0, 3).map(d => d.name).join(', ')}
                                {requiredDocs.length > 3 && ` +${requiredDocs.length - 3} more`}
                              </p>
                            </div>
                            {pathwayInfo.energyInsightAccess && (
                              <div className="mt-3 pt-3 border-t border-slate-200">
                                <p className="text-xs font-semibold text-slate-700 mb-1">3P Access:</p>
                                <p className="text-xs text-green-600">
                                  {pathwayInfo.energyInsightAccess.can3PSubmit ? '✓ 3P can submit via Energy Insight' : '✗ Direct to PG&E only'}
                                </p>
                              </div>
                            )}
                            {pathwayInfo.notes && (
                              <div className="mt-3 pt-3 border-t border-slate-200">
                                <p className="text-xs text-slate-500 italic">{pathwayInfo.notes}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-slate-700">
                        <strong>Tip:</strong> Use the selector and checker tools to quickly triage which pathway fits your project before
                        assembling a full document package.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => navigate('/utilities/obf/selector')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Open Pathway Selector
                        </button>
                        <button
                          onClick={() => navigate('/utilities/obf/checker')}
                          className="px-4 py-2 bg-white border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-50"
                        >
                          Check Measure Eligibility
                        </button>
                        <button
                          onClick={() => navigate('/utilities/obf/workflow?pathway=prescriptive')}
                          className="px-4 py-2 bg-white border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-50"
                        >
                          Start Submission Workflow
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-10">
                  <OBFCalculator initialUtility="PGE" initialProjectCost={150000} />
                </div>

                {/* Utility Programs */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Utility OBF Programs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(defaultUtilityPrograms).map(([key, program]) => {
                      const utilityName = key as UtilityProvider;
                      return (
                        <div key={key} className="border border-slate-200 rounded-lg p-6 bg-slate-50">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-slate-900">{program.name}</h4>
                            {program.lastUpdated && (
                              <span className="text-xs text-slate-500 bg-blue-100 px-2 py-1 rounded">Updated {program.lastUpdated}</span>
                            )}
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Max per Project:</span>
                              <span className="font-semibold">${program.defaultMaxFinancing.toLocaleString()}</span>
                            </div>
                            {program.maxPerAccount && (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Max per Account:</span>
                                <span className="font-semibold text-blue-600">${program.maxPerAccount.toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-slate-600">Interest Rate:</span>
                              <span className="font-semibold text-green-600">{program.defaultInterestRate}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Max Term:</span>
                              <span className="font-semibold">{program.defaultMaxTerm} months</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Min Project Cost:</span>
                              <span className="font-semibold">${program.minProjectCost.toLocaleString()}</span>
                            </div>
                            {program.thirdPartyAccess && (
                              <div className="mt-3 pt-3 border-t border-slate-200">
                                <p className="text-xs font-semibold text-slate-700 mb-1">3P Access:</p>
                                <p className="text-xs text-slate-600">
                                  {program.thirdPartyAccess.canHandleOBF ? (
                                    <>
                                      <span className="text-green-600 font-semibold">✓ 3P can handle OBF</span>
                                      {program.thirdPartyAccess.systemAccess && (
                                        <span className="block mt-1">via {program.thirdPartyAccess.systemAccess}</span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-slate-600">✗ 3P only handles rebates/incentives</span>
                                  )}
                                </p>
                                {program.thirdPartyAccess.notes && (
                                  <p className="text-xs text-slate-500 mt-1 italic">{program.thirdPartyAccess.notes}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Eligibility Requirements */}
                <div className="mb-8">
                  <button
                    onClick={() => toggleOBFSection('eligibility')}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <h3 className="text-lg font-bold text-slate-900">Eligibility Requirements</h3>
                    {expandedOBFSection === 'eligibility' ? (
                      <ChevronUp className="w-5 h-5 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-600" />
                    )}
                  </button>
                  {expandedOBFSection === 'eligibility' && (
                    <div className="mt-4 p-6 bg-slate-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            Typically Eligible
                          </h4>
                          <ul className="space-y-2 text-slate-600">
                            {obfEligibilityRules.typicallyEligible.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-green-600 mt-1">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-600" />
                            Typically NOT Eligible
                          </h4>
                          <ul className="space-y-2 text-slate-600">
                            {obfEligibilityRules.typicallyNotEligible.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-red-600 mt-1">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="mt-6 pt-6 border-t border-slate-200">
                        <h4 className="font-semibold text-slate-900 mb-3">General Requirements</h4>
                        <ul className="space-y-2 text-slate-600">
                          {obfEligibilityRules.generalRequirements.map((req, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Eligibility by Category */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Eligibility by Measure Category</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(obfEligibilityByCategory).map(([category, info]) => (
                      <div
                        key={category}
                        className={`border rounded-lg p-4 ${
                          info.generallyEligible
                            ? 'border-green-200 bg-green-50'
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {info.generallyEligible ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <h4 className="font-semibold text-slate-900 capitalize">{category}</h4>
                        </div>
                        <p className="text-sm text-slate-600">{info.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rates Tab */}
          {activeTab === 'rates' && (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Utility Rate Schedules</h2>
                  <p className="text-slate-600">Browse and search utility rate schedules</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/utilities/rates')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                View All Rate Schedules
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Programs Tab */}
          {activeTab === 'programs' && (
            <div className="space-y-6">
              {/* Search */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search utility programs by name, category, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Programs List */}
              <div className="space-y-4">
                {filteredUtilityPrograms.length === 0 ? (
                  <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-200">
                    <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 text-lg">No programs found matching your search</p>
                  </div>
                ) : (
                  filteredUtilityPrograms.map((program) => (
                    <div
                      key={program.id}
                      className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-slate-900">{program.name}</h3>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                              {program.utility}
                            </span>
                            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                              {program.category}
                            </span>
                          </div>
                          <p className="text-slate-600">{program.summary}</p>
                        </div>
                      </div>
                      {program.details && (
                        <div className="mb-4">
                          <p className="text-slate-700">{program.details}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {program.eligibility && program.eligibility.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-2">Eligibility</h4>
                            <ul className="space-y-1 text-sm text-slate-600">
                              {program.eligibility.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {program.incentives && program.incentives.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-2">Incentives</h4>
                            <ul className="space-y-1 text-sm text-slate-600">
                              {program.incentives.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <Award className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      {program.links && program.links.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="flex flex-wrap gap-2">
                            {program.links.map((link, idx) => (
                              <a
                                key={idx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
                              >
                                {link.label} →
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
