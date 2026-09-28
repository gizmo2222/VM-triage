import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'node:path';

// BASE_PATH is set by the FlintScope site deploy to "/game/".
// Locally it defaults to "/" so `npm run dev` works without config.
//
// The practitioner edition is parked and is not published. It still runs under
// `npm run dev` at /pro/, but a build only includes it when GAME_PRO=1.
const withPro = process.env.GAME_PRO === '1';

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
        ...(withPro ? { pro: resolve(import.meta.dirname, 'pro/index.html') } : {}),
      },
    },
  },
});
