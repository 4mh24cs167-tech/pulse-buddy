import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react() as any],
  server: {
    port: 5173,
    host: true,
  },
  resolve: {
    alias: {
      '@pulse-buddy/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@pulse-buddy/core': path.resolve(__dirname, '../../packages/core/src'),
      '@pulse-buddy/avatar': path.resolve(__dirname, '../../packages/avatar/src'),
      '@pulse-buddy/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@pulse-buddy/platform': path.resolve(__dirname, '../../packages/platform/src'),
    },
  },
  build: {
    outDir: 'dist',
  },
});
