// Liquid glass, when it is worth its weight. The page already shows the social logos and the glass ball
// drawn in CSS; React and liquid-glass-react (about 270 KB) load only in Chromium (Chrome, Edge, Opera:
// the one engine that draws the refraction) and only once the page is idle, then take their place.
// Elsewhere the CSS glass stays, so nothing is downloaded for nothing.
const chromium = !!(navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } })
  .userAgentData?.brands.some(b => /Chromium/.test(b.brand));
const wanted = document.querySelector('[data-glass-social], [data-glass-orb]');

if (chromium && wanted && !matchMedia('(prefers-reduced-transparency: reduce)').matches) {
  const load = () => import('./glass-mount').then(m => m.mount());
  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 3000 });
  else setTimeout(load, 1500);
}
