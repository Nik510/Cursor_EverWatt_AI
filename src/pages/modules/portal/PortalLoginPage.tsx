import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ClipboardPaste } from 'lucide-react';

import { ExternalShareLayout } from '../../../components/reports/ExternalShareLayout';
import { portalLoginVerifyV1 } from '../../../shared/api/portalV1';

export const PortalLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [tokenPlain, setTokenPlain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <ExternalShareLayout title="Customer portal login" subtitle="Snapshot-only portfolio reports">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center flex-none">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900">Magic token login</div>
              <div className="text-sm text-gray-600 mt-1">
                Ask EverWatt staff for a login token, then paste it here. Tokens expire after 15 minutes.
              </div>
            </div>
          </div>
        </div>

        {error ? <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">{error}</div> : null}

        <form
          className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            void portalLoginVerifyV1({ email, tokenPlain })
              .then(() => navigate('/portal'))
              .catch((err) => setError(err instanceof Error ? err.message : 'Login failed'))
              .finally(() => setBusy(false));
          }}
        >
          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-700">Email</div>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              disabled={busy}
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-700">Token</div>
            <div className="relative">
              <ClipboardPaste className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                type="text"
                autoComplete="one-time-code"
                value={tokenPlain}
                onChange={(e) => setTokenPlain(e.target.value)}
                placeholder="paste token"
                disabled={busy}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
            disabled={busy}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </ExternalShareLayout>
  );
};

