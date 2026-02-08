/**
 * Admin Controls Component
 * Floating admin panel for quick actions
 */

import React, { useState } from 'react';
import { Settings, Eye, EyeOff, Edit, Save, X, LogOut, User } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';

interface AdminControlsProps {
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  isEditing?: boolean;
  visibility?: 'published' | 'draft' | 'archived' | 'hidden';
  onVisibilityChange?: (visibility: 'published' | 'draft' | 'archived' | 'hidden') => void;
}

export const AdminControls: React.FC<AdminControlsProps> = ({
  onEdit,
  onSave,
  onCancel,
  isEditing = false,
  visibility = 'published',
  onVisibilityChange,
}) => {
  const { isAuthenticated, isAdmin: userIsAdmin, logout, session } = useAdmin();
  const [showPanel, setShowPanel] = useState(false);

  if (!isAuthenticated || !userIsAdmin) {
    return null;
  }

  return (
    <>
      {/* Floating Admin Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Admin Controls"
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>

      {/* Admin Panel */}
      {showPanel && (
        <div className="fixed bottom-20 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-80">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{session?.email}</p>
                  <p className="text-xs text-gray-500">Admin</p>
                </div>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {/* Edit Mode Toggle */}
            {!isEditing ? (
              <button
                onClick={onEdit}
                className="w-full flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Content</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={onSave}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>
            )}

            {/* Visibility Controls */}
            {onVisibilityChange && (
              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Visibility</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onVisibilityChange('published')}
                    className={`px-3 py-2 text-xs rounded-md transition-colors ${
                      visibility === 'published'
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Eye className="w-4 h-4 mx-auto mb-1" />
                    Published
                  </button>
                  <button
                    onClick={() => onVisibilityChange('draft')}
                    className={`px-3 py-2 text-xs rounded-md transition-colors ${
                      visibility === 'draft'
                        ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Draft
                  </button>
                  <button
                    onClick={() => onVisibilityChange('hidden')}
                    className={`px-3 py-2 text-xs rounded-md transition-colors ${
                      visibility === 'hidden'
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <EyeOff className="w-4 h-4 mx-auto mb-1" />
                    Hidden
                  </button>
                  <button
                    onClick={() => onVisibilityChange('archived')}
                    className={`px-3 py-2 text-xs rounded-md transition-colors ${
                      visibility === 'archived'
                        ? 'bg-gray-100 text-gray-700 border border-gray-300'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Archived
                  </button>
                </div>
              </div>
            )}

            {/* Logout */}
            <div className="border-t border-gray-200 pt-3">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2 text-red-600 rounded-md hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
