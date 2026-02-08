import { useEffect, useMemo, useState } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';

type ChatRole = 'system' | 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
  sources?: Array<{ path: string; chunkIndex: number }>;
};

export function AiChat(props: { title: string; systemPrompt?: string; analysisContext?: string }) {
  const { session } = useAdmin();
  const adminToken = session?.token || localStorage.getItem('admin_token') || '';

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const initial: ChatMessage[] = [];
    if (props.systemPrompt) initial.push({ role: 'system', content: props.systemPrompt });
    initial.push({ role: 'assistant', content: 'Ask me anything about audits, equipment, and efficiency measures.' });
    return initial;
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [openSource, setOpenSource] = useState<{ path: string; chunkIndex: number } | null>(null);
  const [sourceText, setSourceText] = useState<string>('');
  const [sourceLoading, setSourceLoading] = useState<boolean>(false);

  const displayMessages = useMemo(() => messages.filter((m) => m.role !== 'system'), [messages]);

  useEffect(() => {
    fetch('/api/ai/health')
      .then((r) => r.json())
      .then((d) => setConfigured(!!d?.configured))
      .catch(() => setConfigured(false));
  }, []);

  async function viewSource(src: { path: string; chunkIndex: number }) {
    setOpenSource(src);
    setSourceText('');
    setSourceLoading(true);
    try {
      const res = await fetch(`/api/ai/source?path=${encodeURIComponent(src.path)}&chunkIndex=${encodeURIComponent(String(src.chunkIndex))}`, {
        headers: adminToken ? { 'x-admin-token': adminToken } : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || `Failed to load source (${res.status})`);
      setSourceText(String(data.content || ''));
    } catch (e) {
      setSourceText(e instanceof Error ? e.message : 'Failed to load source');
    } finally {
      setSourceLoading(false);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'x-admin-token': adminToken } : {}),
        },
        body: JSON.stringify({ messages: next, analysisContext: props.analysisContext }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `AI request failed (${res.status})`);
      }
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.text || '',
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
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{props.title}</h2>
          <p className="text-gray-500 text-sm">Chat with an assistant (optional; requires server AI config)</p>
        </div>
        {configured === false && (
          <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded">
            AI not configured (set <code className="font-mono">OPENAI_API_KEY</code>)
          </div>
        )}
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
                <div className="text-xs font-semibold text-gray-600 mb-2">Sources</div>
                <div className="space-y-1">
                  {m.sources.slice(0, 10).map((s, sIdx) => (
                    <button
                      key={`${s.path}:${s.chunkIndex}:${sIdx}`}
                      type="button"
                      onClick={() => void viewSource(s)}
                      className="block text-left text-xs text-blue-700 hover:text-blue-900 underline"
                    >
                      {s.path}#{s.chunkIndex}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="rounded-lg px-4 py-3 text-sm bg-gray-50 border border-gray-200 text-gray-600">
            Thinking…
          </div>
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

      {openSource && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setOpenSource(null)}>
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">
                {openSource.path}#{openSource.chunkIndex}
              </div>
              <button className="text-sm text-gray-600 hover:text-gray-900" onClick={() => setOpenSource(null)}>
                Close
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[70vh]">
              <pre className="text-xs whitespace-pre-wrap break-words bg-gray-50 border border-gray-200 rounded-lg p-3">
                {sourceLoading ? 'Loading…' : sourceText || '(empty)'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
