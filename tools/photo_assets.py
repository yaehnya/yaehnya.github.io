# Builds the phone of the intro from the reference photo (620 x 827): iphone.webp, the phone in its
# beige case, straightened, cables removed, screen area black, with alpha. (The EarPods, the plug, the
# dock connector and the glass come from other photos: see internet_assets.py.)
# Cables cover much of the phone, so the clean parts are reused: the top band (earpiece, camera) with
# its top-left corner mirrored into the top-right, a clean stretch of the left side repeated along it
# and mirrored for the right, the top band flipped for the bottom (the iPhone 4 screen is centred), and a home button drawn
# from the photo's own colours. Everything gets the same white balance so it sits on a white page.
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC, OUT = sys.argv[1], sys.argv[2]
photo = Image.open(SRC).convert('RGB')

# ---------- straighten the phone (see rectify.py): screen corners -> 402 x 602 at 2x ----------
S = 2
src = np.array([(200, 261.5), (401, 261.5), (404, 562.5), (203, 562.5)], float)
W, H, MX, TOP, BOTTOM = 201 * S, 301 * S, 30 * S, 90 * S, 140 * S
dst = np.array([(MX, TOP), (MX + W, TOP), (MX + W, TOP + H), (MX, TOP + H)], float)

def homography(frm, to):
    rows, rhs = [], []
    for (x, y), (u, v) in zip(frm, to):
        rows.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); rhs.append(u)
        rows.append([0, 0, 0, x, y, 1, -v * x, -v * y]); rhs.append(v)
    return tuple(np.linalg.solve(np.array(rows), np.array(rhs)))

size = (W + 2 * MX, TOP + H + BOTTOM)                    # 522 x 1062
R = np.asarray(photo.transform(size, Image.PERSPECTIVE, homography(dst, src), Image.BICUBIC)).astype(np.float32)
O = R.copy()
CX = size[0] / 2                                          # the screen's centre line, x = 261
SCREEN = (MX, TOP, MX + W, TOP + H)                       # (60, 180, 462, 782)
CASE = (12, 18, size[0] - 12, 2 * TOP + H - 18)           # outer edge of the case: (12, 18, 510, 944)

def pingpong(n, period):
    n %= 2 * period
    return n if n < period else 2 * period - 1 - n

# Top band: mirror the clean top-left corner into the top-right, where a cable crosses, fading it in
# over a few pixels so there is no seam.
mirror = O[0:TOP, 0:100][:, ::-1]
ramp = np.clip((np.arange(size[0] - 100, size[0]) - (size[0] - 100)) / 22, 0, 1)[None, :, None]
O[0:TOP, size[0] - 100:] = O[0:TOP, size[0] - 100:] * (1 - ramp) + mirror * ramp

# Sides: the left side between two cables (rows 200-590), repeated back and forth along the screen's
# height. It starts above the screen, where the corner has straightened out, so the cable that
# crosses the case there goes too, and fades in so there is no seam. The right side, in shadow and
# crossed by cables in the photo, is the left one's mirror image, as the top-right corner is.
for y in range(120, TOP + H):
    side = R[200 + pingpong(y - 120, 390), 0:MX]
    k = min(1, (y - 120) / 20)
    O[y, 0:40] = O[y, 0:40] * (1 - k) + side[:40] * k
    if y >= TOP: O[y, 40:MX] = side[40:]
# The glass right next to the screen reflects the photo's app and reads grey; give it the white bezel
# of the top band, same columns.
for y in range(TOP, TOP + H):
    O[y, 40:MX - 7] = O[100 + pingpong(y - TOP, 70), 40:MX - 7]
O[120:TOP + H, MX + W:] = O[120:TOP + H, 0:MX][:, ::-1]

# Bottom band: the top band flipped, without the earpiece and camera.
band = CASE[3] - (TOP + H)                                 # 162 rows
for k in range(band + 1):
    O[TOP + H + k] = O[TOP - k]
eye = slice(TOP + H + (TOP - 124), TOP + H + (TOP - 88))   # where the flipped earpiece and camera land
fade = np.minimum(np.arange(160), np.arange(160)[::-1])[None, :, None]
fade = np.clip(fade / 18, 0, 1)                              # feathered at both ends: no seam
O[eye, 140:300] = O[eye, 140:300] * (1 - fade) + O[eye, 300:460] * fade
O[eye, 165:280] = O[eye, 325:440]                            # the middle, where the earpiece and camera were, fully replaced

# Home button, in the photo's colours: a shallow dish with a thin rim and the rounded square.
bezel = O[TOP + H + 40:TOP + H + 60, 330:400].reshape(-1, 3).mean(0)
hx, hy, hr = CX, TOP + H + band / 2 + 1, 45
K = 4                                                       # supersample
hb = Image.new('RGBA', (int(hr * 2.6 * K), int(hr * 2.6 * K)), (0, 0, 0, 0))
d = ImageDraw.Draw(hb)
c = hb.width / 2
def shade(f, a=255):
    return tuple(int(min(255, max(0, v * f))) for v in bezel) + (a,)
for i in range(60):                                          # a shallow dish, a touch darker than the bezel
    t = i / 59
    r = (hr - t * hr * 0.92) * K
    oy = t * 2.5 * K                                         # its lit floor sits a little low
    d.ellipse([c - r, c - r + oy, c + r, c + r + oy], fill=shade(0.86 + 0.08 * t))
d.ellipse([c - hr * K, c - hr * K, c + hr * K, c + hr * K], outline=shade(0.66), width=int(1.6 * K))
d.arc([c - (hr - 2.2) * K, c - (hr - 2.2) * K, c + (hr - 2.2) * K, c + (hr - 2.2) * K], 195, 345, fill=shade(0.74, 210), width=int(3 * K))
d.arc([c - (hr - 1.8) * K, c - (hr - 1.8) * K, c + (hr - 1.8) * K, c + (hr - 1.8) * K], 25, 155, fill=shade(1.06, 200), width=int(2 * K))
q = 11 * K
d.rounded_rectangle([c - q, c - q, c + q, c + q], radius=3.2 * K, outline=shade(0.58), width=int(1.5 * K))
hb = hb.resize((hb.width // K, hb.height // K), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.5))
base = Image.fromarray(O.clip(0, 255).astype(np.uint8))
base.alpha_composite if False else None
base = base.convert('RGBA')
base.alpha_composite(hb, (int(hx - hb.width / 2), int(hy - hb.height / 2)))
O = np.asarray(base.convert('RGB')).astype(np.float32)

# Grain over the redrawn parts so they match the photo's noise.
rng = np.random.default_rng(3)
grain = rng.normal(0, 3.2, O.shape[:2])[..., None]
redrawn = np.zeros(O.shape[:2], bool)
redrawn[TOP + H:, :] = True
redrawn[TOP:TOP + H, :MX] = True
redrawn[TOP:TOP + H, MX + W:] = True
O[redrawn] += grain[redrawn]

# The screen area is replaced by the live app; leave it black, with the thin black frame the white
# iPhone 4 has around its display (it also hides the photo's own screen at the edges).
O[SCREEN[1] - 5:SCREEN[3] + 5, SCREEN[0] - 7:SCREEN[2] + 7] = 18

# ---------- white balance: the bezel's colour -> near white, applied to everything ----------
ref = R[120:170, 320:440].reshape(-1, 3).mean(0)
target = np.array([238, 236, 229], np.float32)
gain = target / ref
def balance(a):
    a = a * gain
    return (255 * (np.clip(a, 0, 255) / 255) ** 0.96).clip(0, 255)

# ---------- cut the phone out: the case outline, a rounded rectangle ----------
def rounded_mask(w, h, box, radius, k=4):
    m = Image.new('L', (w * k, h * k), 0)
    ImageDraw.Draw(m).rounded_rectangle([v * k for v in box], radius=radius * k, fill=255)
    return m.resize((w, h), Image.LANCZOS)

ph = Image.fromarray(balance(O).astype(np.uint8)).convert('RGBA')
ph.putalpha(rounded_mask(size[0], size[1], (CASE[0] + 1.5, CASE[1] + 1.5, CASE[2] - 1.5, CASE[3] - 1.5), 72))
ph = ph.crop(CASE)
ph.save(f'{OUT}/iphone.webp', quality=92, method=6)

cw, ch = CASE[2] - CASE[0], CASE[3] - CASE[1]
info = {
    'size': [cw, ch],
    'screen': [round((SCREEN[0] - CASE[0]) / cw * 100, 3), round((SCREEN[1] - CASE[1]) / ch * 100, 3),
               round(W / cw * 100, 3), round(H / ch * 100, 3)],
}

# Colours to draw the cables in, sampled from a cable in the photo and balanced the same way.
cable = np.asarray(photo.crop((203, 60, 225, 70))).reshape(-1, 3).astype(np.float32)
light = balance(np.percentile(cable, 85, axis=0)[None])[0]
dark = balance(np.percentile(cable, 10, axis=0)[None])[0]
info['cable'] = {'light': '#%02x%02x%02x' % tuple(int(v) for v in light), 'dark': '#%02x%02x%02x' % tuple(int(v) for v in dark)}
print(json.dumps(info))
