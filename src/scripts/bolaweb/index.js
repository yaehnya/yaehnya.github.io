// Turns the page itself into the level: freeze #world where it is, read it, roll it up. Leaving puts
// everything back (the text stays wrapped in spans, which changes nothing on screen).

import { extract } from './extract.js';
import { Game, calibrate, fmtSize } from './game.js';
import { unlock, setMuted } from './audio.js';

const IMAGE_WAIT = 3000;

// Lazy images below the fold have not loaded yet; the ball needs them to make stickers.
async function loadImages(root) {
  const pending = [...root.querySelectorAll('img')].filter(i => !i.complete);
  for (const img of pending) img.loading = 'eager';
  await Promise.race([
    Promise.all(pending.map(i => i.decode().catch(() => {}))),
    new Promise(r => setTimeout(r, IMAGE_WAIT)),
  ]);
}

// `ui`: the overlay's elements (root, back, glass, canvas, toast, size, items, pct, goal, done, time, mute).
export function setup(ui) {
  const world = document.getElementById('world');
  let game = null, saved = null, muted = false, busy = false;

  async function start() {
    if (busy || game?.running) return;
    busy = true;
    unlock();
    await loadImages(world);
    scrollTo(0, 0);
    const { width, height } = world.getBoundingClientRect();
    saved = world.getAttribute('style');
    Object.assign(world.style, {
      position: 'fixed', left: '0', top: '0', width: `${width}px`, height: `${Math.max(height, innerHeight)}px`,
      transformOrigin: '0 0', pointerEvents: 'none',
    });
    document.documentElement.classList.add('bw-on');
    const { page, items } = extract(world);
    busy = false;
    if (items.length < 3) { stop(); return; }
    game ||= new Game({ world, back: ui.back, glass: ui.glass, canvas: ui.canvas, hud: ui, onGoal: showGoal });
    ui.root.hidden = false;
    ui.done.hidden = true;
    game.begin(page, items, calibrate(items));
  }

  function stop() {
    game?.stop();
    if (saved === null) world.removeAttribute('style'); else world.setAttribute('style', saved);
    document.documentElement.classList.remove('bw-on');
    ui.root.hidden = true;
  }

  function showGoal(seconds) {
    const m = Math.floor(seconds / 60), s = String(Math.round(seconds % 60)).padStart(2, '0');
    ui.time.textContent = `${fmtSize(2 * game.r)} · ${m}:${s}`;
    ui.done.hidden = false;
  }

  function toggleMute() {
    muted = !muted;
    setMuted(muted);
    ui.mute.textContent = muted ? 'Sonido no' : 'Sonido sí';
  }

  for (const b of document.querySelectorAll('[data-bolaweb]')) b.addEventListener('click', start);
  for (const b of ui.root.querySelectorAll('[data-bw-exit]')) b.addEventListener('click', stop);
  ui.root.querySelector('[data-bw-more]').addEventListener('click', () => { ui.done.hidden = true; });
  ui.root.querySelector('[data-bw-again]').addEventListener('click', () => { stop(); start(); });
  ui.mute.addEventListener('click', toggleMute);
  addEventListener('keydown', e => {
    if (!game?.running) return;
    if (e.key === 'Escape') stop();
    else if (e.key.toLowerCase() === 'm') toggleMute();
  });

  return { start, stop, get game() { return game; } };
}
