import React, { useState } from 'react';
import { ProjectCard, type ProjectData } from '../components/ProjectCard';
import { logger } from '../services/logger';

export const Dashboard: React.FC = () => {
  // Mock projects for now - will connect to API later
  const [projects] = useState<ProjectData[]>([
    {
      id: '1',
      name: 'Los Gatos Terraces - Battery Storage Analysis',
      client: 'American Baptist Homes',
      technology: 'Battery Storage',
      status: 'completed',
      createdDate: new Date('2024-01-15'),
      lastUpdated: new Date('2024-12-10'),
      peakReduction: 8.4,
      annualSavings: 1512,
      paybackYears: 9.92,
    },
  ]);

  const stats = {
    totalProjects: projects.length,
    completedProjects: projects.filter(p => p.status === 'completed').length,
    inProgressProjects: projects.filter(p => p.status === 'in-progress').length,
    totalSavings: projects.reduce((sum, p) => sum + (p.annualSavings || 0), 0),
  };

  const handleDelete = (project: ProjectData) => {
    if (confirm(`Are you sure you want to delete ${project.name}?`)) {
      logger.info('Delete project requested', { id: project.id });
    }
  };

  const handleProjectClick = (project: ProjectData) => {
    logger.info('View project requested', { id: project.id });
    // Navigate to project detail page
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Overview of your energy analysis projects</p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
          <span>➕</span>
          <span>New Analysis</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Projects</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalProjects}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-3xl font-bold text-green-600">{stats.completedProjects}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">In Progress</p>
              <p className="text-3xl font-bold text-blue-600">{stats.inProgressProjects}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⚙️</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Annual Savings</p>
              <p className="text-3xl font-bold text-green-600">
                ${(stats.totalSavings / 1000).toFixed(1)}k
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View All →
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">No projects yet</p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Create Your First Analysis
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={handleDelete}
                onClick={handleProjectClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

