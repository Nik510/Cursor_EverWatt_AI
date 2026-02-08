/**
 * 3P Programs (Third-Party Energy Efficiency Programs)
 * Redesigned with better organization and clarity
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Users, Search, Filter, ArrowLeft, Building2, Award, TrendingUp,
  ChevronDown, ChevronUp, MapPin, Briefcase, Home, Factory, School,
  X, Tag, AlertCircle
} from 'lucide-react';
import structuredProgramsDataRaw from '../utils/programs/data/3p-programs-structured.json';
import type { StructuredThreePartyPrograms, ThreePartyProgram } from '../utils/programs/types/3p-program-types';
import { StructuredThreePartyProgramsSchema } from '../utils/programs/types/3p-program-zod';
import { logger } from '../services/logger';

export const ThreePPrograms: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<StructuredThreePartyPrograms>({
    programs: [],
    metadata: {
      totalPrograms: 0,
      utilities: [],
      implementers: [],
      sectors: [],
      programTypes: [],
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    try {
      const parsed = StructuredThreePartyProgramsSchema.safeParse(structuredProgramsDataRaw);
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => i.message).slice(0, 6).join('; ');
        throw new Error(msg || 'Invalid 3P programs data');
      }

      setData(parsed.data);
      setError(null);
    } catch (err) {
      logger.error('Error loading 3P programs data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error loading data');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUtility, setSelectedUtility] = useState<string>(searchParams.get('utility') || 'all');
  const [selectedImplementer, setSelectedImplementer] = useState<string>('all');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedProgramType, setSelectedProgramType] = useState<string>('all');
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filteredPrograms = useMemo(() => {
    if (!data?.programs || !Array.isArray(data.programs)) {
      return [];
    }
    
    return data.programs.filter(program => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const searchableText = `
          ${program.programName}
          ${program.implementer}
          ${program.description}
          ${program.utilities.join(' ')}
          ${program.sectors.join(' ')}
        `.toLowerCase();
        
        if (!searchableText.includes(term)) return false;
      }
      
      // Utility filter
      if (selectedUtility !== 'all') {
        if (!program.utilities.some(u => u.toLowerCase() === selectedUtility.toLowerCase() || u === 'Multiple')) {
          return false;
        }
      }
      
      // Implementer filter
      if (selectedImplementer !== 'all') {
        if (program.implementer.toLowerCase() !== selectedImplementer.toLowerCase()) {
          return false;
        }
      }
      
      // Sector filter
      if (selectedSector !== 'all') {
        if (!program.sectors.some(s => s.toLowerCase() === selectedSector.toLowerCase())) {
          return false;
        }
      }
      
      // Program type filter
      if (selectedProgramType !== 'all') {
        if (program.programType.toLowerCase() !== selectedProgramType.toLowerCase()) {
          return false;
        }
      }
      
      return true;
    });
  }, [data, searchTerm, selectedUtility, selectedImplementer, selectedSector, selectedProgramType]);

  const getSectorIcon = (sector: string) => {
    switch (sector) {
      case 'Commercial': return <Briefcase className="w-4 h-4" />;
      case 'Residential': return <Home className="w-4 h-4" />;
      case 'Industrial': return <Factory className="w-4 h-4" />;
      case 'Public': return <School className="w-4 h-4" />;
      default: return <Building2 className="w-4 h-4" />;
    }
  };

  const getUtilityColor = (utility: string) => {
    const colors: Record<string, string> = {
      'PG&E': 'bg-blue-100 text-blue-800 border-blue-200',
      'SCE': 'bg-orange-100 text-orange-800 border-orange-200',
      'SDG&E': 'bg-green-100 text-green-800 border-green-200',
      'SoCalGas': 'bg-purple-100 text-purple-800 border-purple-200',
      'Multiple': 'bg-slate-100 text-slate-800 border-slate-200',
    };
    return colors[utility] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading 3P Programs...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-lg border border-red-200 p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-xl font-bold">Error Loading Data</h2>
          </div>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate('/utilities')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Utilities & Programs</span>
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">3P Programs</h1>
              <p className="text-slate-500">Third-party energy efficiency programs and initiatives</p>
            </div>
          </div>
          <p className="text-slate-600 max-w-3xl">
            Browse third-party energy efficiency programs including statewide initiatives, market transformation programs, 
            and custom commercial/industrial projects. Each program clearly shows the implementing company, utilities served, 
            target sectors, and program details.
          </p>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
            <div className="font-semibold">Legacy/Beta surface (not DSIRE-audited)</div>
            <div className="mt-1">
              This page is a reference dataset and is not yet backed by versioned, provenance-tracked Program Snapshots. Do not treat as authoritative for compliance decisions.
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-sm text-slate-600 mb-1">Total Programs</p>
            <p className="text-2xl font-bold text-slate-900">{data.metadata.totalPrograms}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-sm text-slate-600 mb-1">Implementers</p>
            <p className="text-2xl font-bold text-purple-600">{data.metadata.implementers.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-sm text-slate-600 mb-1">Utilities</p>
            <p className="text-2xl font-bold text-slate-900">{data.metadata.utilities.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-sm text-slate-600 mb-1">Filtered Results</p>
            <p className="text-2xl font-bold text-green-600">{filteredPrograms.length}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by program name, implementer, utility, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200">
              {/* Utility Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Utility
                </label>
                <select
                  value={selectedUtility}
                  onChange={(e) => setSelectedUtility(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                >
                  <option value="all">All Utilities</option>
                  {data.metadata.utilities.map(util => (
                    <option key={util} value={util}>{util}</option>
                  ))}
                </select>
              </div>

              {/* Implementer Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  3rd Party Implementer
                </label>
                <select
                  value={selectedImplementer}
                  onChange={(e) => setSelectedImplementer(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                >
                  <option value="all">All Implementers</option>
                  {data.metadata.implementers.map(impl => (
                    <option key={impl} value={impl}>{impl}</option>
                  ))}
                </select>
              </div>

              {/* Sector Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sector
                </label>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                >
                  <option value="all">All Sectors</option>
                  {data.metadata.sectors.map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </div>

              {/* Program Type Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Program Type
                </label>
                <select
                  value={selectedProgramType}
                  onChange={(e) => setSelectedProgramType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                >
                  <option value="all">All Types</option>
                  {data.metadata.programTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Active Filters */}
          {(selectedUtility !== 'all' || selectedImplementer !== 'all' || selectedSector !== 'all' || selectedProgramType !== 'all') && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200">
              <span className="text-sm text-slate-600">Active filters:</span>
              {selectedUtility !== 'all' && (
                <button
                  onClick={() => setSelectedUtility('all')}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200"
                >
                  Utility: {selectedUtility}
                  <X className="w-3 h-3" />
                </button>
              )}
              {selectedImplementer !== 'all' && (
                <button
                  onClick={() => setSelectedImplementer('all')}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm hover:bg-green-200"
                >
                  Implementer: {selectedImplementer}
                  <X className="w-3 h-3" />
                </button>
              )}
              {selectedSector !== 'all' && (
                <button
                  onClick={() => setSelectedSector('all')}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm hover:bg-purple-200"
                >
                  Sector: {selectedSector}
                  <X className="w-3 h-3" />
                </button>
              )}
              {selectedProgramType !== 'all' && (
                <button
                  onClick={() => setSelectedProgramType('all')}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm hover:bg-orange-200"
                >
                  Type: {selectedProgramType}
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Program Cards */}
        <div className="space-y-4">
          {filteredPrograms.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 text-lg">No programs found matching your criteria</p>
              <p className="text-slate-500 text-sm mt-2">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            filteredPrograms.map((program) => (
              <div
                key={program.id}
                className="bg-white rounded-lg border border-slate-200 hover:shadow-lg transition-shadow"
              >
                {/* Program Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      {/* Program Name */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Award className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-slate-900 mb-1">{program.programName}</h3>
                          {/* Implementer - Prominently displayed */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600">Implemented by</span>
                            <span className="text-sm font-semibold text-purple-600">{program.implementer}</span>
                          </div>
                        </div>
                      </div>

                      {/* Key Info Pills - Organized clearly */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {/* Utilities - Clear color coding */}
                        {program.utilities.map(utility => (
                          <span
                            key={utility}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getUtilityColor(utility)}`}
                          >
                            <MapPin className="w-3 h-3" />
                            {utility}
                          </span>
                        ))}

                        {/* Sectors - With icons */}
                        {program.sectors.map(sector => (
                          <span
                            key={sector}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-xs font-semibold border border-slate-200"
                          >
                            {getSectorIcon(sector)}
                            {sector}
                          </span>
                        ))}

                        {/* Program Type */}
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold border border-purple-200">
                          <TrendingUp className="w-3 h-3" />
                          {program.programType}
                        </span>

                        {/* Scope */}
                        {program.scope && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-200">
                            <Tag className="w-3 h-3" />
                            {program.scope}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {program.description && (
                        <p className="text-slate-600 mb-4 leading-relaxed">{program.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Expandable Details */}
                  <button
                    onClick={() => setExpandedProgram(expandedProgram === program.id ? null : program.id)}
                    className="w-full flex items-center justify-between text-sm font-medium text-purple-600 hover:text-purple-700 py-2"
                  >
                    <span>{expandedProgram === program.id ? 'Hide Details' : 'Show Details'}</span>
                    {expandedProgram === program.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {expandedProgram === program.id && (
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                      {/* Lead Administrator */}
                      {program.leadAdministrator && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-1">Lead Administrator</h4>
                          <p className="text-sm text-slate-600">{program.leadAdministrator}</p>
                        </div>
                      )}

                      {/* Eligible Customers */}
                      {program.eligibleCustomers && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-1">Eligible Customers</h4>
                          <p className="text-sm text-slate-600">{program.eligibleCustomers}</p>
                        </div>
                      )}

                      {/* Incentive Structure */}
                      {program.incentiveStructure && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-1">Incentive Structure</h4>
                          <p className="text-sm text-slate-600">{program.incentiveStructure}</p>
                          {program.incentiveRates && (
                            <p className="text-sm font-medium text-green-600 mt-1">{program.incentiveRates}</p>
                          )}
                        </div>
                      )}

                      {/* Eligible Equipment */}
                      {program.eligibleEquipment && program.eligibleEquipment.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">Eligible Equipment</h4>
                          <ul className="space-y-1">
                            {program.eligibleEquipment.slice(0, 10).map((equip, idx) => (
                              <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                                <span className="text-purple-600 mt-1">•</span>
                                <span>{equip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Methodology */}
                      {program.methodology && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-1">Methodology</h4>
                          <p className="text-sm text-slate-600">{program.methodology}</p>
                        </div>
                      )}

                      {/* Additional Notes */}
                      {program.notes && program.notes.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">Additional Information</h4>
                          <ul className="space-y-2">
                            {program.notes.slice(0, 5).map((note, idx) => (
                              <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                                <span className="text-purple-600 mt-1">•</span>
                                <span>{note}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
