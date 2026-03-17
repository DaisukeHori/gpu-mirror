import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    setupFiles: ['__tests__/helpers/setup.ts'],
  },
  resolve: {
    alias: {
      '@revol-mirror/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
});
