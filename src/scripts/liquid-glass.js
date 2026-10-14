// The game ball's glass: what is behind it is blurred a touch, saturated, and bent at the rim like
// thick glass. (The rest of the site's glass is liquid-glass-react, see components/Glass.tsx; the ball
// is drawn by the game every frame, so it keeps this.) The bending is an SVG displacement filter used as a backdrop-filter, which only
// Chromium renders; everywhere else the CSS fallback (frosted glass) stays.

const NS = 'http://www.w3.org/2000/svg';
const MAP_SIZE = 128;
const BEND = 0.32;             // how far the rim reaches outside the shape, as a share of its size

const chromium = typeof navigator !== 'undefined' && !!navigator.userAgentData?.brands?.some(b => /Chromium/i.test(b.brand));
let defs = null, mapUrl = null;
const made = new Map();

// A lens as a displacement map: red/green push each pixel outward, nothing in the middle and the most
// at the edge, so the rim shows what lies just beyond it.
function lensMap() {
  const n = MAP_SIZE, cv = Object.assign(document.createElement('canvas'), { width: n, height: n });
  const g = cv.getContext('2d'), img = g.createImageData(n, n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const u = (x + 0.5) / n * 2 - 1, v = (y + 0.5) / n * 2 - 1, r = Math.hypot(u, v);
      const f = r < 1 ? r ** 3 : 0;
      const i = (y * n + x) * 4;
      img.data[i] = 128 + (r ? u / r : 0) * f * 127;
      img.data[i + 1] = 128 + (r ? v / r : 0) * f * 127;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return cv.toDataURL();
}

function el(name, attrs, parent) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  parent?.append(node);
  return node;
}

// The backdrop-filter value for a w × h glass shape (one SVG filter per size, kept for reuse).
export function glassFilter(w, h, extra = 'blur(1px) saturate(1.8) brightness(1.06)') {
  if (!chromium || !w || !h) return null;
  w = Math.round(w); h = Math.round(h);
  const key = `${w}x${h}`;
  if (!made.has(key)) {
    if (!defs) {
      const svg = el('svg', { width: 0, height: 0, 'aria-hidden': 'true', style: 'position:absolute;width:0;height:0' });
      defs = el('defs', {}, svg);
      document.body.append(svg);
      mapUrl = lensMap();
    }
    const id = `lg-${key}`;
    const f = el('filter', { id, x: 0, y: 0, width: w, height: h, filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' }, defs);
    el('feImage', { href: mapUrl, x: 0, y: 0, width: w, height: h, preserveAspectRatio: 'none', result: 'map' }, f);
    el('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: Math.min(w, h) * BEND, xChannelSelector: 'R', yChannelSelector: 'G' }, f);
    made.set(key, `url(#${id})`);
  }
  return `${made.get(key)} ${extra}`;
}

