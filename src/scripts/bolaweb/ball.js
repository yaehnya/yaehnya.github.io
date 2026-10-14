// The ball: a liquid-glass sphere with a real 3D orientation (a quaternion, rolling without slipping),
// and everything it has rolled up stuck to the surface as stickers.
//
// It is drawn in three layers. drawBack (a canvas under the glass): the shadow and the stickers on
// the far side, seen faintly through the glass. The glass itself is a DOM element with a
// backdrop-filter that refracts the page (game.js places it). drawFront (a canvas over the glass):
// the stickers facing us and the highlights.
//
// Coordinates: x right, y down the page, z toward the viewer.

const MAX_STICKERS = 500;

const mul = (a, b) => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
];

// Rotate v by the unit quaternion q.
function rotate(q, v) {
  const [w, x, y, z] = q, [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx);
  return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)];
}

const conj = q => [q[0], -q[1], -q[2], -q[3]];

// A small canvas that looks like the item, drawn once when it is rolled up.
function snapshot(item) {
  const { kind, el, w, h } = item;
  const k = Math.min(2, 160 / Math.max(w, h));
  const cv = Object.assign(document.createElement('canvas'), { width: Math.max(1, Math.ceil(w * k)), height: Math.max(1, Math.ceil(h * k)) });
  const g = cv.getContext('2d');
  g.scale(k, k);
  const cs = getComputedStyle(el);
  if (kind === 'text') {
    g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    g.fillStyle = cs.color;
    g.textBaseline = 'middle';
    g.fillText(el.textContent, 0, h / 2, w);
    return cv;
  }
  if (item.crop) {                                           // an image, or a tile of one
    try {
      g.filter = item.filter || 'none';
      g.drawImage(el, ...item.crop, 0, 0, w, h);
      return cv;
    } catch { /* fall through to a plain box */ }
  }
  if (kind === 'tile') { g.fillStyle = '#cfcfcf'; g.fillRect(0, 0, w, h); return cv; }
  const bg = cs.backgroundColor;
  g.fillStyle = bg && !/rgba\([^)]*,\s*0\)$/.test(bg) && bg !== 'transparent' ? bg : (kind === 'img' ? cs.color : '#d8d8d8');
  g.fillRect(0, 0, w, h);
  return cv;
}

// One sticker at its place on the sphere, squashed along the radius by how far it has turned away.
function drawSticker(g, s, p, R, zoom, mirror) {
  const w = s.w * zoom, h = s.h * zoom;
  if (Math.max(w, h) < 1.5) return;
  const ang = Math.atan2(p[1], p[0]);
  g.save();
  g.translate(p[0] * R, p[1] * R);
  g.rotate(ang);
  g.scale(Math.max(Math.abs(p[2]), 0.12), 1);
  g.rotate(-ang);
  if (mirror) g.scale(-1, 1);                                // seen from inside, through the glass
  g.drawImage(s.cv, -w / 2, -h / 2, w, h);
  g.restore();
}

export class Ball {
  constructor() {
    this.q = [1, 0, 0, 0];
    this.stickers = [];
    this.pulse = 0;
  }

  // Roll over (dx, dy) page pixels on a ball of radius r.
  roll(dx, dy, r) {
    const d = Math.hypot(dx, dy);
    if (d < 1e-6) return;
    const half = d / r / 2, s = Math.sin(half) / d;
    this.q = mul([Math.cos(half), -dy * s, dx * s, 0], this.q);
    const n = Math.hypot(...this.q);
    this.q = this.q.map(c => c / n);
  }

  // Stick an item on the side of the ball it touched. `dx, dy`: from the ball's centre towards the item.
  stick(item, dx, dy) {
    const d = Math.hypot(dx, dy) || 1, n = Math.hypot(0.8, 0.6);
    const world = [dx / d * 0.8 / n, dy / d * 0.8 / n, 0.6 / n];
    this.stickers.push({ v: rotate(conj(this.q), world), w: item.w, h: item.h, cv: snapshot(item) });
    if (this.stickers.length > MAX_STICKERS) this.stickers.shift();
    this.pulse = Math.min(1, this.pulse + 0.35);
  }

  // A little swell after each pickup. Call once per frame; returns the radius to draw at.
  radius(R, dt) {
    this.pulse = Math.max(0, this.pulse - dt * 4);
    return R * (1 + this.pulse * 0.06);
  }

  // Where every sticker is right now, split into the far side and the near side, back to front.
  placed() {
    const far = [], near = [];
    for (const s of this.stickers) {
      const p = rotate(this.q, s.v);
      if (p[2] < -0.03) far.push({ s, p }); else if (p[2] > 0.03) near.push({ s, p });
    }
    far.sort((a, b) => b.p[2] - a.p[2]);
    near.sort((a, b) => a.p[2] - b.p[2]);
    return { far, near };
  }

  drawBack(g, cx, cy, R, zoom) {
    this.layers = this.placed();
    g.save();
    g.translate(cx, cy);

    // Shadow on the page, with the bright spot a glass ball focuses into it.
    g.save();
    g.translate(R * 0.12, R * 0.92);
    g.scale(1, 0.3);
    const shadow = g.createRadialGradient(0, 0, 0, 0, 0, R * 1.05);
    shadow.addColorStop(0, 'rgba(0,0,0,.2)');
    shadow.addColorStop(0.6, 'rgba(0,0,0,.1)');
    shadow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = shadow;
    g.beginPath(); g.arc(0, 0, R * 1.05, 0, 7); g.fill();
    const caustic = g.createRadialGradient(R * 0.1, -R * 0.1, 0, R * 0.1, -R * 0.1, R * 0.4);
    caustic.addColorStop(0, 'rgba(255,255,255,.75)');
    caustic.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = caustic;
    g.beginPath(); g.arc(R * 0.1, -R * 0.1, R * 0.4, 0, 7); g.fill();
    g.restore();

    g.globalAlpha = 0.32;
    for (const { s, p } of this.layers.far) drawSticker(g, s, p, R, zoom, true);
    g.restore();
  }

  drawFront(g, cx, cy, R, zoom) {
    g.save();
    g.translate(cx, cy);

    // The glass body: clear in the middle, denser toward the edge (Fresnel), so it reads on white.
    const body = g.createRadialGradient(0, 0, R * 0.55, 0, 0, R);
    body.addColorStop(0, 'rgba(255,255,255,0)');
    body.addColorStop(0.75, 'rgba(120,135,160,.07)');
    body.addColorStop(1, 'rgba(70,85,110,.26)');
    g.fillStyle = body;
    g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill();

    for (const { s, p } of this.layers?.near ?? []) drawSticker(g, s, p, R, zoom, false);

    // Rim light along the top left, a softer one bottom right, and a hairline edge.
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,255,255,.95)';
    g.lineWidth = Math.max(1.5, R * 0.035);
    g.beginPath(); g.arc(0, 0, R * 0.965, Math.PI * 1.05, Math.PI * 1.55); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.55)';
    g.lineWidth = Math.max(1, R * 0.025);
    g.beginPath(); g.arc(0, 0, R * 0.96, Math.PI * 0.1, Math.PI * 0.55); g.stroke();
    g.strokeStyle = 'rgba(30,40,60,.22)';
    g.lineWidth = 1;
    g.beginPath(); g.arc(0, 0, R, 0, 7); g.stroke();

    // Specular highlight.
    g.save();
    g.translate(-R * 0.38, -R * 0.46);
    g.rotate(-0.6);
    g.scale(1, 0.55);
    const spec = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.3);
    spec.addColorStop(0, 'rgba(255,255,255,.95)');
    spec.addColorStop(0.5, 'rgba(255,255,255,.45)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = spec;
    g.beginPath(); g.arc(0, 0, R * 0.3, 0, 7); g.fill();
    g.restore();

    g.restore();
  }
}
