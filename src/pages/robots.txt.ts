// robots.txt: everything may be crawled; the sitemap is listed once the site has its domain.
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n${site ? `\nSitemap: ${new URL('/sitemap.xml', site).href}\n` : ''}`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
