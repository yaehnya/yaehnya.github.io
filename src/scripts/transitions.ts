// How the site moves, inside the iPhone.
//
// The screen: a 480 × 320 point display (320 × 480 upright) scaled to the photo's screen; fit() sets
// the zoom, for every page and whenever the window changes.
//
// Down a page: the page scrolls inside the screen (#scroller); Lenis smooths the wheel into one soft
// glide, like a finger flicking (touch screens keep their own scrolling). Not with reduced motion.
// Anything that scrolls on its own, like the Cover Flow, is marked data-lenis-prevent.
//
// Page to page (Astro's ClientRouter, with View Transitions): the new screen pushes in from the right
// as iOS 4's did; going back, the other way (global.css). From the springboard, launch() opens the app
// as iOS 4 did, growing from the middle of the screen while the icons fly off; the swap wipes what is
// set on <html>, so the flag is set again once the new page is in and cleared when the transition ends.
import Lenis from 'lenis';
import { navigate } from 'astro:transitions/client';
import { position } from './player';
import { onPage } from './page';

const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const upright = matchMedia('(orientation: portrait), (pointer: coarse) and (max-height: 600px)');

/** The screen's zoom: the photo's screen width over the display's width in points. */
export function fit() {
  const s = document.getElementById('screen'), d = document.getElementById('display');
  if (s && d) d.style.zoom = String(s.clientWidth / (upright.matches ? 320 : 480));
}
addEventListener('resize', fit);

/** The page's scroller (the screen's), and its Lenis while the page is there. */
export const scroller = () => document.getElementById('scroller');
export let lenis: Lenis | null = null;
onPage(signal => {
  const wrapper = scroller(), content = document.getElementById('world');
  if (still || !wrapper || !content) return;
  lenis = new Lenis({ wrapper, content, autoRaf: true, lerp: .12 });
  signal.addEventListener('abort', () => { lenis?.destroy(); lenis = null; });
});
/** Back to the top of the page, as tapping the status bar did. */
export function toTop() {
  if (lenis) lenis.scrollTo(0, { duration: .6 });
  else scroller()?.scrollTo({ top: 0, behavior: still ? 'instant' : 'smooth' });
}

/** Opens a page as an app from the springboard. */
export function launch(href: string) {
  document.documentElement.setAttribute('data-launch', '');
  return navigate(href, { info: { launch: true } });
}

// A page that opens on one of several songs according to the link's #hash (the iPod: /musica#cancion-2)
// marks its container data-hash="cancion-" and the songs' covers [data-vt]. The one the hash names is
// picked here, before the new page is shown (data-index on the container, and that cover's
// view-transition-name from its data-vt), so a cover flying in from the last page lands on it.
function fromHash() {
  const box = document.querySelector<HTMLElement>('[data-hash]');
  if (!box) return;
  const items = [...box.querySelectorAll<HTMLElement>('[data-vt]')];
  const m = location.hash.match(new RegExp(`^#${box.dataset.hash}(\\d+)$`));
  // Without a hash, the song playing (or the first); and nothing flies in.
  const i = m ? Math.min(Math.max(+m[1] - 1, 0), items.length - 1) : Math.max(position(), 0);
  box.dataset.index = String(i);
  items.forEach((el, k) => { el.style.viewTransitionName = m && k === i ? el.dataset.vt! : ''; });
}
fromHash();

// Where each page was scrolled to, so going back returns there (the page scrolls inside the screen,
// where the router does not look).
const scrolled = new Map<string, number>();
let launching = false;
document.addEventListener('astro:before-swap', e => {
  scrolled.set(location.pathname, scroller()?.scrollTop ?? 0);
  launching = !!(e.info as { launch?: boolean } | undefined)?.launch;
  e.viewTransition.finished.finally(() => document.documentElement.removeAttribute('data-launch'));
});
document.addEventListener('astro:after-swap', () => {
  if (launching) document.documentElement.setAttribute('data-launch', '');
  fit();
  fromHash();
  const back = document.documentElement.getAttribute('data-astro-transition') === 'back';
  const s = scroller();
  if (s) s.scrollTop = back ? scrolled.get(location.pathname) ?? 0 : 0;
});
