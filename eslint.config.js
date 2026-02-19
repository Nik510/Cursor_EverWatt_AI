import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

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
];

