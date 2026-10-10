import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@pulse-buddy/shared-types': path.resolve(__dirname, 'packages/shared-types/src'),
      '@pulse-buddy/core': path.resolve(__dirname, 'packages/core/src'),
      '@pulse-buddy/avatar': path.resolve(__dirname, 'packages/avatar/src'),
      '@pulse-buddy/ui': path.resolve(__dirname, 'packages/ui/src'),
      '@pulse-buddy/platform': path.resolve(__dirname, 'packages/platform/src'),
    },
  },
});
