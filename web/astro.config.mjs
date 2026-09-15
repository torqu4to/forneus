// @ts-check
import { defineConfig } from 'astro/config';

/**
 * The public origin of this build.
 *
 * It drives the canonical URL, the hreflang alternates and the Open Graph
 * url — everything that tells a crawler "this page lives HERE". Pointing
 * those at a domain that does not exist yet is worse than leaving them off:
 * it asks search engines to index a dead address.
 *
 * So the production domain is a default, not an assumption. Any other
 * deployment (the workers.dev subdomain, a preview branch) sets
 * PUBLIC_SITE_URL to its own origin, and `Site.astro` marks anything that is
 * not the production host as noindex.
 */
const SITE = process.env.PUBLIC_SITE_URL ?? 'https://forneus.wiki';

// https://astro.build/config
export default defineConfig({
  site: SITE,
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
