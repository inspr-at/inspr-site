// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Keep executable modules external. Caddy's script-src 'self' covers the
  // content-addressed files without a new CSP hash for every small module.
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
});
