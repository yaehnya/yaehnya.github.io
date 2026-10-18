// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // The final domain (e.g. https://yeyo.mx), for absolute links in the share previews, the canonical
  // links and the sitemap. Set SITE_URL when building (on Netlify: an environment variable).
  site: process.env.SITE_URL || undefined,
  devToolbar: { enabled: false },
  // Pages are fetched ahead when a link is hovered (and the springboard's, when it opens), so they open
  // at once.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
