import React from 'react';

export interface DocumentData {
  id: string;
  title: string;
  tags: string[];
  description: string;
  category?: string;
  pinned?: boolean;
}

interface DocumentCardProps {
  document: DocumentData;
  onDelete?: (doc: DocumentData) => void;
  onPin?: (doc: DocumentData) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, onDelete, onPin }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          {document.pinned && <span className="text-yellow-500">⭐</span>}
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1">{document.title}</h3>
            {document.category && (
              <p className="text-sm text-gray-500">{document.category}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onPin && (
            <button
              onClick={() => onPin(document)}
              className={`p-2 rounded transition-colors ${
                document.pinned ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
              }`}
              title={document.pinned ? 'Unpin' : 'Pin document'}
            >
              ⭐
            </button>
          )}
          <button
            className="text-gray-400 hover:text-gray-600 p-1"
            title="Share"
          >
            🔗
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(document)}
              className="text-red-400 hover:text-red-600 transition-colors p-1"
              title="Delete document"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Tags */}
      {document.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {document.tags.map((tag, index) => (
            <span
              key={index}
              className={`px-2 py-1 rounded text-xs font-medium ${
                index === 0
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4 line-clamp-3">{document.description}</p>

      {/* Actions */}
      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
        Show Details →
      </button>
    </div>
  );
};

