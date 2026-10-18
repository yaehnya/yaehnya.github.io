// Each show's calendar file, /fechas/2026-11-14-ciudad-de-mexico.ics: "Agregar a mi calendario" on
// Fechas links here, and the phone opens it in its Calendar app.
import type { APIRoute, GetStaticPaths } from 'astro';
import { site, type Show } from '../../data/site';
import { slug, ics } from '../../data/calendar';

export const getStaticPaths = (() =>
  site.shows.map(show => ({ params: { show: slug(show) }, props: { show } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(ics((props as { show: Show }).show, site.name.charAt(0) + site.name.slice(1).toLowerCase()), { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
