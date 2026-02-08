import React from 'react';
import { Building2, MapPin, Phone, Mail, User, Calendar } from 'lucide-react';

export interface CustomerInformation {
  // Company/Facility Information
  companyName: string;
  facilityName: string;
  facilityType: string;
  industry: string;
  siteLocation?: string;
  serviceAgreementId?: string;
  climateZone?: string;
  rateSchedule?: string;
  
  // Address
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  
  // Contact Information
  primaryContactName: string;
  primaryContactTitle: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  
  // Additional Information
  utilityCompany: string;
  accountNumber: string;
  projectName: string;
  analysisDate: string;
  
  // Notes
  notes?: string;
}

interface CustomerInformationFormProps {
  data: CustomerInformation;
  onChange: (data: CustomerInformation) => void;
  errors?: Record<string, string>;
}

export const CustomerInformationForm: React.FC<CustomerInformationFormProps> = ({
  data,
  onChange,
  errors = {},
}) => {
  const updateField = <K extends keyof CustomerInformation>(
    field: K,
    value: CustomerInformation[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  const facilityTypes = [
    'Commercial',
    'Industrial',
    'Retail',
    'Healthcare',
    'Education',
    'Municipal',
    'Agricultural',
    'Multifamily Residential',
    'Office',
    'Restaurant',
    'Warehouse',
  ];

  const climateZones = [
    'Zone 1','Zone 2','Zone 3','Zone 4','Zone 5','Zone 6','Zone 7','Zone 8','Zone 9','Zone 10','Zone 11','Zone 12','Zone 13','Zone 14','Zone 15','Zone 16'
  ];

  const rateSchedules = [
    'B-19 Medium General Demand-Metered TOU (B-19)',
    'B-20 Large General Demand-Metered TOU (B-20)',
    'E-19 Medium General Demand-Metered TOU (Legacy) (E-19)',
    'E-20 Large General Demand-Metered TOU (Legacy) (E-20)',
    'E-20 TOU (E-20)',
    'E-19 TOU (E-19)',
    'Core Commercial (G-NR1)',
    'B-19 Secondary (B19S)',
    'B-19S with Option S (B19S-S)',
    'A-10 Secondary TOU (A10S)',
  ];

  return (
    <div className="space-y-6">
      {/* Company/Facility Information Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Company & Facility Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.companyName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="ABC Manufacturing Inc."
            />
            {errors.companyName && (
              <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Site Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.siteLocation || ''}
              onChange={(e) => updateField('siteLocation', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.siteLocation ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="800 Blossom Hill Rd, Los Gatos, CA"
            />
            {errors.siteLocation && (
              <p className="mt-1 text-sm text-red-600">{errors.siteLocation}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Facility Type <span className="text-red-500">*</span>
            </label>
            <select
              value={data.facilityType}
              onChange={(e) => updateField('facilityType', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.facilityType ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select Facility Type</option>
              {facilityTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {errors.facilityType && (
              <p className="mt-1 text-sm text-red-600">{errors.facilityType}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry
            </label>
            <input
              type="text"
              value={data.industry}
              onChange={(e) => updateField('industry', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Automotive Manufacturing"
            />
          </div>
        </div>
      </div>

      {/* Address Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          Facility Address
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Street Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.address}
              onChange={(e) => updateField('address', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.address ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="123 Main Street"
            />
            {errors.address && (
              <p className="mt-1 text-sm text-red-600">{errors.address}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={data.city}
                onChange={(e) => updateField('city', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.city ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Los Angeles"
              />
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={data.state}
                onChange={(e) => updateField('state', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.state ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="CA"
                maxLength={2}
              />
              {errors.state && (
                <p className="mt-1 text-sm text-red-600">{errors.state}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ZIP Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={data.zipCode}
                onChange={(e) => updateField('zipCode', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.zipCode ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="90001"
              />
              {errors.zipCode && (
                <p className="mt-1 text-sm text-red-600">{errors.zipCode}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <input
              type="text"
              value={data.country}
              onChange={(e) => updateField('country', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="United States"
              defaultValue="United States"
            />
          </div>
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          Primary Contact Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.primaryContactName}
              onChange={(e) => updateField('primaryContactName', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.primaryContactName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="John Smith"
            />
            {errors.primaryContactName && (
              <p className="mt-1 text-sm text-red-600">{errors.primaryContactName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={data.primaryContactTitle}
              onChange={(e) => updateField('primaryContactTitle', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Facility Manager"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={data.primaryContactEmail}
              onChange={(e) => updateField('primaryContactEmail', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.primaryContactEmail ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="john.smith@company.com"
            />
            {errors.primaryContactEmail && (
              <p className="mt-1 text-sm text-red-600">{errors.primaryContactEmail}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={data.primaryContactPhone}
              onChange={(e) => updateField('primaryContactPhone', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.primaryContactPhone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="(555) 123-4567"
            />
            {errors.primaryContactPhone && (
              <p className="mt-1 text-sm text-red-600">{errors.primaryContactPhone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Utility & Project Information Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Utility & Project Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Utility Company <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.utilityCompany}
              onChange={(e) => updateField('utilityCompany', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.utilityCompany ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Pacific Gas & Electric"
            />
            {errors.utilityCompany && (
              <p className="mt-1 text-sm text-red-600">{errors.utilityCompany}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Electric SAID (Service Agreement ID)
            </label>
            <input
              type="text"
              value={data.serviceAgreementId || ''}
              onChange={(e) => updateField('serviceAgreementId', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1234567890"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.projectName}
              onChange={(e) => updateField('projectName', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.projectName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Battery Storage Analysis - Q1 2024"
            />
            {errors.projectName && (
              <p className="mt-1 text-sm text-red-600">{errors.projectName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Analysis Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={data.analysisDate}
              onChange={(e) => updateField('analysisDate', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.analysisDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.analysisDate && (
              <p className="mt-1 text-sm text-red-600">{errors.analysisDate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              California Climate Zone
            </label>
            <select
              value={data.climateZone || ''}
              onChange={(e) => updateField('climateZone', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select CEC zone</option>
              {climateZones.map((zone) => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PG&E Rate Schedule
            </label>
            <select
              value={data.rateSchedule || ''}
              onChange={(e) => updateField('rateSchedule', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select rate schedule</option>
              {rateSchedules.map((rate) => (
                <option key={rate} value={rate}>{rate}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes
          </label>
          <textarea
            value={data.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder="Any additional information about this project..."
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Validate customer information
 */
export function validateCustomerInformation(data: CustomerInformation): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.companyName?.trim()) {
    errors.companyName = 'Company name is required';
  }

  if (!data.siteLocation?.trim()) {
    errors.siteLocation = 'Site location is required';
  }

  if (!data.facilityType?.trim()) {
    errors.facilityType = 'Facility type is required';
  }

  if (!data.address?.trim()) {
    errors.address = 'Address is required';
  }

  if (!data.city?.trim()) {
    errors.city = 'City is required';
  }

  if (!data.state?.trim()) {
    errors.state = 'State is required';
  }

  if (!data.zipCode?.trim()) {
    errors.zipCode = 'ZIP code is required';
  }

  if (!data.primaryContactName?.trim()) {
    errors.primaryContactName = 'Primary contact name is required';
  }

  if (!data.primaryContactEmail?.trim()) {
    errors.primaryContactEmail = 'Primary contact email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.primaryContactEmail)) {
    errors.primaryContactEmail = 'Invalid email address';
  }

  if (!data.primaryContactPhone?.trim()) {
    errors.primaryContactPhone = 'Primary contact phone is required';
  }

  if (!data.utilityCompany?.trim()) {
    errors.utilityCompany = 'Utility company is required';
  }

  if (!data.projectName?.trim()) {
    errors.projectName = 'Project name is required';
  }

  if (!data.analysisDate?.trim()) {
    errors.analysisDate = 'Analysis date is required';
  }

  return errors;
}
