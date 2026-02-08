/**
 * Training Content Error Component
 * Displays error states for training content
 */

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface TrainingContentErrorProps {
  error: string;
  onRetry?: () => void;
}

export const TrainingContentError: React.FC<TrainingContentErrorProps> = ({ error, onRetry }) => {
  return (
    <div className="p-8 text-center">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Training Content</h3>
        <p className="text-sm text-red-700 mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

