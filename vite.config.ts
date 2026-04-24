import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Keep Tauri's output readable in the same terminal as Vite.
  clearScreen: false,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Tauri expects a fixed port; fail fast if it's taken.
    strictPort: true,
    host: true,
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
});
