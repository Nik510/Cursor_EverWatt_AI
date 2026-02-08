import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Read-only markdown renderer.
 *
 * Styling is intentionally copied from the existing markdown mapping used in:
 * `src/components/ee-training/ContentBlockRenderer.tsx` (TextBlock markdown renderer),
 * so we do not introduce a new typography system.
 */
export function MarkdownViewer(props: { markdown: string }) {
  const md = String(props.markdown || '');
  if (!md.trim()) return null;

  return (
    <div className="text-slate-800">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 mt-2 mb-3">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl md:text-[1.35rem] font-bold tracking-tight text-slate-900 mt-6 mb-2 pb-2 border-b border-slate-200/70">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg md:text-xl font-semibold tracking-tight text-slate-900 mt-5 mb-2">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base md:text-[1.05rem] font-semibold text-slate-900 mt-4 mb-2">
              {children}
            </h4>
          ),
          p: ({ children }) => <p className="text-[15px] leading-7 text-slate-700 mb-3">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-6 mb-4 space-y-1.5 text-[15px] leading-7 text-slate-700 marker:text-slate-400">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 mb-4 space-y-1.5 text-[15px] leading-7 text-slate-700 marker:text-slate-400">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-7">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-5 border-l-4 border-indigo-300 bg-gradient-to-r from-indigo-50 to-white px-4 py-3 rounded-r-xl shadow-sm">
              <div className="text-[15px] leading-7 text-slate-700">{children}</div>
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-slate-200" />,
          a: ({ children, href }) => (
            <a className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2" href={href}>
              {children}
            </a>
          ),
          code: ({ children, className, ...props }) => {
            // react-markdown uses `inline` prop at runtime; keep typing loose
            const inline = (props as any).inline as boolean | undefined;
            if (inline) {
              return (
                <code className="px-1 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[0.9em] font-mono">
                  {children}
                </code>
              );
            }
            return <code className={className ? String(className) : undefined}>{children}</code>;
          },
          pre: ({ children }) => (
            <pre className="my-5 overflow-x-auto rounded-xl bg-slate-950 text-slate-50 p-4 text-sm shadow-sm ring-1 ring-slate-900/10">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="my-5 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="min-w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-200">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-slate-700 border-b border-slate-100 align-top">{children}</td>
          ),
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}

