// The rolling game. Positions are page pixels (the page as laid out, 1 px = 1 mm of ball). The ball
// heads toward the pointer, picks up anything small enough that it touches, bounces off images and
// controls too big to take, and the camera follows it, pulling back as it grows. A stickman pushes it.

import { Ball } from './ball.js';
import { Pusher } from './pusher.js';
import { plink, rumble } from './audio.js';
import { glassFilter } from '../liquid-glass.js';

const PICK = 1.8;          // an item is taken when its size is at most PICK × the ball's radius
const BLOCK = 4;           // solid items up to BLOCK × the radius block the ball; bigger ones are floor
const CELL = 128;
const MAX_STEP = 0.5;      // largest move per physics step, in ball radii
const REACH = 0.9;         // share of the items the size curve should make reachable
const GOAL_SHARE = 0.85;   // the goal is this share of the largest diameter you can reach

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const grown = (r, s, grow) => Math.cbrt(r ** 3 + grow * s ** 3);

export const fmtSize = mm => mm < 100 ? `${mm.toFixed(0)} mm` : mm < 1000 ? `${(mm / 10).toFixed(1)} cm` : `${(mm / 1000).toFixed(2)} m`;

// Roll up everything you possibly can, smallest first: how big do you get, and how much did you take?
function simulate(sorted, r0, grow) {
  let r = r0, count = 0;
  const gone = new Set();
  const take = it => { if (gone.has(it)) return; gone.add(it); count++; it.kids.forEach(take); };
  for (const it of sorted) {
    if (gone.has(it)) continue;
    if (it.s > r * PICK) break;
    r = grown(r, it.s, grow);
    take(it);
  }
  return { r, count };
}

// Tune the size curve to the page. The ball starts able to eat the smallest tenth of the page, and
// grows fast enough that most of it is reachable: a sparse page needs a steeper curve than a dense one.
export function calibrate(items) {
  const sorted = [...items].sort((a, b) => a.s - b.s);
  const r0 = Math.max(4, sorted[Math.floor(sorted.length * 0.1)].s / PICK);
  let grow = 0.03, run = simulate(sorted, r0, grow);
  while (run.count < REACH * items.length && grow < 50) run = simulate(sorted, r0, grow *= 1.3);
  return { r0, grow, goal: Math.max(6 * r0, 2 * run.r * GOAL_SHARE) };
}

// A uniform grid so each frame only looks at what is near the ball.
class Hash {
  constructor() { this.cells = new Map(); this.stamp = 0; }
  add(it) {
    for (let cy = Math.floor(it.y / CELL), ye = Math.floor((it.y + it.h) / CELL); cy <= ye; cy++) {
      for (let cx = Math.floor(it.x / CELL), xe = Math.floor((it.x + it.w) / CELL); cx <= xe; cx++) {
        const key = cx + cy * 100003;
        const cell = this.cells.get(key);
        if (cell) cell.push(it); else this.cells.set(key, [it]);
      }
    }
  }
  query(x0, y0, x1, y1, fn) {
    const stamp = ++this.stamp;
    for (let cy = Math.floor(y0 / CELL); cy <= Math.floor(y1 / CELL); cy++) {
      for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) {
        for (const it of this.cells.get(cx + cy * 100003) || []) {
          if (it.stamp === stamp || it.gone) continue;
          it.stamp = stamp;
          fn(it);
        }
      }
    }
  }
}

export class Game {
  // `back` and `canvas` sit under and over the `glass` element; see ball.js.
  constructor({ world, back, glass, canvas, hud, onGoal }) {
    this.world = world; this.glass = glass; this.hud = hud; this.onGoal = onGoal;
    this.gBack = back.getContext('2d');
    this.g = canvas.getContext('2d');
    this.keys = new Set();
    this.pointer = { x: 0, y: 0, on: false };
    this.running = false;
    this.tick = this.tick.bind(this);
    this.resize();
    addEventListener('resize', () => this.resize());
    addEventListener('pointermove', e => { this.pointer.x = e.clientX; this.pointer.y = e.clientY; this.pointer.on = true; });
    addEventListener('pointerdown', e => { this.pointer.x = e.clientX; this.pointer.y = e.clientY; this.pointer.on = true; });
    addEventListener('pointerup', e => { if (e.pointerType === 'touch') this.pointer.on = false; });
    addEventListener('keydown', e => this.keys.add(e.key.toLowerCase()));
    addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());
  }

  resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.vw = innerWidth; this.vh = innerHeight; this.dpr = dpr;
    for (const g of [this.gBack, this.g]) {
      g.canvas.width = Math.round(this.vw * dpr);
      g.canvas.height = Math.round(this.vh * dpr);
    }
  }

  begin(page, items, { r0, grow, goal }) {
    this.page = page; this.items = items; this.goal = goal; this.grow = grow; this.r0 = r0;
    this.hash = new Hash();
    for (const it of items) this.hash.add(it);
    this.total = items.length;
    this.eaten = this.lastEaten = 0;
    this.hidden = [];
    this.holes = [];
    this.r = r0;
    this.vx = this.vy = 0;
    // Start in the middle of the text, where the smallest things are.
    const text = items.filter(i => i.kind === 'text'), pool = text.length ? text : items;
    const mid = a => a.sort((p, q) => p - q)[a.length >> 1];
    this.x = mid(pool.map(i => i.x + i.w / 2));
    this.y = mid(pool.map(i => i.y + i.h / 2));
    this.ball = new Ball();
    this.pusher = new Pusher();
    this.cam = { x: this.x, y: this.y, z: this.targetZoom() };
    this.won = false;
    this.start = this.last = performance.now();
    this.updateHud();
    if (!this.running) { this.running = true; requestAnimationFrame(this.tick); }
  }

  // Stop and put back everything that was eaten.
  stop() {
    this.running = false;
    rumble(0);
    for (const el of this.hidden || []) el.style.visibility = '';
    for (const hole of this.holes || []) hole.remove();
    this.hidden = [];
    this.holes = [];
    this.world.style.transform = '';
    for (const g of [this.gBack, this.g]) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, g.canvas.width, g.canvas.height);
    }
  }

  // The camera shows about 10 radii plus a margin, so the ball stays a reasonable size on screen.
  targetZoom() { return this.vh / (this.r * 10 + 90); }

  tick(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.step(dt);
    this.draw(dt);
    requestAnimationFrame(this.tick);
  }

  // Where the player wants to go, as a vector of length 0..1.
  steer() {
    const k = this.keys;
    const kx = (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0);
    const ky = (k.has('arrowdown') || k.has('s') ? 1 : 0) - (k.has('arrowup') || k.has('w') ? 1 : 0);
    if (kx || ky) { const m = Math.hypot(kx, ky); return [kx / m, ky / m]; }
    if (!this.pointer.on) return [0, 0];
    const [sx, sy] = this.toScreen(this.x, this.y);
    const dx = this.pointer.x - sx, dy = this.pointer.y - sy, d = Math.hypot(dx, dy);
    const R = this.r * this.cam.z;
    const power = clamp((d - R * 0.4) / (R * 2.5 + 40), 0, 1);
    return d ? [dx / d * power, dy / d * power] : [0, 0];
  }

  toScreen(x, y) {
    const { cam } = this;
    return [this.vw / 2 + (x - cam.x) * cam.z, this.vh / 2 + (y - cam.y) * cam.z];
  }

  // Follow the ball, but keep the page filling the screen where it can, and centred once it fits.
  camTarget(z) {
    const fit = (pos, size, view) => size * z <= view ? size / 2 : clamp(pos, view / 2 / z, size - view / 2 / z);
    return [fit(this.x, this.page.w, this.vw), fit(this.y, this.page.h, this.vh)];
  }

  step(dt) {
    const [ax, ay] = this.steer();
    const vmax = 60 + this.r * 9;                             // page px/s; about constant on screen
    const ease = Math.min(1, dt * 5);
    this.vx += (ax * vmax - this.vx) * ease;
    this.vy += (ay * vmax - this.vy) * ease;

    const x0 = this.x, y0 = this.y;
    const steps = Math.max(1, Math.ceil(Math.hypot(this.vx, this.vy) * dt / (this.r * MAX_STEP)));
    for (let i = 0; i < steps; i++) {
      this.x = clamp(this.x + this.vx * dt / steps, 0, this.page.w);
      this.y = clamp(this.y + this.vy * dt / steps, 0, this.page.h);
      this.collide();
    }
    this.ball.roll(this.x - x0, this.y - y0, this.r);
    rumble(Math.min(1, Math.hypot(this.vx, this.vy) / vmax));

    const cam = this.cam;
    cam.z += (this.targetZoom() - cam.z) * Math.min(1, dt * 3);
    const [tx, ty] = this.camTarget(cam.z), follow = Math.min(1, dt * 8);
    cam.x += (tx - cam.x) * follow;
    cam.y += (ty - cam.y) * follow;
  }

  collide() {
    const { x, y, r } = this;
    this.hash.query(x - r, y - r, x + r, y + r, it => {
      const nx = clamp(x, it.x, it.x + it.w), ny = clamp(y, it.y, it.y + it.h);
      const dx = x - nx, dy = y - ny, d2 = dx * dx + dy * dy;
      if (it.s <= r * PICK) {
        if (d2 < (r * 0.9) ** 2) this.eat(it);
      } else if (d2 < r * r && this.blocks(it)) {
        this.bounce(it, dx, dy, Math.sqrt(d2));
      }
    });
  }

  // Images and controls a bit too big to take are in the way. Much bigger ones are ground to roll
  // over, and anything still carrying smaller things lets the ball in to pick those off first.
  blocks(it) {
    return it.solid && it.s <= this.r * BLOCK && !it.kids.some(k => !k.gone);
  }

  // Push the ball out of a rectangle it cannot take and reflect its velocity.
  bounce(it, dx, dy, d) {
    let nx, ny, depth;
    if (d > 0) { nx = dx / d; ny = dy / d; depth = this.r - d; }
    else {                                                    // centre inside: leave by the nearest side
      const gaps = [[this.x - it.x, -1, 0], [it.x + it.w - this.x, 1, 0], [this.y - it.y, 0, -1], [it.y + it.h - this.y, 0, 1]];
      const [gap, gx, gy] = gaps.sort((p, q) => p[0] - q[0])[0];
      nx = gx; ny = gy; depth = gap + this.r;
    }
    this.x += nx * depth; this.y += ny * depth;
    const vn = this.vx * nx + this.vy * ny;
    if (vn < 0) { this.vx -= 1.4 * vn * nx; this.vy -= 1.4 * vn * ny; }
  }

  eat(it) {
    const take = n => { n.gone = true; this.eaten++; n.kids.forEach(take); };
    take(it);
    if (it.kind === 'tile') this.punch(it);
    else { it.el.style.visibility = 'hidden'; this.hidden.push(it.el); }
    this.ball.stick(it, it.x + it.w / 2 - this.x, it.y + it.h / 2 - this.y);
    this.r = grown(this.r, it.s, this.grow);
    plink(it.s);
    this.toast(it);
    this.updateHud();
    if (!this.won && 2 * this.r >= this.goal) { this.won = true; this.onGoal((performance.now() - this.start) / 1000); }
  }

  // A taken tile leaves a hole the colour of whatever is behind the image.
  punch(it) {
    const hole = document.createElement('div');
    Object.assign(hole.style, {
      position: 'absolute', left: `${it.x}px`, top: `${it.y}px`, width: `${it.w}px`, height: `${it.h}px`,
      background: it.bg, pointerEvents: 'none',
    });
    this.world.append(hole);
    this.holes.push(hole);
  }

  toast(it) {
    const label = { text: it.el.textContent, img: 'imagen', tile: 'foto', ctl: 'control', box: 'bloque' }[it.kind];
    const kids = this.eaten - this.lastEaten - 1;
    this.lastEaten = this.eaten;
    const t = this.hud.toast;
    t.textContent = kids > 0 ? `${label} +${kids}` : label;
    t.classList.add('on');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('on'), 900);
  }

  updateHud() {
    const h = this.hud, share = this.eaten / this.total;
    h.size.textContent = fmtSize(2 * this.r);
    h.items.textContent = this.eaten;
    h.pct.textContent = `${(100 * share).toFixed(share < 0.1 ? 1 : 0)}%`;
    h.goal.style.width = `${clamp((this.r - this.r0) / (this.goal / 2 - this.r0), 0, 1) * 100}%`;
  }

  draw(dt) {
    const { cam, vw, vh } = this;
    this.world.style.transform = `translate(${vw / 2 - cam.x * cam.z}px, ${vh / 2 - cam.y * cam.z}px) scale(${cam.z})`;
    for (const g of [this.gBack, this.g]) {
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.clearRect(0, 0, vw, vh);
    }
    const [sx, sy] = this.toScreen(this.x, this.y);
    const R = this.ball.radius(this.r * cam.z, dt);
    this.ball.drawBack(this.gBack, sx, sy, R, cam.z);
    this.placeGlass(sx, sy, R);
    this.ball.drawFront(this.g, sx, sy, R, cam.z);
    this.pusher.draw(this.g, sx, sy, R, this.vx * cam.z, this.vy * cam.z, dt);
  }

  // The glass sphere is a real element so its backdrop-filter can bend the page behind it. Its SVG
  // filter is made for sizes rounded up to 8 px, so a growing ball reuses a handful of them.
  placeGlass(sx, sy, R) {
    const d = Math.max(4, 2 * R), el = this.glass;
    if (Math.abs(d - (this.glassD || 0)) > 0.5) {
      this.glassD = d;
      el.style.width = el.style.height = `${d}px`;
      const q = Math.ceil(d / 8) * 8;
      if (q !== this.glassQ) {
        this.glassQ = q;
        const f = glassFilter(q, q, 'blur(.6px) saturate(1.5) brightness(1.05)');
        if (f) el.style.backdropFilter = f;
      }
    }
    el.style.transform = `translate(${sx - d / 2}px, ${sy - d / 2}px)`;
  }
}
