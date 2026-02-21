import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const NODE_BUILTINS = new Set([
  'assert',
  'buffer',
  'child_process',
  'cluster',
  'crypto',
  'dgram',
  'dns',
  'events',
  'fs',
  'http',
  'https',
  'module',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'readline',
  'stream',
  'timers',
  'tls',
  'tty',
  'url',
  'util',
  'vm',
  'worker_threads',
  'zlib',
]);

function isNodeBuiltinImport(source: string): boolean {
  const raw = String(source || '');
  const s = raw.startsWith('node:') ? raw.slice('node:'.length) : raw;
  const base = s.split('/')[0] || s;
  return NODE_BUILTINS.has(base);
}

function nodeBuiltinTripwire(): Plugin {
  return {
    name: 'everwatt-node-builtin-tripwire',
    enforce: 'pre',
    apply: 'build',
    resolveId(source, importer, options) {
      if (options?.ssr) return null;
      if (!importer) return null;
      if (isNodeBuiltinImport(source)) {
        throw new Error(
          [
            'Client bundle attempted to import a Node builtin.',
            `import: ${JSON.stringify(source)}`,
            `from: ${importer}`,
            'Fix: move this code behind an API endpoint, or into a *.node.ts entrypoint and keep the browser entrypoint pure.',
          ].join('\n')
        );
      }
      return null;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isShip = mode === 'ship';
  return {
    plugins: [nodeBuiltinTripwire(), react()],
    resolve: {
      alias: {
        '@core': path.resolve(__dirname, './src/core'),
        '@battery': path.resolve(__dirname, './src/modules/battery'),
        '@hvac': path.resolve(__dirname, './src/modules/hvac'),
        '@financials': path.resolve(__dirname, './src/modules/financials'),
        '@utils': path.resolve(__dirname, './src/utils'),
      },
    },
    optimizeDeps: {
      exclude: [],
    },
    server: {
      host: '0.0.0.0', // Listen on all network interfaces (IPv4 and IPv6)
      port: 5173,
      watch: {
        // Avoid full page reloads when backend writes data (projects/analyses/library, etc)
        ignored: ['**/data/**'],
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    publicDir: 'public',
    // Copy data folder to public for browser access
    build: {
      rollupOptions: {
        input: isShip ? path.resolve(__dirname, 'index.ship.html') : path.resolve(__dirname, 'index.html'),
        onwarn(warning, warn) {
          const msg = String((warning as any)?.message || '');
          if (msg.includes('externalized for browser compatibility') && Array.from(NODE_BUILTINS).some((b) => msg.includes(`"${b}"`) || msg.includes(`'${b}'`))) {
            throw new Error(`Node builtin leaked into client build:\n${msg}`);
          }
          warn(warning);
        },
        output: {
          manualChunks: undefined,
        },
      },
    },
  };
})

