// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://forneus.wiki',
  // Fully prerendered. The solver runs in the visitor's browser, so there is
  // nothing to render per request and the whole site is a folder of files.
  build: { format: 'directory' },

  vite: {
    server: {
      fs: {
        // The game tables live in the Python package, and the browser solver
        // imports that same file. One source of numbers, two consumers — a
        // copy under web/ would be a second thing to keep in sync.
        allow: ['..'],
      },
    },
  },
});
