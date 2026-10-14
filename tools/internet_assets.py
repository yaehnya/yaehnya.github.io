# Builds the intro's textures that come from freely licensed photos on Wikimedia Commons (the files
# are in tools/fuentes/, their authors and licences in tools/fuentes/CREDITOS.md):
#   cristal.webp              the glass of a real iPhone 4 with its screen off: the reflections, smudges
#                             and dust on it, on black, to lay over the screen with `mix-blend-mode: screen`
#   earpod-a.webp, earpod-b.webp
#                             two real EarPods, one showing its speaker mesh, one its back
#   control.webp              the remote with its + and -
#   plug.webp                 the white body of the headphone plug (the metal tip is inside the phone)
#   conector.webp             the top of a 30-pin dock connector and its strain relief
#   cable.webp                a straight piece of the EarPods' cable, repeating along its length
# Every sprite is laid out the way src/scripts/earphones.js draws it, and the script prints the
# numbers it needs (sizes and attachment points).
#
#   python tools/internet_assets.py tools/fuentes public/fotos
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

SRC, OUT = sys.argv[1], sys.argv[2]
info = {}

def homography(frm, to):
    rows, rhs = [], []
    for (x, y), (u, v) in zip(frm, to):
        rows.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); rhs.append(u)
        rows.append([0, 0, 0, x, y, 1, -v * x, -v * y]); rhs.append(v)
    return tuple(np.linalg.solve(np.array(rows), np.array(rhs)))

def cutout(gray, seed, thresh, keep=None, erode=1, feather=1.1):
    """Alpha for the bright object on a dark ground that contains `seed`: everything brighter than
    `thresh` that is connected to it (inside the polygon `keep`, which cuts it off from cables that
    touch it), with its holes filled (the dark speaker mesh, the vents) and its edge feathered."""
    m = Image.fromarray(((np.asarray(gray.filter(ImageFilter.GaussianBlur(1.2))) > thresh) * 255).astype(np.uint8))
    if keep:
        k = Image.new('L', m.size, 0); ImageDraw.Draw(k).polygon(keep, fill=255)
        m = Image.fromarray(np.minimum(np.asarray(m), np.asarray(k)))
    m = m.copy()                                                 # fromarray images are read-only
    ImageDraw.floodfill(m, seed, 128)
    comp = np.asarray(m) == 128
    outside = Image.fromarray((~comp * 255).astype(np.uint8)).copy()
    ImageDraw.floodfill(outside, (0, 0), 128)                    # the ground, reached from a corner
    solid = Image.fromarray(((np.asarray(outside) != 128) * 255).astype(np.uint8))
    for _ in range(erode): solid = solid.filter(ImageFilter.MinFilter(3))
    return solid.filter(ImageFilter.GaussianBlur(feather))

# The EarPods photo is black and white; the sprites get the warm white of the reference photo's
# plastic, so they sit with the phone and the cables.
WARM = np.array([1.0, 0.982, 0.948])
def warm(gray, lift=1.0):
    g = np.asarray(gray).astype(np.float32)[..., None]
    return np.clip(g * WARM * lift, 0, 255).astype(np.uint8)

# ---------- the glass: the screen area of a black iPhone 4, straightened ----------
glass = Image.open(f'{SRC}/iphone4-cristal.jpg').convert('RGB')
front = np.array([(475, 230), (1597, 251), (1551, 2506), (432, 2485)], float)    # edges of its front glass
def on_front(u, v):
    top = front[0] * (1 - u) + front[1] * u; bottom = front[3] * (1 - u) + front[2] * u
    return top * (1 - v) + bottom * v
# The display's place on the front of an iPhone 4 (49.3 x 74 mm on 58.6 x 115.2 mm).
screen = [on_front(.0794, .179), on_front(.9206, .179), on_front(.9206, .821), on_front(.0794, .821)]
GW, GH = 640, 960
g = glass.transform((GW, GH), Image.PERSPECTIVE, homography([(0, 0), (GW, 0), (GW, GH), (0, GH)], screen), Image.BICUBIC)
L = np.asarray(g.convert('L').filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32)
refl = np.clip((L - np.percentile(L, 1)) * 5.5, 0, 255)          # what the glass reflects, on black
Image.fromarray(refl.astype(np.uint8)).convert('RGB').save(f'{OUT}/cristal.webp', quality=78, method=6)

# ---------- the EarPods ----------
ep = Image.open(f'{SRC}/earpods.jpg').convert('L')

def part(center, angle, half, keep, seed, thresh, mirror=False):
    """Turn a square of the photo around `center` by `angle` degrees so the piece lies along x, and
    cut it out inside the rectangle `keep` (in the turned square), so the cuts are straight across the
    cable. Returns the sprite and the offset of its top-left corner in the turned square."""
    cx, cy = center
    sq = ep.crop((cx - half, cy - half, cx + half, cy + half)).rotate(angle, resample=Image.BICUBIC)
    x0, y0, x1, y1 = keep
    alpha = cutout(sq, seed, thresh, keep=[(x0, y0), (x1, y0), (x1, y1), (x0, y1)])
    rgba = Image.fromarray(warm(sq, 1.04)).convert('RGBA')
    rgba.putalpha(alpha)
    box = alpha.point(lambda v: 255 if v > 8 else 0).getbbox()
    rgba = rgba.crop(box)
    if mirror: rgba = ImageOps.mirror(rgba)
    return rgba, box

def save(name, rgba, width, attach=None, box=None, mirror=False):
    """Save at `width` px and record the size, and where the cable meets it (given in the turned
    square's coordinates) as fractions of the sprite."""
    k = width / rgba.width
    im = rgba.resize((width, round(rgba.height * k)), Image.LANCZOS)
    im.save(f'{OUT}/{name}.webp', quality=90, method=6)
    info[name] = {'size': list(im.size)}
    if attach:
        ax, ay = attach[0] - box[0], attach[1] - box[1]
        if mirror: ax = (box[2] - box[0]) - ax
        info[name]['attach'] = [round(ax / rgba.width, 4), round(ay / rgba.height, 4)]

# A: lying with its speaker mesh up. Turned so its stem points left (the cable leaves from the left
# end of the strain relief) and its head is on the right, curving down.
a, box = part((390, 1910), -120.8, 260, (58, 150, 475, 345), (385, 300), 92)
save('earpod-a', a, 420, attach=(58, 262), box=box)

# B: lying on its back with its head to the left: mirrored so it lies like A.
b, box = part((715, 2395), 0, 245, (0, 120, 455, 365), (130, 250), 92, mirror=True)
save('earpod-b', b, 420, attach=(455, 205), box=box, mirror=True)

# The remote, along x; a stub of cable at each end.
r, box = part((810, 1470), 29, 240, (38, 219, 436, 279), (240, 250), 100)
save('control', r, 300)

# The plug's white body standing up, its strain relief on top: the metal tip is inside the phone.
p, box = part((1660, 960), 122, 180, (146, 0, 205, 203), (175, 150), 100)
save('plug', p, 80)

# The cable: a straight run of it in the same photo, straightened (its centre line drifts down 9 px
# over 260), cut out with alpha, and made to repeat along its length by blending its two ends. The
# script draws it slice by slice along each wire.
L = np.asarray(ep).astype(np.float32)
X0, X1, HALF = 850, 1110, 13
rows = []
for x in range(X0, X1):
    centre = 2078.2 + (x - X0) * (2087.3 - 2078.2) / (X1 - X0) + 0.5
    ys = centre + np.arange(-HALF, HALF + 1)
    lo = np.floor(ys).astype(int); f = ys - lo
    rows.append(L[lo, x] * (1 - f) + L[lo + 1, x] * f)
strip = np.array(rows).T                                   # (27, 260): across the cable, along it
FADE = 40
ends = np.linspace(0, 1, FADE)[None, :]
strip = np.concatenate([strip[:, FADE:-FADE], strip[:, -FADE:] * (1 - ends) + strip[:, :FADE] * ends], axis=1)
alpha = np.clip((strip - 70) / 55, 0, 1)
rgb = np.clip(strip[..., None] * WARM * 1.04, 0, 255)
# Where the cable is see-through at its edges, keep its colour from fading to the black of the photo.
rgb = np.where(alpha[..., None] > 0, np.maximum(rgb, 150), rgb)
cable = np.dstack([rgb, alpha * 255]).astype(np.uint8)
Image.fromarray(cable, 'RGBA').save(f'{OUT}/cable.webp', quality=92, method=6)
body = (alpha > 0.5).any(1)
info['cable'] = {'size': [cable.shape[1], cable.shape[0]], 'body': round(int(body.sum()) / cable.shape[0], 3)}

# ---------- the 30-pin connector ----------
# The photo shows it at an angle with its left end out of frame. Turned so its front edge is level,
# the top face from its centre (the middle of the little rounded mark) to its right end is mirrored
# to make the whole face; below it, the start of the strain relief.
dc = Image.open(f'{SRC}/conector-30-pines.jpg').convert('RGB')
CX, CY = 3080, 1960                                    # the face's right front corner
rot = dc.rotate(38.3, resample=Image.BICUBIC, center=(CX, CY))
ox, oy = CX - 2600, CY - 900                           # origin of the 4x preview the numbers come from
face_half = rot.crop((ox + 97 * 4, oy + 224 * 4, ox + 658 * 4, oy + 612 * 4))
face = Image.new('RGB', (face_half.width * 2, face_half.height))
face.paste(ImageOps.mirror(face_half), (0, 0)); face.paste(face_half, (face_half.width, 0))
relief = rot.crop((ox + 27 * 4, oy + 606 * 4, ox + 210 * 4, oy + 690 * 4))
FW = 480
k = FW / face.width
face = face.resize((FW, round(face.height * k)), Image.LANCZOS)
relief = relief.resize((round(relief.width * k), round(relief.height * k)), Image.LANCZOS)
def rounded(w, h, r, top=True):
    m = Image.new('L', (w * 4, h * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle([2, -r * 8 if not top else 2, w * 4 - 2, h * 4 - 2], radius=r * 4, fill=255)
    return m.resize((w, h), Image.LANCZOS)
f = face.convert('RGBA'); f.putalpha(rounded(FW, face.height, 9))
rl = relief.convert('RGBA'); rl.putalpha(rounded(relief.width, relief.height, 4, top=False))
con = Image.new('RGBA', (FW, face.height + relief.height - 3), (0, 0, 0, 0))
con.alpha_composite(rl, ((FW - relief.width) // 2, face.height - 3))
con.alpha_composite(f, (0, 0))
# White balance: the photo's plastic is cool; give it the EarPods' warm white.
arr = np.asarray(con).astype(np.float32)
ref = arr[..., :3][arr[..., 3] > 250].reshape(-1, 3)
arr[..., :3] = np.clip(arr[..., :3] * (np.array([243, 240, 232], np.float32) / np.percentile(ref, 75, axis=0)), 0, 255)
con = Image.fromarray(arr.astype(np.uint8))
con.save(f'{OUT}/conector.webp', quality=90, method=6)
info['conector'] = {'size': list(con.size), 'face': round(face.height / con.height, 4), 'relief': round(relief.width / FW, 4)}

print(json.dumps(info))
