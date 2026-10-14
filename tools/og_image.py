# The picture a shared link shows (WhatsApp, Instagram, X): 1200 x 630, white, the YEYO wordmark
# stretched as on the site, and under it the covers in a small Cover Flow with their reflections.
#
#   python tools/og_image.py public/og/yeyo.jpg
#
# The wordmark is drawn in Arial Bold (the site uses Helvetica Neue, which is not on Windows), packed
# and stretched like the site's: wider, lower, letters almost touching.
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
W, H = 1200, 630
page = Image.new('RGB', (W, H), 'white')

def homography(frm, to):
    rows, rhs = [], []
    for (x, y), (u, v) in zip(frm, to):
        rows.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); rhs.append(u)
        rows.append([0, 0, 0, x, y, 1, -v * x, -v * y]); rhs.append(v)
    return tuple(np.linalg.solve(np.array(rows), np.array(rhs)))

def turned(img, side, squeeze=0.3, lift=0.1):
    """A cover seen turned toward the middle, as on the site: its outer edge comes toward you (taller),
    the edge by the middle goes back (shorter)."""
    w, h = img.size
    nw = int(w * squeeze)
    short = int(h * (1 - lift * 2)); off = (h - short) // 2
    if side > 0:   # on the right: the left edge, by the middle, is the short one
        dst = [(0, off), (nw, 0), (nw, h), (0, off + short)]
    else:
        dst = [(0, 0), (nw, off), (nw, off + short), (0, h)]
    src = [(0, 0), (w, 0), (w, h), (0, h)]
    return img.convert('RGBA').transform((nw, h), Image.PERSPECTIVE, homography(dst, src), Image.BICUBIC)

def reflected(t, fade=0.32):
    """The cover with its reflection under it, fading out, as on the site's floor."""
    t = t.convert('RGBA')
    w, h = t.size
    out = Image.new('RGBA', (w, h * 2 + 4), (255, 255, 255, 0))
    out.alpha_composite(t, (0, 0))
    ref = t.transpose(Image.FLIP_TOP_BOTTOM)
    a = np.asarray(ref.getchannel('A')).astype(np.float32) * np.linspace(fade, 0, h)[:, None]
    ref.putalpha(Image.fromarray(a.astype(np.uint8)))
    out.alpha_composite(ref, (0, h + 4))
    return out

covers = [Image.open(f'public/fotos/portadas/{n}.webp').convert('RGB') for n in ('lo-mejor-siempre-se-demora', 'amor-como-estas')]
S = 270                                   # the cover in the middle
s2 = int(S * .86)
other = covers[1].resize((s2, s2), Image.LANCZOS)
blank = Image.new('RGB', (s2, s2), (226, 226, 226))
cx, top = W // 2, 250

# Turned covers either side (turned first, then reflected, so the reflection turns with them), the
# farthest first so the ones by the middle overlap them; then the one in the middle, facing you.
y = top + (S - s2) // 2
for img, x in [(blank, cx + 300), (blank, cx + 236), (other, cx + 172)]:
    t = reflected(turned(img, 1)); page.paste(t, (x, y), t)
for img, x in [(blank, cx - 300), (blank, cx - 236), (other, cx - 172)]:
    t = reflected(turned(img, -1)); page.paste(t, (x - t.width, y), t)
main = reflected(covers[0].resize((S, S), Image.LANCZOS))
page.paste(main, (cx - S // 2, top), main)

# The wordmark: stretched 1.14 x .84, tracking -0.045 em, centred at the top.
size = 150
font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', size)
letters = 'YEYO'
track = -0.045 * size
widths = [font.getlength(c) for c in letters]
total = sum(widths) + track * (len(letters) - 1)
mark = Image.new('L', (int(total) + 20, size + 40), 0)
d = ImageDraw.Draw(mark)
x = 10
for c, w in zip(letters, widths):
    d.text((x, 0), c, font=font, fill=255)
    x += w + track
mark = mark.crop(mark.getbbox())
mark = mark.resize((int(mark.width * 1.14), int(mark.height * .84)), Image.LANCZOS)
page.paste(Image.new('RGB', mark.size, (11, 11, 11)), ((W - mark.width) // 2, 70), mark)

page.save(OUT, quality=88)
print(OUT, page.size)
