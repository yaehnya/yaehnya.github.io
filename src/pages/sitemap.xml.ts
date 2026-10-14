// sitemap.xml: the site's pages, with absolute links, so only once the site has its domain (see `site`
// in astro.config.mjs). Without it, an empty sitemap.
import type { APIRoute } from 'astro';

const pages = ['/', '/musica', '/fechas', '/tienda', '/contacto', '/juego'];

export const GET: APIRoute = ({ site }) => {
  const urls = site ? pages.map(p => `  <url><loc>${new URL(p, site).href}</loc></url>`).join('\n') : '';
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
