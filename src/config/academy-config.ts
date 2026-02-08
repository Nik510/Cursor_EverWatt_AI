/**
 * Academy Configuration
 *
 * Portal URLs are intentionally separate (Engineering vs Sales) to enforce isolation.
 */
const isBrowser = typeof window !== 'undefined';

function getEnv(key: string): string | undefined {
  if (isBrowser) {
    // Vite env (browser)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (import.meta as any)?.env?.[key];
  }
  // Node.js env (SSR/tests)
  // eslint-disable-next-line no-process-env
  return process.env[key];
}

export const academyConfig = {
  engineeringUrl: getEnv('VITE_ACADEMY_ENGINEERING_URL') || 'https://academy.everwatt.com/engineering',
  salesUrl: getEnv('VITE_ACADEMY_SALES_URL') || 'https://academy.everwatt.com/sales',
};

