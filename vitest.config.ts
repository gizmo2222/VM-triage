import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      '@engine': resolve(import.meta.dirname, 'engine'),
      '@content': resolve(import.meta.dirname, 'content'),
      '@skins': resolve(import.meta.dirname, 'skins'),
    },
  },
  test: {
    include: ['engine/**/*.test.ts', 'content/**/*.test.ts', 'skins/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
