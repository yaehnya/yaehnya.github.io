// Smaller copies of the big pictures (made next to them, e.g. amor-como-estas-320.webp), so a phone
// downloads the size it shows rather than the full one: srcset(src) lists them for <img srcset>.
// To add a picture: save its copies at these widths next to it and list it here.
const widths: Record<string, number[]> = {
  '/fotos/portadas/amor-como-estas.webp': [320, 640, 1000],
  '/fotos/portadas/lo-mejor-siempre-se-demora.webp': [320, 640, 1000],
  '/fotos/fechas.webp': [480, 825],
  '/fotos/iphone.webp': [500, 750, 1000, 1494],
};

export function srcset(src: string) {
  const ws = widths[src];
  if (!ws) return undefined;
  const full = ws[ws.length - 1];
  return ws.map(w => `${w === full ? src : src.replace(/\.webp$/, `-${w}.webp`)} ${w}w`).join(', ');
}

/** The copy closest to `w` pixels wide (for places that take a single src, like the wallpaper). */
export function sized(src: string, w: number) {
  const ws = widths[src];
  if (!ws) return src;
  const pick = ws.find(x => x >= w) ?? ws[ws.length - 1];
  return pick === ws[ws.length - 1] ? src : src.replace(/\.webp$/, `-${pick}.webp`);
}
