import React from 'react';

export const ExternalShareLayout: React.FC<{
  embed?: boolean;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}> = ({ embed, title, subtitle, headerRight, children }) => {
  const isEmbed = Boolean(embed);
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {isEmbed ? null : (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
                <div className="text-white font-extrabold tracking-tight">EW</div>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 tracking-tight">EverWatt</div>
                <div className="text-xs text-gray-500 truncate">Snapshot-only external portal</div>
              </div>
            </div>
            {headerRight ? <div className="flex items-center">{headerRight}</div> : null}
          </div>
        </div>
      )}

      <div className={`flex-1 overflow-auto ${isEmbed ? '' : 'p-6'}`}>
        <div className={`${isEmbed ? 'p-0' : 'max-w-5xl mx-auto'} space-y-4`}>
          {title || subtitle ? (
            <div className={isEmbed ? 'px-4 pt-4' : ''}>
              {title ? <h1 className="text-xl font-bold text-gray-900">{title}</h1> : null}
              {subtitle ? <div className="text-sm text-gray-600 font-mono truncate mt-1">{subtitle}</div> : null}
            </div>
          ) : null}
          <div className={isEmbed ? 'px-4 pb-4' : ''}>{children}</div>
        </div>
      </div>

      {isEmbed ? null : (
        <div className="border-t border-gray-200 bg-white">
          <div className="max-w-5xl mx-auto px-6 py-4 text-xs text-gray-600 space-y-1">
            <div className="font-semibold text-gray-800">Snapshot-only</div>
            <div>Generated from stored snapshots; no recomputation is performed when this link is viewed.</div>
            <div className="text-gray-500">Provenance and metadata are provided below for auditability.</div>
          </div>
        </div>
      )}
    </div>
  );
};

