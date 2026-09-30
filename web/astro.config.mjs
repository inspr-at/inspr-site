// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // INSPR-492: the AEON preview URL now lives at /paimos/.
  redirects: {
    '/paimos-aeon': '/paimos/',
    '/paimos-aeon/de': '/paimos/de/',
  },
  // Keep executable modules external. Caddy's script-src 'self' covers the
  // content-addressed files without a new CSP hash for every small module.
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
});
