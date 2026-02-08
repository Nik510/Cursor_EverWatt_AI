export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function formatArgs(args: unknown[]): unknown[] {
  return args.map((a) => (a instanceof Error ? { message: a.message, stack: a.stack, name: a.name } : a));
}

export const logger = {
  debug: (...args: unknown[]) => {
    const mode = String((import.meta as any)?.env?.MODE || '').trim();
    if (mode !== 'production') console.debug(...formatArgs(args));
  },
  info: (...args: unknown[]) => {
    console.info(...formatArgs(args));
  },
  warn: (...args: unknown[]) => {
    console.warn(...formatArgs(args));
  },
  error: (...args: unknown[]) => {
    console.error(...formatArgs(args));
  },
};
