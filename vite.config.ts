import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'node:path';

// BASE_PATH is set by the Pages workflow to "/<repo-name>/".
// Locally it defaults to "/" so `npm run dev` works without config.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [preact()],
  resolve: {
    alias: {
      '@engine': resolve(import.meta.dirname, 'engine'),
      '@content': resolve(import.meta.dirname, 'content'),
      '@skins': resolve(import.meta.dirname, 'skins'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        smallbiz: resolve(import.meta.dirname, 'index.html'),
        pro: resolve(import.meta.dirname, 'pro/index.html'),
      },
    },
  },
});
