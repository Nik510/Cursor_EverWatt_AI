import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

const NODE_BUILTINS = [
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
];

export default [
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.vite/**',
      '**/data/**',
      // Known legacy files with stale eslint-disable directives
      'src/config/academy-config.ts',
      'src/services/project-vault-extract.ts',
    ],
  },
  {
    // Ship-slice + platform hardening surface (keep low-churn)
    files: [
      'src/App.ship.tsx',
      'src/main.ship.tsx',
      'src/pages/**/*Ship.tsx',
      'src/types/**/*.ts',
      'src/config/**/*.ts',
      'src/services/**/*.{ts,tsx}',
      'src/backend/**/*.{ts,tsx}',
      'src/contexts/**/*.{ts,tsx}',
      'src/components/ai/**/*.{ts,tsx}',
      'src/components/projectBuilder/**/*.{ts,tsx}',
      'tests/platformHardeningP0.*.test.ts',
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Keep lint meaningful but low-churn.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Frontend boundary guardrails: forbid server-only / node-only imports in browser code.
    files: [
      'src/pages/**/*.{ts,tsx}',
      'src/components/**/*.{ts,tsx}',
      'src/contexts/**/*.{ts,tsx}',
      'src/main*.tsx',
      'src/App*.tsx',
      'src/shared/api/**/*.{ts,tsx}',
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // We don't enforce deps correctness globally yet, but we do want the rule to exist
      // so eslint-disable directives remain meaningful under the wider frontend lint surface.
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            ...NODE_BUILTINS.flatMap((b) => [
              { name: b, message: 'Node builtin imports are forbidden in frontend code. Move this to server-only code or a *.node.ts entrypoint.' },
              { name: `node:${b}`, message: 'Node builtin imports are forbidden in frontend code. Move this to server-only code or a *.node.ts entrypoint.' },
            ]),
          ],
          patterns: [
            // Node-only entrypoints
            { group: ['**/*.node', '**/*.node.*'], message: 'Frontend cannot import *.node.* entrypoints. Use API calls or a shared/browser-safe module.' },
            // Explicit server-only roots
            { group: ['**/serverOnly/**'], message: 'Frontend cannot import from src/serverOnly/**.' },
            // Known server-only engine runtime
            { group: ['**/modules/utilityIntelligence/**'], message: 'Frontend cannot import utilityIntelligence runtime. Use /api endpoints or src/shared/**.' },
            // Server-only report runtimes (allow UI report pages under src/modules/reports/pages/**)
            { group: ['**/modules/reports/internalEngineering/**'], message: 'Frontend cannot import internal engineering report runtime. Use /api endpoints.' },
            { group: ['**/modules/reports/utilitySummary/**'], message: 'Frontend cannot import utility summary report runtime. Use /api endpoints.' },
            { group: ['**/modules/analysisRunsV1/**'], message: 'Frontend cannot import analysisRunsV1 runtime. Use /api endpoints or src/shared/types/**.' },
          ],
        },
      ],
    },
  },
];

