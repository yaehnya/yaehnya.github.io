// How the site moves, page to page and down a page.
//
// Down a page: Lenis smooths the wheel into one soft glide (touch screens keep their own scrolling,
// which already is). Not with reduced motion. Anything that scrolls on its own, like the Cover Flow,
// is marked data-lenis-prevent.
//
// Page to page (Astro's ClientRouter, with View Transitions): by default the new page slides in from
// the right and the old one out to the left, as iOS 4 pushed a screen; going back, the other way
// (global.css). From the springboard, an app opens from its icon instead: launch() passes the icon's
// place along with the navigation, and the swap would wipe what is set on <html>, so it is set again
// once the new page is in and cleared when the transition ends.
import Lenis from 'lenis';
import { navigate } from 'astro:transitions/client';

const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const lenis = still ? null : new Lenis({ autoRaf: true, lerp: .1 });

interface Launch { x: number; y: number; s: number }

const setLaunch = (l: Launch | null) => {
  const root = document.documentElement;
  if (!l) { root.removeAttribute('data-launch'); return; }
  root.setAttribute('data-launch', '');
  root.style.setProperty('--lx', `${l.x}px`);
  root.style.setProperty('--ly', `${l.y}px`);
  root.style.setProperty('--ls', String(l.s));
};

/** Opens a page as an app opening from its icon (`from`, the icon on the springboard). */
export function launch(href: string, from: Element) {
  const r = from.getBoundingClientRect();
  const l: Launch = { x: r.left + r.width / 2, y: r.top + r.height / 2, s: r.width / innerWidth };
  setLaunch(l);
  return navigate(href, { info: { launch: l } });
}

let pending: Launch | null = null;
document.addEventListener('astro:before-swap', e => {
  pending = (e.info as { launch?: Launch } | undefined)?.launch ?? null;
  e.viewTransition.finished.finally(() => { if (!pending) setLaunch(null); });
});
document.addEventListener('astro:after-swap', () => {
  setLaunch(pending);
  pending = null;
  // The router put the scroll where it belongs (the top, or where you were when going back); Lenis
  // starts from there.
  lenis?.resize();
  lenis?.scrollTo(scrollY, { immediate: true, force: true });
});
