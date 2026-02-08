/**
 * Audit & Assessment Form
 * 
 * Core capability: Combines all project data from assessment phase, captures HVAC equipment
 * in real-time with nameplates and all information, ties real trend data to assets in the app,
 * and has the system generate savings based on its code knowledge to help find ways to optimize systems.
 * 
 * @see EVERWATT_AI_CORE_VISION.md - This module is critical for vendor-agnostic asset management
 * and optimization opportunity identification.
 */

import React, { useState } from 'react';
import { Save, ArrowRight, Building, Droplet, Lightbulb, Settings, AlertCircle } from 'lucide-react';
import { validateBuildingData, validateHVACSystem, validateLightingSystem } from '../../../utils/validation';
import { useToast } from '../../../contexts/ToastContext';
import { logger } from '../../../services/logger';
import { AuditPayloadSchema, zodErrorsToAuditValidationErrors } from '../../../validation/schemas/audit-schema';

interface BuildingData {
  name: string;
  address: string;
  squareFootage: number;
  buildingType: string;
  yearBuilt: number;
  occupancy: number;
  operatingHours: number;
}

interface HVACData {
  type: 'chiller' | 'boiler' | 'vrf' | 'rtu' | 'other';
  manufacturer: string;
  model: string;
  capacity: number;
  efficiency: number;
  yearInstalled: number;
  location: string;
  notes: string;
}

interface LightingData {
  fixtureType: string;
  bulbType: string;
  fixtureCount: number;
  wattage: number;
  controls: string;
  location: string;
  notes: string;
}

type AuditSection = 'building' | 'hvac' | 'lighting' | 'summary';

export const AuditForm: React.FC = () => {
  const { toast } = useToast();
  const [currentSection, setCurrentSection] = useState<AuditSection>('building');
  const [buildingData, setBuildingData] = useState<BuildingData>({
    name: '',
    address: '',
    squareFootage: 0,
    buildingType: '',
    yearBuilt: 0,
    occupancy: 0,
    operatingHours: 0,
  });
  const [hvacSystems, setHvacSystems] = useState<HVACData[]>([]);
  const [lightingSystems, setLightingSystems] = useState<LightingData[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const handleAddHVAC = () => {
    setHvacSystems([...hvacSystems, {
      type: 'chiller',
      manufacturer: '',
      model: '',
      capacity: 0,
      efficiency: 0,
      yearInstalled: 0,
      location: '',
      notes: '',
    }]);
  };

  const handleAddLighting = () => {
    setLightingSystems([...lightingSystems, {
      fixtureType: '',
      bulbType: '',
      fixtureCount: 0,
      wattage: 0,
      controls: '',
      location: '',
      notes: '',
    }]);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null);


  const validateForm = (): boolean => {
    // Zod: validate overall payload shape and basic constraints
    const parsed = AuditPayloadSchema.safeParse({
      building: buildingData,
      hvac: hvacSystems,
      lighting: lightingSystems,
    });

    if (!parsed.success) {
      const errors = zodErrorsToAuditValidationErrors(parsed.error.issues);
      setValidationErrors(errors);
      return false;
    }

    // Keep existing domain validation helpers (adds additional checks beyond basic constraints)
    const errors: Record<string, string[]> = {};

    const buildingValidation = validateBuildingData(buildingData);
    if (!buildingValidation.isValid) {
      errors.building = buildingValidation.errors;
    }

    hvacSystems.forEach((system, index) => {
      const hvacValidation = validateHVACSystem({
        type: system.type,
        capacity: system.capacity,
        currentEfficiency: system.efficiency || 0,
        proposedEfficiency: system.efficiency || 0,
        operatingHours: 3000,
        energyCost: 0.12,
      });
      if (!hvacValidation.isValid) {
        errors[`hvac_${index}`] = hvacValidation.errors;
      }
    });

    lightingSystems.forEach((system, index) => {
      const lightingValidation = validateLightingSystem({
        type: system.fixtureType || 'retrofit',
        currentWattage: system.wattage || 0,
        proposedWattage: system.wattage || 0,
        fixtureCount: system.fixtureCount,
        operatingHours: 4000,
        energyCost: 0.12,
        controlsSavings: system.controls ? 30 : undefined,
      });
      if (!lightingValidation.isValid) {
        errors[`lighting_${index}`] = lightingValidation.errors;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    // Validate before saving
    if (!validateForm()) {
      toast({ type: 'error', title: 'Validation errors', message: 'Please fix validation errors before saving.' });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/audits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          building: buildingData,
          hvac: hvacSystems,
          lighting: lightingSystems,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to save audit');
      }

      if (data.success && data.id) {
        setSavedAuditId(data.id);
        setValidationErrors({});
        toast({ type: 'success', message: 'Audit saved successfully.' });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      logger.error('Save error:', err);
      toast({ type: 'error', title: 'Save failed', message: err instanceof Error ? err.message : 'An error occurred while saving the audit' });
    } finally {
      setIsSaving(false);
    }
  };

  const sections = [
    { id: 'building' as AuditSection, name: 'Building Info', icon: Building },
    { id: 'hvac' as AuditSection, name: 'HVAC Systems', icon: Droplet },
    { id: 'lighting' as AuditSection, name: 'Lighting', icon: Lightbulb },
    { id: 'summary' as AuditSection, name: 'Summary', icon: Settings },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {sections.map((section, index) => (
            <React.Fragment key={section.id}>
              <button
                onClick={() => setCurrentSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentSection === section.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <section.icon className="w-4 h-4" />
                <span className="font-medium">{section.name}</span>
              </button>
              {index < sections.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  sections.findIndex(s => s.id === currentSection) > index
                    ? 'bg-blue-600'
                    : 'bg-gray-300'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Building Section */}
      {currentSection === 'building' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Building className="w-6 h-6 text-blue-600" />
            Building Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Building Name *
              </label>
              <input
                type="text"
                value={buildingData.name}
                onChange={(e) => {
                  setBuildingData({ ...buildingData, name: e.target.value });
                  // Clear validation error when user types
                  if (validationErrors.building) {
                    setValidationErrors({ ...validationErrors, building: undefined });
                  }
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.building ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Main Office Building"
              />
              {validationErrors.building && (
                <div className="mt-1 flex items-start gap-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <ul className="list-disc list-inside">
                    {validationErrors.building.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <input
                type="text"
                value={buildingData.address}
                onChange={(e) => setBuildingData({ ...buildingData, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="123 Main St, City, State ZIP"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Square Footage *
              </label>
              <input
                type="number"
                value={buildingData.squareFootage || ''}
                onChange={(e) => {
                  setBuildingData({ ...buildingData, squareFootage: parseInt(e.target.value) || 0 });
                  if (validationErrors.building) {
                    setValidationErrors({ ...validationErrors, building: undefined });
                  }
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.building ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="50000"
                min="1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Building Type *
              </label>
              <select
                value={buildingData.buildingType}
                onChange={(e) => setBuildingData({ ...buildingData, buildingType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select type...</option>
                <option value="office">Office</option>
                <option value="retail">Retail</option>
                <option value="warehouse">Warehouse</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="hospital">Hospital</option>
                <option value="school">School</option>
                <option value="hotel">Hotel</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year Built
              </label>
              <input
                type="number"
                value={buildingData.yearBuilt || ''}
                onChange={(e) => setBuildingData({ ...buildingData, yearBuilt: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1990"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operating Hours/Week
              </label>
              <input
                type="number"
                value={buildingData.operatingHours || ''}
                onChange={(e) => setBuildingData({ ...buildingData, operatingHours: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="168 (24/7)"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setCurrentSection('hvac')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              Next: HVAC Systems
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* HVAC Section */}
      {currentSection === 'hvac' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Droplet className="w-6 h-6 text-blue-600" />
              HVAC Systems
            </h2>
            <button
              onClick={handleAddHVAC}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              + Add System
            </button>
          </div>

          {hvacSystems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Droplet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No HVAC systems added yet.</p>
              <button
                onClick={handleAddHVAC}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Add First System
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {hvacSystems.map((system, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">System {index + 1}</h3>
                    <button
                      onClick={() => setHvacSystems(hvacSystems.filter((_, i) => i !== index))}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                      <select
                        value={system.type}
                        onChange={(e) => {
                          const updated = [...hvacSystems];
                          updated[index].type = e.target.value as any;
                          setHvacSystems(updated);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="chiller">Chiller</option>
                        <option value="boiler">Boiler</option>
                        <option value="vrf">VRF/Heat Pump</option>
                        <option value="rtu">RTU</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Manufacturer</label>
                      <input
                        type="text"
                        value={system.manufacturer}
                        onChange={(e) => {
                          const updated = [...hvacSystems];
                          updated[index].manufacturer = e.target.value;
                          setHvacSystems(updated);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Trane, Carrier"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                      <input
                        type="text"
                        value={system.model}
                        onChange={(e) => {
                          const updated = [...hvacSystems];
                          updated[index].model = e.target.value;
                          setHvacSystems(updated);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Model number"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Capacity ({system.type === 'chiller' || system.type === 'vrf' ? 'tons' : 'MBH'})
                      </label>
                      <input
                        type="number"
                        value={system.capacity || ''}
                        onChange={(e) => {
                          const updated = [...hvacSystems];
                          updated[index].capacity = parseFloat(e.target.value) || 0;
                          setHvacSystems(updated);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Efficiency ({system.type === 'chiller' || system.type === 'vrf' ? 'kW/ton or COP' : 'AFUE'})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={system.efficiency || ''}
                        onChange={(e) => {
                          const updated = [...hvacSystems];
                          updated[index].efficiency = parseFloat(e.target.value) || 0;
                          setHvacSystems(updated);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0.75"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Year Installed</label>
                      <input
                        type="number"
                        value={system.yearInstalled || ''}
                        onChange={(e) => {
                          const updated = [...hvacSystems];
                          updated[index].yearInstalled = parseInt(e.target.value) || 0;
                          setHvacSystems(updated);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="2010"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                      <input
                        type="text"
                        value={system.location}
                        onChange={(e) => {
                          const updated = [...hvacSystems];
                          updated[index].location = e.target.value;
                          setHvacSystems(updated);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Mechanical Room, Rooftop"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                      <textarea
                        value={system.notes}
                        onChange={(e) => {
                          const updated = [...hvacSystems];
                          updated[index].notes = e.target.value;
                          setHvacSystems(updated);
                        }}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Additional observations, condition, etc."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setCurrentSection('building')}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentSection('lighting')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              Next: Lighting
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Lighting Section */}
      {currentSection === 'lighting' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Lightbulb className="w-6 h-6 text-yellow-600" />
              Lighting Systems
            </h2>
            <button
              onClick={handleAddLighting}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors"
            >
              + Add System
            </button>
          </div>

          {lightingSystems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No lighting systems added yet.</p>
              <button
                onClick={handleAddLighting}
                className="px-6 py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors"
              >
                Add First System
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {lightingSystems.map((system, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Lighting System {index + 1}</h3>
                    <button
                      onClick={() => setLightingSystems(lightingSystems.filter((_, i) => i !== index))}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fixture Type</label>
                      <select
                        value={system.fixtureType}
                        onChange={(e) => {
                          const updated = [...lightingSystems];
                          updated[index].fixtureType = e.target.value;
                          setLightingSystems(updated);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                      >
                        <option value="">Select type...</option>
                        <option value="troffer">Troffer (2x4, 2x2)</option>
                        <option value="downlight">Downlight/Recessed</option>
                        <option value="highbay">High Bay</option>
                        <option value="linear">Linear/Tube</option>
                        <option value="wallpack">Wall Pack</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bulb Type</label>
                      <select
                        value={system.bulbType}
                        onChange={(e) => {
                          const updated = [...lightingSystems];
                          updated[index].bulbType = e.target.value;
                          setLightingSystems(updated);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                      >
                        <option value="">Select type...</option>
                        <option value="t12">T12 Fluorescent</option>
                        <option value="t8">T8 Fluorescent</option>
                        <option value="t5">T5 Fluorescent</option>
                        <option value="cfl">CFL</option>
                        <option value="metal-halide">Metal Halide</option>
                        <option value="hps">High Pressure Sodium</option>
                        <option value="led">LED</option>
                        <option value="incandescent">Incandescent</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fixture Count</label>
                      <input
                        type="number"
                        value={system.fixtureCount || ''}
                        onChange={(e) => {
                          const updated = [...lightingSystems];
                          updated[index].fixtureCount = parseInt(e.target.value) || 0;
                          setLightingSystems(updated);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        placeholder="100"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Wattage per Fixture</label>
                      <input
                        type="number"
                        value={system.wattage || ''}
                        onChange={(e) => {
                          const updated = [...lightingSystems];
                          updated[index].wattage = parseInt(e.target.value) || 0;
                          setLightingSystems(updated);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        placeholder="32"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Controls</label>
                      <select
                        value={system.controls}
                        onChange={(e) => {
                          const updated = [...lightingSystems];
                          updated[index].controls = e.target.value;
                          setLightingSystems(updated);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                      >
                        <option value="">Select...</option>
                        <option value="none">None (Manual)</option>
                        <option value="occupancy">Occupancy Sensors</option>
                        <option value="dimming">Dimming Controls</option>
                        <option value="networked">Networked Controls</option>
                        <option value="scheduling">Time Scheduling</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                      <input
                        type="text"
                        value={system.location}
                        onChange={(e) => {
                          const updated = [...lightingSystems];
                          updated[index].location = e.target.value;
                          setLightingSystems(updated);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        placeholder="e.g., Office Floor 2, Warehouse"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                      <textarea
                        value={system.notes}
                        onChange={(e) => {
                          const updated = [...lightingSystems];
                          updated[index].notes = e.target.value;
                          setLightingSystems(updated);
                        }}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                        placeholder="Additional observations, condition, etc."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setCurrentSection('hvac')}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentSection('summary')}
              className="px-6 py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors flex items-center gap-2"
            >
              Review Summary
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Summary Section */}
      {currentSection === 'summary' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            Audit Summary
          </h2>

          <div className="space-y-6">
            {/* Building Summary */}
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                Building Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Name:</p>
                  <p className="font-semibold text-gray-900">{buildingData.name || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Square Footage:</p>
                  <p className="font-semibold text-gray-900">{buildingData.squareFootage.toLocaleString() || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Building Type:</p>
                  <p className="font-semibold text-gray-900">{buildingData.buildingType || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Year Built:</p>
                  <p className="font-semibold text-gray-900">{buildingData.yearBuilt || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* HVAC Summary */}
            <div className="bg-cyan-50 rounded-lg p-6 border border-cyan-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Droplet className="w-5 h-5 text-cyan-600" />
                HVAC Systems ({hvacSystems.length})
              </h3>
              {hvacSystems.length === 0 ? (
                <p className="text-gray-600 text-sm">No HVAC systems recorded.</p>
              ) : (
                <div className="space-y-3">
                  {hvacSystems.map((system, index) => (
                    <div key={index} className="bg-white rounded p-3 text-sm">
                      <p className="font-semibold text-gray-900">
                        {system.type.toUpperCase()} - {system.manufacturer} {system.model}
                      </p>
                      <p className="text-gray-600">
                        {system.capacity} {system.type === 'chiller' || system.type === 'vrf' ? 'tons' : 'MBH'} • 
                        Efficiency: {system.efficiency} • 
                        Location: {system.location || 'Not specified'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lighting Summary */}
            <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
                Lighting Systems ({lightingSystems.length})
              </h3>
              {lightingSystems.length === 0 ? (
                <p className="text-gray-600 text-sm">No lighting systems recorded.</p>
              ) : (
                <div className="space-y-3">
                  {lightingSystems.map((system, index) => (
                    <div key={index} className="bg-white rounded p-3 text-sm">
                      <p className="font-semibold text-gray-900">
                        {system.fixtureType || 'Unknown'} - {system.bulbType || 'Unknown'} Bulb
                      </p>
                      <p className="text-gray-600">
                        {system.fixtureCount} fixtures • {system.wattage}W each • 
                        Controls: {system.controls || 'None'} • 
                        Location: {system.location || 'Not specified'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setCurrentSection('lighting')}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Back
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2 ${
                  isSaving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Audit'}
              </button>
              <button
                onClick={() => {
                  // Navigate to calculator with audit data
                  if (savedAuditId) {
                    // Pass audit ID via query param (no sessionStorage handoff)
                    window.location.href = `/calculator?auditId=${encodeURIComponent(savedAuditId)}`;
                  } else {
                    toast({ type: 'warning', message: 'Please save the audit first before sending to calculator.' });
                  }
                }}
                disabled={!savedAuditId}
                className={`px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 ${
                  !savedAuditId ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Send to Calculator
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

