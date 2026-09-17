import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@engine': resolve(import.meta.dirname, 'engine'),
      '@content': resolve(import.meta.dirname, 'content'),
      '@skins': resolve(import.meta.dirname, 'skins'),
    },
  },
  test: {
    include: ['engine/**/*.test.ts', 'content/**/*.test.ts', 'skins/**/*.test.ts'],
    environment: 'node',
  },
});
