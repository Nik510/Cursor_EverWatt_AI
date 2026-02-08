import React from 'react';
import { formatCurrency, formatNumber } from '../utils';

export interface ProjectData {
  id: string;
  name: string;
  client?: string;
  technology: string;
  status: 'completed' | 'in-progress' | 'draft';
  createdDate: Date;
  lastUpdated: Date;
  peakReduction?: number; // kW
  annualSavings?: number; // $
  paybackYears?: number;
}

interface ProjectCardProps {
  project: ProjectData;
  onDelete?: (project: ProjectData) => void;
  onClick?: (project: ProjectData) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onDelete, onClick }) => {
  const statusColors = {
    completed: 'bg-green-100 text-green-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    draft: 'bg-gray-100 text-gray-800',
  };

  const statusLabels = {
    completed: 'Completed',
    'in-progress': 'In Progress',
    draft: 'Draft',
  };

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(project)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold text-gray-900">{project.name}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[project.status]}`}>
              {statusLabels[project.status]}
            </span>
          </div>
          {project.client && (
            <p className="text-sm text-gray-600 mb-1">Client: {project.client}</p>
          )}
          <p className="text-sm text-gray-500">
            {project.technology} • Updated {project.lastUpdated.toLocaleDateString()}
          </p>
        </div>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(project);
            }}
            className="text-red-400 hover:text-red-600 transition-colors p-1"
            title="Delete project"
          >
            🗑️
          </button>
        )}
      </div>

      {/* Metrics */}
      {(project.peakReduction !== undefined || project.annualSavings !== undefined || project.paybackYears !== undefined) && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          {project.peakReduction !== undefined && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Peak Reduction</p>
              <p className="text-lg font-bold text-gray-900">{project.peakReduction.toFixed(1)} kW</p>
            </div>
          )}
          {project.annualSavings !== undefined && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Annual Savings</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(project.annualSavings, 'USD', 0)}</p>
            </div>
          )}
          {project.paybackYears !== undefined && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Payback Period</p>
              <p className="text-lg font-bold text-gray-900">{project.paybackYears.toFixed(1)} yrs</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

