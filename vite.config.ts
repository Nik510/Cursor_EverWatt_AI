import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
      output: {
        manualChunks: undefined,
      },
    },
  },
})

