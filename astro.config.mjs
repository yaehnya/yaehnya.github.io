// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

export default defineConfig({
  // The final domain (e.g. https://yeyo.mx), for absolute links in the share previews, the canonical
  // links and the sitemap. Set SITE_URL when building (on Netlify: an environment variable).
  site: process.env.SITE_URL || undefined,
  devToolbar: { enabled: false },
  integrations: [react()],
});