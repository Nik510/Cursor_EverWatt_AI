import { useMemo, useState } from 'react';
import { AlertCircle, Send } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';

type ChatRole = 'system' | 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
  sources?: Array<{ fileId: string; chunkIndex: number; provenance?: Record<string, unknown> }>;
};

export function ProjectAiChat(props: { projectId: string }) {
  const { session } = useAdmin();
  const adminToken = session?.token || localStorage.getItem('admin_token') || '';

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Ask me questions about this project. I will cite file/page/sheet when possible.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayMessages = useMemo(() => messages.filter((m) => m.role !== 'system'), [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(props.projectId)}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'x-admin-token': adminToken } : {}),
        },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || `AI request failed (${res.status})`);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: String(data.text || ''),
          sources: Array.isArray(data.sources) ? data.sources : undefined,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">Project Q&amp;A</h3>
        <p className="text-sm text-gray-500">Uses the Project Graph + Vault chunks (requires server AI config + editor access).</p>
      </div>

      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1 overflow-auto space-y-3 pr-1">
        {displayMessages.map((m, idx) => (
          <div
            key={idx}
            className={`rounded-lg px-4 py-3 text-sm whitespace-pre-wrap ${
              m.role === 'user' ? 'bg-blue-50 border border-blue-200 text-blue-900' : 'bg-gray-50 border border-gray-200 text-gray-900'
            }`}
          >
            <div className="text-xs font-semibold mb-1 opacity-70">{m.role === 'user' ? 'You' : 'Assistant'}</div>
            {m.content}
            {m.role === 'assistant' && Array.isArray(m.sources) && m.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs font-semibold text-gray-600 mb-2">Evidence (best-effort)</div>
                <div className="space-y-1">
                  {m.sources.slice(0, 8).map((s, sIdx) => (
                    <div key={`${s.fileId}:${s.chunkIndex}:${sIdx}`} className="text-xs text-gray-700">
                      <span className="font-mono">
                        fileId={s.fileId} chunk={s.chunkIndex}
                      </span>
                      {s.provenance ? (
                        <span className="ml-2 text-gray-500">{JSON.stringify(s.provenance)}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="rounded-lg px-4 py-3 text-sm bg-gray-50 border border-gray-200 text-gray-600">Thinking…</div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Ask a question…"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          onClick={() => void send()}
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </div>
    </div>
  );
}

