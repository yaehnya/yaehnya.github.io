// EarPods and a dock cable lying on the table around the phone, seen from above as in a photo: the
// cables are verlet ropes (with a little bending stiffness), there is no gravity, only the table's
// friction. Pick up a bud, or the wire anywhere, and drag; let go and it slides to a stop. With music
// playing (an analyser attached) the buds tremble faintly on the bass. Sizes follow the phone, measured in millimetres
// of a real iPhone 4 (58.6 mm wide).

const ITERATIONS = 16;
const FRICTION = 0.9;         // velocity kept per frame: high, the cable slides on a table
const BEND = 0.2;             // stiffness of the bending links (every second particle)
const PHONE_MM = 58.6;

// The pieces are photos (tools/internet_assets.py): their real length in mm (the width of the
// image), and where the cable meets them, as fractions of the image. Each bud's stem points left,
// its head is on the right, curving down; the remote lies along x with its + on the right; the plug
// stands up, its cable leaving from the top; the connector's top face is up, its strain relief below.
const PIECES = {
  budA: { file: 'earpod-a.webp', mm: 35, attach: [0.0024, 0.5315] },
  budB: { file: 'earpod-b.webp', mm: 35, attach: [0.0047, 0.2553] },
  remote: { file: 'control.webp', mm: 34 },
  plug: { file: 'plug.webp', mm: 5 },
  connector: { file: 'conector.webp', mm: 21.5 },
};
const REMOTE_SPAN = 6;        // particles on each side of the remote's centre held straight by it

// The cable is a photo too (cable.webp): a straight piece, repeating along its length, laid along each
// wire. `body` is the share of the image's height the cable fills. The colours are for its shadow and
// for drawing it until the photo has loaded.
const CABLE = { file: 'cable.webp', body: 0.704, edge: '#b9b3a7', core: '#f2f0ea', shine: 'rgba(255,255,255,.9)', shadow: 'rgba(70,55,35,.24)' };

export class Earphones {
  // `ignore`: a selector for things on the page the cables never take a press from (a slider, say).
  constructor(canvas, phone, root, { pieces = '/fotos/', ignore = null } = {}) {
    this.canvas = canvas; this.phone = phone; this.root = root; this.ignore = ignore;
    this.g = canvas.getContext('2d');
    this.img = {};
    for (const [k, { file }] of Object.entries(PIECES)) { this.img[k] = new Image(); this.img[k].src = pieces + file; }
    this.cable = new Image(); this.cable.src = pieces + CABLE.file;
    this.bass = 0;
    this.drag = null;
    this.analyser = null;
    this.running = false;
    this.tick = this.tick.bind(this);
    root.addEventListener('pointerdown', e => this.down(e), { capture: true });
    root.addEventListener('pointermove', e => this.move(e));
    root.addEventListener('pointerup', e => this.up(e));
    root.addEventListener('pointercancel', e => this.up(e));
    root.addEventListener('click', e => { if (this.justDragged) { e.stopPropagation(); e.preventDefault(); this.justDragged = false; } }, { capture: true });
    addEventListener('resize', () => { if (this.running) this.place(); });
  }

  attachAnalyser(analyser) { this.analyser = analyser; this.freq = new Uint8Array(analyser.frequencyBinCount); }

  // Where the split, the remote and the buds end up: for a bud, the end of its stem and the way its
  // head points (and `side`, which way it curves, when not the usual); for the remote, its middle and
  // the way it lies. With room beside the phone, one bud lies out to its left; the right cable crosses
  // the top of the phone, as in the photo, and runs down its right side past the remote to the other
  // bud. On a narrow screen the split is above the phone and both buds hang down its sides. Either way
  // the screen stays clear, so the songs can be read.
  layout(r) {
    const w = r.width, h = r.height;
    if (r.left > 0.45 * w) {
      return {
        split: { x: r.left - 0.3 * w, y: r.top - 0.03 * h },
        left: { x: r.left - 0.4 * w, y: r.top + 0.36 * h, dir: 2.2 },
        remote: { x: r.right + 0.12 * w, y: r.top + 0.2 * h, dir: Math.PI / 2 },
        right: { x: r.right + 0.12 * w, y: r.top + 0.45 * h, dir: 1.0 },
      };
    }
    return {
      split: { x: r.left + 0.55 * w, y: r.top - 0.1 * h },
      left: { x: r.left - 0.04 * w, y: r.top + 0.3 * h, dir: 1.5, side: 1 },     // its head toward the edge, off the screen
      remote: { x: r.right + 0.065 * w, y: r.top + 0.25 * h, dir: Math.PI / 2 },
      right: { x: r.right + 0.05 * w, y: r.top + 0.5 * h, dir: 1.6 },
    };
  }

  // A piece's drawn size: its length in mm, and its height from the image's proportions.
  size(k, u) {
    const img = this.img[k], w = PIECES[k].mm * u;
    return { w, h: img.naturalWidth ? w * img.naturalHeight / img.naturalWidth : w * 0.4 };
  }

  // Where things plug in, from the phone's current box. The plug's body sits on the case's top edge
  // and the connector's face just under its bottom edge; the cables leave from their far ends.
  anchors() {
    const r = this.phone.getBoundingClientRect(), u = r.width / PHONE_MM;
    const plug = { x: r.left + r.width * 0.2, y: r.top + 0.6 * u }, con = { x: r.left + r.width / 2, y: r.bottom - 1.2 * u };
    return {
      r, u, plug, con,
      jack: { x: plug.x, y: plug.y - this.size('plug', u).h + 0.5 * u },
      dock: { x: con.x, y: con.y + this.size('connector', u).h - 0.8 * u },
      dockEnd: { x: r.left + r.width * 0.68, y: innerHeight + 80 },   // the cable runs off the bottom edge
    };
  }

  // Lay the cables down the way a dropped cable falls: a wandering line that drifts toward a target.
  build() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.canvas.width = innerWidth * dpr; this.canvas.height = innerHeight * dpr; this.dpr = dpr;
    const a = this.anchors(), { r, u } = a;
    this.u = u; this.width = 1.45 * u; this.seg = 2.6 * u;
    this.p = []; this.links = []; this.pins = new Map(); this.drag = null; this.settling = false;

    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // `from` is a position, or the id of a particle to grow from (the split, for the two branches).
    const chain = (from, count, target, turn) => {
      const ids = [typeof from === 'number' ? from : this.add(from.x, from.y)];
      let { x, y } = this.p[ids[0]], ang = Math.atan2(target.y - y, target.x - x);
      while (ids.length < count) {
        const want = Math.atan2(target.y - y, target.x - x);
        ang += (rand() - 0.5) * turn + Math.atan2(Math.sin(want - ang), Math.cos(want - ang)) * 0.12;
        x += Math.cos(ang) * this.seg; y += Math.sin(ang) * this.seg;
        ids.push(this.add(x, y));
      }
      for (let i = 1; i < ids.length; i++) this.link(ids[i - 1], ids[i], this.seg, 1);
      for (let i = 2; i < ids.length; i++) this.link(ids[i - 2], ids[i], this.seg * 1.96, BEND);
      return ids;
    };
    const H = r.height;
    const n = len => Math.max(8, Math.round(len / this.seg));    // at least the stiff stretch behind a bud

    // Earphones: plug → split, then a branch to each bud. The right branch carries the remote.
    // Lengths a little longer than the distances they span, so the cable lies in loose curves, not knots.
    const at = this.layout(r), len = (from, to, slack) => Math.hypot(to.x - from.x, to.y - from.y) * slack + 0.05 * H;
    // A branch to a bud: the way to where its stiff stem begins, then the stem's four segments.
    const toStem = (from, bud, slack) => {
      const stem = { x: bud.x - Math.cos(bud.dir) * 4 * this.seg, y: bud.y - Math.sin(bud.dir) * 4 * this.seg };
      return Math.max(4, Math.round(Math.hypot(stem.x - from.x, stem.y - from.y) * slack / this.seg)) + 4;
    };
    this.main = chain(a.jack, n(len(a.jack, at.split, 1.5)), at.split, 0.45);
    const split = this.main.at(-1);
    this.left = chain(split, toStem(at.split, at.left, 1.15) + 1, at.left, 0.3);
    // The right branch passes the remote's middle on its way to the bud.
    const lead = Math.max(REMOTE_SPAN + 3, n(len(at.split, at.remote, 1.15)));
    const tail = Math.max(REMOTE_SPAN + 6, toStem(at.remote, at.right, 1.1));
    const toRemote = chain(split, lead + 1, at.remote, 0.3), toBud = chain(toRemote.at(-1), tail + 1, at.right, 0.3);
    this.right = toRemote.concat(toBud.slice(1));
    this.link(this.right[lead - 1], this.right[lead + 1], this.seg * 1.96, BEND);
    const ri = lead;
    this.remote = this.right[ri];
    for (const id of [this.left.at(-1), this.right.at(-1)]) this.p[id].w = 0.45;   // the buds are heavier
    // The stem and the strain relief behind each bud are stiff: the last stretch hardly bends.
    for (const ids of [this.left, this.right]) {
      for (let i = ids.length - 5; i < ids.length; i++) this.link(ids[i - 2], ids[i], this.seg * 2, 0.9);
    }
    // So is the remote, a rigid stick on the cable.
    const span = this.right.slice(ri - REMOTE_SPAN, ri + REMOTE_SPAN + 1);
    for (let i = 2; i < span.length; i++) this.link(span[i - 2], span[i], this.seg * 2, 0.95);
    this.link(span[0], span.at(-1), this.seg * 2 * REMOTE_SPAN, 1);

    // Dock cable: connector → off the bottom of the screen.
    this.dock = chain(a.dock, n(H * 0.7), a.dockEnd, 0.5);

    this.pins.set(this.main[0], () => this.anchors().jack);
    this.pins.set(this.dock[0], () => this.anchors().dock);
    this.pins.set(this.dock.at(-1), () => this.anchors().dockEnd);
    this.buds = [this.left.at(-1), this.right.at(-1)];
    this.sides = [at.left.side ?? -1, at.right.side ?? 1];
  }

  add(x, y) { this.p.push({ x, y, px: x, py: y, w: 1 }); return this.p.length - 1; }
  link(a, b, len, k) { this.links.push({ a, b, len, k }); }

  // Pull the split, the buds and the remote toward their resting places (see layout) for a moment, as
  // if someone set them down.
  settle(ms = 2200) { this.settling = true; this.settleUntil = performance.now() + ms; }

  // Where each guided particle should be now, from where the phone is now (it may still be rising).
  // Each bud is guided by its stem and the cable just behind it, so it points the right way; the
  // remote by both ends.
  targets() {
    const at = this.layout(this.anchors().r), along = REMOTE_SPAN * this.seg;
    const list = [{ id: this.main.at(-1), x: at.split.x, y: at.split.y }];
    for (const [ids, { x, y, dir }] of [[this.left, at.left], [this.right, at.right]]) {
      for (let k = 0; k < 5; k++) list.push({ id: ids.at(-1 - k), x: x - Math.cos(dir) * k * this.seg, y: y - Math.sin(dir) * k * this.seg });
    }
    const ri = this.right.indexOf(this.remote), { x, y, dir } = at.remote;
    for (const s of [-1, 1]) list.push({ id: this.right[ri + s * REMOTE_SPAN], x: x + s * Math.cos(dir) * along, y: y + s * Math.sin(dir) * along });
    return list;
  }

  // Everything straight where it rests, at once: without the entrance, and after a resize.
  place() {
    this.build(); this.settle();
    for (let i = 0; i < 150; i++) this.step();
    this.settleUntil = 0; this.step();
  }

  start(entrance = true) {
    if (entrance) { this.build(); this.settle(); } else this.place();
    if (!this.running) { this.running = true; requestAnimationFrame(this.tick); }
  }
  stop() { this.running = false; }

  nearest(x, y) {
    let best = null, bd = Infinity;
    for (const [k, id] of this.buds.entries()) {                    // buds first: anywhere on the bud
      const ids = k ? this.right : this.left, end = this.p[id], prev = this.p[ids.at(-3)];
      const ang = Math.atan2(end.y - prev.y, end.x - prev.x), len = PIECES.budA.mm * this.u * 0.9;
      const hx = end.x + Math.cos(ang) * len, hy = end.y + Math.sin(ang) * len;
      const t = Math.max(0, Math.min(1, ((x - end.x) * (hx - end.x) + (y - end.y) * (hy - end.y)) / (len * len)));
      const d = Math.hypot(x - (end.x + (hx - end.x) * t), y - (end.y + (hy - end.y) * t));
      if (d < 7 * this.u && d < bd) { best = id; bd = d; }
    }
    if (best !== null) return best;
    for (const ids of [this.main, this.left, this.right, this.dock]) {
      for (const id of ids) {
        const d = Math.hypot(this.p[id].x - x, this.p[id].y - y);
        if (d < Math.max(14, this.width * 2.4) && d < bd && !this.pins.has(id)) { best = id; bd = d; }
      }
    }
    return best;
  }

  down(e) {
    if (!this.running || (this.ignore && e.target.closest?.(this.ignore))) return;
    const id = this.nearest(e.clientX, e.clientY);
    if (id === null) return;
    e.preventDefault(); e.stopPropagation();
    this.drag = { id, x: e.clientX, y: e.clientY, pointer: e.pointerId };
    try { this.root.setPointerCapture(e.pointerId); } catch { /* synthetic events have no capturable pointer */ }
    this.root.style.cursor = 'grabbing';
  }
  move(e) {
    if (this.drag && e.pointerId === this.drag.pointer) { this.drag.x = e.clientX; this.drag.y = e.clientY; this.justDragged = true; return; }
    if (this.running) this.root.style.cursor = this.nearest(e.clientX, e.clientY) !== null ? 'grab' : '';
  }
  up(e) {
    if (!this.drag || e.pointerId !== this.drag.pointer) return;
    this.drag = null;
    this.root.style.cursor = '';
    setTimeout(() => { this.justDragged = false; }, 0);
  }

  step() {
    const now = performance.now();
    for (const q of this.p) {
      const vx = (q.x - q.px) * FRICTION, vy = (q.y - q.py) * FRICTION;
      q.px = q.x; q.py = q.y; q.x += vx; q.y += vy;
    }
    if (this.settling) {
      if (now < this.settleUntil) {
        // Guide them without giving them momentum (shift the previous position too)…
        for (const t of this.targets()) {
          const q = this.p[t.id], dx = (t.x - q.x) * 0.1, dy = (t.y - q.y) * 0.1;
          q.x += dx; q.y += dy; q.px += dx; q.py += dy;
        }
      } else {
        // …and when they are down, let everything come to rest where it is.
        for (const q of this.p) { q.px = q.x; q.py = q.y; }
        this.settling = false;
      }
    }
    if (this.analyser) {                       // how loud the bass is: jumps up on a beat, eases back down
      this.analyser.getByteFrequencyData(this.freq);
      let sum = 0;
      for (let i = 1; i < 9; i++) sum += this.freq[i];
      this.bass = Math.max(sum / 8 / 255, this.bass * 0.9);
    }
    const pinTo = (id, pos) => { const q = this.p[id]; q.x = pos.x; q.y = pos.y; };
    for (let it = 0; it < ITERATIONS; it++) {
      for (const l of this.links) {
        const a = this.p[l.a], b = this.p[l.b];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6;
        const wa = this.pins.has(l.a) || this.drag?.id === l.a ? 0 : a.w, wb = this.pins.has(l.b) || this.drag?.id === l.b ? 0 : b.w;
        if (!wa && !wb) continue;
        const f = (d - l.len) / d * l.k / (wa + wb);
        a.x += dx * f * wa; a.y += dy * f * wa; b.x -= dx * f * wb; b.y -= dy * f * wb;
      }
      for (const [id, at] of this.pins) pinTo(id, at());
      if (this.drag) pinTo(this.drag.id, this.drag);
    }
    const m = 6;                                                    // keep it on the table
    for (const [i, q] of this.p.entries()) {
      if (this.pins.has(i)) continue;
      q.x = Math.min(innerWidth - m, Math.max(m, q.x));
      if (!this.dock.includes(i)) q.y = Math.min(innerHeight - m, Math.max(m, q.y));
    }
  }

  tick() {
    if (!this.running) return;
    this.step();
    this.draw();
    requestAnimationFrame(this.tick);
  }

  // ---- drawing ----

  path(ids) {
    const g = this.g, P = ids.map(i => this.p[i]);
    g.beginPath();
    g.moveTo(P[0].x, P[0].y);
    for (let i = 1; i < P.length - 1; i++) g.quadraticCurveTo(P[i].x, P[i].y, (P[i].x + P[i + 1].x) / 2, (P[i].y + P[i + 1].y) / 2);
    g.lineTo(P.at(-1).x, P.at(-1).y);
  }

  // Points along the same curve as path(), close together, to lay the cable's photo along.
  curve(ids) {
    const P = ids.map(i => this.p[i]), out = [{ x: P[0].x, y: P[0].y }];
    let sx = P[0].x, sy = P[0].y;
    for (let i = 1; i < P.length - 1; i++) {
      const cx = P[i].x, cy = P[i].y, ex = (P[i].x + P[i + 1].x) / 2, ey = (P[i].y + P[i + 1].y) / 2;
      for (let k = 1; k <= 3; k++) {
        const t = k / 3, m = 1 - t;
        out.push({ x: m * m * sx + 2 * m * t * cx + t * t * ex, y: m * m * sy + 2 * m * t * cy + t * t * ey });
      }
      sx = ex; sy = ey;
    }
    out.push({ x: P.at(-1).x, y: P.at(-1).y });
    return out;
  }

  // A wire: its soft shadow on the table, then the photographed cable laid along it in short slices,
  // each turned to follow the curve.
  wire(ids, w = this.width) {
    const g = this.g, u = this.u, dpr = this.dpr, tex = this.cable;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.save();
    g.shadowColor = CABLE.shadow; g.shadowBlur = 3 * u; g.shadowOffsetY = 1.3 * u; g.shadowOffsetX = 0.5 * u;
    this.path(ids); g.strokeStyle = CABLE.edge; g.lineWidth = w * 0.92; g.stroke();
    g.restore();
    if (!tex.complete || !tex.naturalWidth) {
      this.path(ids); g.strokeStyle = CABLE.core; g.lineWidth = w - 0.7; g.stroke();
      return;
    }
    const pts = this.curve(ids), tw = tex.naturalWidth, th = tex.naturalHeight, h = w / CABLE.body, k = th / h;
    let sx = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      if (len < 0.05) continue;
      const c = dx / len, s = dy / len, sw = Math.max(1, len * k);
      if (sx + sw > tw) sx = 0;                       // the photo repeats seamlessly
      g.setTransform(dpr * c, dpr * s, -dpr * s, dpr * c, dpr * a.x, dpr * a.y);
      g.drawImage(tex, sx, 0, sw, th, -0.4, -h / 2, len + 0.8, h);
      sx += sw;
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // A rounded plastic piece of length `len` and width `wid`, centred on (x, y), along `ang`, in the
  // warm off-white of the photo (the little Y where the cable splits).
  piece(x, y, ang, len, wid, shade = '#d3cec4') {
    const g = this.g;
    g.save();
    g.translate(x, y); g.rotate(ang);
    g.shadowColor = CABLE.shadow; g.shadowBlur = 3 * this.u; g.shadowOffsetY = 1.4 * this.u;
    const grad = g.createLinearGradient(0, -wid / 2, 0, wid / 2);
    grad.addColorStop(0, '#fbfaf7'); grad.addColorStop(0.55, '#efede7'); grad.addColorStop(1, shade);
    g.fillStyle = grad;
    g.beginPath(); g.roundRect(-len / 2, -wid / 2, len, wid, wid / 2); g.fill();
    g.shadowColor = 'transparent';
    g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 0.8; g.stroke();
    g.restore();
  }

  angleAt(ids, k) {
    const a = this.p[ids[Math.max(0, k - 1)]], b = this.p[ids[Math.min(ids.length - 1, k + 1)]];
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  // A photographed piece (`k` in PIECES) with the point (ax, ay) of its image, in fractions, at
  // (x, y), turned by `ang`; `flip` -1 mirrors it across its length. It casts a short shadow on the
  // table (canvas shadow offsets ignore the rotation, so the light stays put).
  sprite(k, x, y, ang, ax, ay, flip = 1) {
    const img = this.img[k];
    if (!img.complete || !img.naturalWidth) return;
    const g = this.g, u = this.u, { w, h } = this.size(k, u);
    g.save();
    g.translate(x, y); g.rotate(ang); g.scale(1, flip);
    g.shadowColor = 'rgba(60,45,25,.3)'; g.shadowBlur = 2.4 * u; g.shadowOffsetX = 0.5 * u; g.shadowOffsetY = 1.2 * u;
    g.drawImage(img, -ax * w, -ay * h, w, h);
    g.restore();
  }

  // An EarPod at the end of its cable, pointing away from it. `side` mirrors it so the two buds curve
  // to opposite sides. On a loud bass it trembles a little, by about a pixel: only as drawn, so the
  // cable keeps its shape.
  bud(ids, k, side, n) {
    const end = this.p[ids.at(-1)], prev = this.p[ids.at(-3)], [ax, ay] = PIECES[k].attach;
    const amp = Math.max(0, this.bass - 0.6) / 0.4 * 0.25 * this.u, t = performance.now() / 1000;
    const x = end.x + Math.sin(t * 41 + n * 2) * amp, y = end.y + Math.cos(t * 37 + n) * amp * 0.6;
    this.sprite(k, x, y, Math.atan2(end.y - prev.y, end.x - prev.x), ax, ay, side);
  }

  draw() {
    const g = this.g, u = this.u, a = this.anchors();
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, innerHeight);

    // The 30-pin connector in the dock port, and its thicker cable.
    this.wire(this.dock, 2.9 * u);
    this.sprite('connector', a.con.x, a.con.y, 0, 0.5, 0);

    // The EarPods: the plug standing in the jack, the split, the remote on the right cable, the buds.
    this.wire(this.main);
    this.wire(this.left);
    this.wire(this.right);
    this.sprite('plug', a.plug.x, a.plug.y, 0, 0.5, 1);
    this.piece(this.p[this.main.at(-1)].x, this.p[this.main.at(-1)].y, this.angleAt(this.main, this.main.length - 1), 5 * u, 2.6 * u);
    const ri = this.right.indexOf(this.remote), from = this.p[this.right[ri - REMOTE_SPAN]], to = this.p[this.right[ri + REMOTE_SPAN]];
    this.sprite('remote', (from.x + to.x) / 2, (from.y + to.y) / 2, Math.atan2(to.y - from.y, to.x - from.x), 0.5, 0.5);
    this.bud(this.left, 'budB', this.sides[0], 0);
    this.bud(this.right, 'budA', this.sides[1], 1);     // the one with the R on it
  }
}
