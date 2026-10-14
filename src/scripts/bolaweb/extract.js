// Reads the live page (already laid out) into things the ball can roll up: every character (every
// word on long pages), plus the images, controls and boxes, which are taken whole with everything
// inside. Big images are cut into tiles instead, so the ball can eat a photo bit by bit. Nothing
// re-implements layout; every position is a getBoundingClientRect relative to `root`.

const MEDIA = new Set(['img', 'svg', 'video', 'canvas']);
const CONTROL = new Set(['button', 'input', 'select', 'textarea']);
const NO_TEXT = 'script, style, noscript, template, textarea, select, option, svg, bw-r';
const CHAR_LIMIT = 4000;      // pages with fewer visible characters get one item per character
const MAX_BOX_SHARE = 0.4;    // boxes bigger than this share of the page are backdrop, not items
const TILE_FROM = 160;        // images bigger than this (√area, px) are cut into tiles taken one by one

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// "rgba(r, g, b, a)" and "rgb(r g b / a)" → a; anything we can't parse counts as opaque.
const alpha = c => {
  if (c === 'transparent') return 0;
  const m = /rgba?\(([^)]+)\)/.exec(c);
  if (!m) return 1;
  const p = m[1].split(/[\s,/]+/);
  return p.length >= 4 ? parseFloat(p[3]) : 1;
};

const hasBorder = (cs, side) =>
  parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none' && alpha(cs[`border${side}Color`]) > 0.1;

const isBox = cs =>
  alpha(cs.backgroundColor) > 0.1 || cs.backgroundImage !== 'none' || cs.boxShadow !== 'none' ||
  hasBorder(cs, 'Top') || hasBorder(cs, 'Left');

// Each character (or word) becomes a <bw-t> so it has a box of its own. They are custom elements so
// the page's `span` selectors don't reach them, and each text node's pieces share one inline <bw-r>
// so a flex or grid parent still sees a single item, as it did the bare text. Text already wrapped by
// an earlier game is skipped.
function wrapText(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  for (let n; (n = walker.nextNode());) {
    if (n.nodeValue.trim() && !n.parentElement.closest(NO_TEXT)) nodes.push(n);
  }
  const visible = nodes.reduce((sum, n) => sum + n.nodeValue.replace(/\s/g, '').length, 0);
  const byChar = visible < CHAR_LIMIT;
  for (const node of nodes) {
    const run = document.createElement('bw-r');
    for (const part of node.nodeValue.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { run.append(part); continue; }
      for (const piece of byChar ? Array.from(part) : [part]) {
        const t = document.createElement('bw-t');
        t.textContent = piece;
        run.append(t);
      }
    }
    node.replaceWith(run);
  }
}

// The part of the image (natural px) an <img> shows in its box, so object-fit: cover crops the same way.
function cropOf(img, w, h, fit) {
  const nw = img.naturalWidth, nh = img.naturalHeight;
  if (!nw || !nh) return null;
  if (fit !== 'cover') return [0, 0, nw, nh];
  const k = Math.max(w / nw, h / nh), sw = w / k, sh = h / k;
  return [(nw - sw) / 2, (nh - sh) / 2, sw, sh];
}

// The colour behind an element, to fill the hole a taken tile leaves.
function backdrop(el) {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const c = getComputedStyle(p).backgroundColor;
    if (alpha(c) > 0.5) return c;
  }
  return getComputedStyle(document.documentElement).backgroundColor;
}

// A big image as a grid of tiles of roughly a sixth of its size, each with its own slice of the picture.
function tiles(img, x, y, w, h, s, cs) {
  const size = clamp(s / 6, 32, 120);
  const cols = Math.max(1, Math.round(w / size)), rows = Math.max(1, Math.round(h / size));
  const src = cropOf(img, w, h, cs.objectFit), bg = backdrop(img), out = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x0 = Math.round(x + w * i / cols), x1 = Math.round(x + w * (i + 1) / cols);
      const y0 = Math.round(y + h * j / rows), y1 = Math.round(y + h * (j + 1) / rows);
      const crop = src && [src[0] + src[2] * (x0 - x) / w, src[1] + src[3] * (y0 - y) / h, src[2] * (x1 - x0) / w, src[3] * (y1 - y0) / h];
      out.push({ kind: 'tile', el: img, x: x0, y: y0, w: x1 - x0, h: y1 - y0, s: Math.sqrt((x1 - x0) * (y1 - y0)),
        solid: false, kids: [], gone: false, crop, filter: cs.filter, bg });
    }
  }
  return out;
}

export function extract(root) {
  wrapText(root);
  const base = root.getBoundingClientRect();
  const page = { w: base.width, h: Math.max(base.height, root.scrollHeight) };
  const items = [], byEl = new Map();

  for (const el of root.querySelectorAll('*')) {
    const svg = el.closest('svg');
    if (svg && svg !== el) continue;                         // the parts of an svg are not items

    const r = el.getBoundingClientRect();
    const x = r.left - base.left, y = r.top - base.top, w = r.width, h = r.height;
    if (w < 2 || h < 2 || y > page.h || x > page.w || x + w < 0 || y + h < 0) continue;

    const s = Math.sqrt(w * h);
    let kind, cs = null;
    if (el.localName === 'bw-t') kind = 'text';
    else if (el.localName === 'bw-r') continue;
    else {
      cs = getComputedStyle(el);
      const name = el.localName;
      if (MEDIA.has(name)) kind = 'img';
      else if (CONTROL.has(name) && el.type !== 'hidden') kind = 'ctl';
      else if (isBox(cs)) kind = 'box';
      else continue;
      if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
      if (w < 6 || h < 6) continue;
      if (kind === 'box' && w * h > page.w * page.h * MAX_BOX_SHARE) continue;
    }

    let owner = null;                                          // taken with its nearest enclosing block
    for (let p = el.parentElement; p && p !== root && !owner; p = p.parentElement) owner = byEl.get(p) || null;

    const isImg = el.localName === 'img';
    if (isImg && s > TILE_FROM) {
      for (const t of tiles(el, x, y, w, h, s, cs)) { owner?.kids.push(t); items.push(t); }
      continue;
    }
    const item = { kind, el, x, y, w, h, s, solid: kind === 'img' || kind === 'ctl', kids: [], gone: false };
    if (kind === 'img') Object.assign(item, { crop: isImg ? cropOf(el, w, h, cs.objectFit) : null, filter: cs.filter });
    owner?.kids.push(item);
    if (kind !== 'text') byEl.set(el, item);
    items.push(item);
  }
  return { page, items };
}
