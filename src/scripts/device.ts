// The iPhone as a thing on the table. It leans a few degrees toward the pointer (or with the phone in
// the hand, from its gyroscope), and the light on its glass slides the other way (global.css: --rx,
// --ry, --gx). When the window turns from wide to tall or back, the iPhone turns with it, as the real
// one turned its screen. Nothing of this with reduced motion.

import { fit } from './transitions';

const still = matchMedia('(prefers-reduced-motion: reduce)');
const upright = matchMedia('(orientation: portrait), (pointer: coarse) and (max-height: 600px)');
const root = document.documentElement;

let aim = [0, 0], now = [0, 0], frame = 0;
const apply = () => {
  root.style.setProperty('--rx', `${(-now[1] * 3.2).toFixed(3)}deg`);
  root.style.setProperty('--ry', `${(now[0] * 4.5).toFixed(3)}deg`);
  root.style.setProperty('--gx', now[0].toFixed(3));
};
const step = () => {
  now = now.map((v, i) => v + (aim[i] - v) * .07);
  apply();
  frame = Math.abs(aim[0] - now[0]) + Math.abs(aim[1] - now[1]) > .001 ? requestAnimationFrame(step) : 0;
};
const toward = (x: number, y: number) => {
  if (still.matches) return;
  if (root.hasAttribute('data-intro')) x = y = 0;            // the intro's iPhone must land on a level one
  aim = [Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))];
  if (!frame) frame = requestAnimationFrame(step);
};

addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') toward(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1);
}, { passive: true });
document.documentElement.addEventListener('mouseleave', () => toward(0, 0));

// The gyroscope: iPhones ask first (on a touch); Android just gives it.
const tilt = (e: DeviceOrientationEvent) => { if (e.gamma != null && e.beta != null) toward(e.gamma / 25, (e.beta - 45) / 25); };
type Asking = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
if ((DeviceOrientationEvent as Asking).requestPermission) {
  addEventListener('touchend', () => {
    (DeviceOrientationEvent as Asking).requestPermission!().then(r => { if (r === 'granted') addEventListener('deviceorientation', tilt); }).catch(() => {});
  }, { once: true });
} else if ('DeviceOrientationEvent' in window) addEventListener('deviceorientation', tilt);

// The page swap replaces <html>'s style: put the lean back.
document.addEventListener('astro:after-swap', apply);

// Turning: the iPhone and its screen come round a quarter turn into their new place.
upright.addEventListener('change', e => {
  if (still.matches || document.documentElement.hasAttribute('data-intro')) return;
  fit();                                                     // the screen's new size first
  const turn = e.matches ? -90 : 90;
  for (const el of document.querySelectorAll<HTMLElement>('.device, .screen')) {
    el.animate([{ rotate: `${turn}deg`, scale: .82 }, { rotate: '0deg', scale: 1 }], { duration: 650, easing: 'cubic-bezier(.3, .7, .2, 1)' });
  }
});
