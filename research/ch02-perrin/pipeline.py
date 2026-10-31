"""Full digitisation pipeline for Plate 13.
Outputs per panel: dots, accepted segments, residual-ink audit overlay.
Usage: python3 -I pipeline.py top|bot
"""
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
import json, collections, sys

PANEL = sys.argv[1]
im = np.array(Image.open('p13-8.png').convert('L'))
ink = im < 128

# ---------------- masks ----------------
if PANEL == 'top':
    mask = ink.copy(); mask[2500:, :] = False
else:
    raw = ink.copy(); raw[:2700, :] = False
    # remove the measured grid: blank a +-3.5 px corridor along every lattice line,
    # then drop the small specks the crossings leave behind. Strokes crossing a
    # grid line lose a 7 px sliver, which the walker's gap tolerance bridges.
    gf = json.load(open('grid_fit.json'))
    (vp, vx0, _), (hp, hy0, _) = gf['v'], gf['h']
    mask = raw.copy()
    for k in range(-1, 30):
        x = vx0 + k * vp
        if 900 < x < 3400: mask[:, int(x) - 3: int(x) + 4] = False
    for k in range(-1, 24):
        y = hy0 + k * hp
        if 2700 < y < 4700: mask[int(y) - 3: int(y) + 4, :] = False
    lab, n = ndimage.label(mask)
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    mask = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 60])

# ---------------- dots ----------------
def detect(msk, min_r, merge_d=14):
    dist = ndimage.distance_transform_edt(msk)
    mx = ndimage.maximum_filter(dist, size=9)
    peaks = (dist >= mx - 1e-9) & (dist >= min_r)
    lab, n = ndimage.label(peaks)
    cents = ndimage.center_of_mass(peaks, lab, range(1, n + 1))
    rad = ndimage.maximum(dist, lab, range(1, n + 1))
    pts = [(c[1], c[0], r) for c, r in zip(cents, rad)]
    out = []
    for x, y, r in sorted(pts, key=lambda p: -p[2]):
        if all((x - a) ** 2 + (y - b) ** 2 > merge_d ** 2 for a, b, _ in out):
            out.append((x, y, r))
    return out

pts = detect(mask, 4.4)
toink = ndimage.distance_transform_edt(~mask)
H, W = mask.shape
P = np.array([(x, y) for x, y, _ in pts]); R = np.array([r for _, _, r in pts])
print(PANEL, 'dots:', len(pts))

# ---------------- walker (as before) ----------------
def leave_dirs(k):
    x, y, r = pts[k]
    rr = r + 3.5
    angs = np.linspace(0, 2 * np.pi, 240, endpoint=False)
    on = [a for a in angs
          if 0 <= int(y + rr * np.sin(a)) < H and 0 <= int(x + rr * np.cos(a)) < W
          and toink[int(y + rr * np.sin(a)), int(x + rr * np.cos(a))] <= 0.8]
    if not on: return []
    on = sorted(on); clusters = [[on[0]]]
    for a in on[1:]:
        if a - clusters[-1][-1] < 0.12: clusters[-1].append(a)
        else: clusters.append([a])
    if len(clusters) > 1 and (on[0] + 2 * np.pi - clusters[-1][-1]) < 0.12:
        clusters[0] = clusters.pop() + [a + 2 * np.pi for a in clusters[0]]
    return [np.mean(c) % (2 * np.pi) for c in clusters]

def walk(k, h0):
    x, y, r = pts[k]
    step, h = 2.0, h0
    px, py = x + (r + 3.5) * np.cos(h0), y + (r + 3.5) * np.sin(h0)
    gap = 0
    for n in range(1200):
        span = 0.9 if n < 5 else 0.5
        best = None
        for dh in np.linspace(-span, span, 25):
            hh = h + dh
            nx, ny = px + step * np.cos(hh), py + step * np.sin(hh)
            if not (0 <= int(ny) < H and 0 <= int(nx) < W): continue
            d = toink[int(ny), int(nx)]
            s = d + 0.6 * abs(dh)
            if best is None or s < best[0]: best = (s, hh, nx, ny, d)
        if best is None: return None
        if best[4] > 2.2:
            gap += 1
            if gap > 8 or best[4] > 9: return None
            px, py = px + step * np.cos(h), py + step * np.sin(h)
            continue
        gap = 0
        _, h, px, py, _ = best
        dd = (P[:, 0] - px) ** 2 + (P[:, 1] - py) ** 2
        dd[k] = 1e18
        j = int(np.argmin(dd))
        if dd[j] <= (R[j] + 1.5) ** 2:
            return j
    return None

votes = collections.Counter()
for k in range(len(pts)):
    for h0 in leave_dirs(k):
        j = walk(k, h0)
        if j is not None: votes[(min(k, j), max(k, j))] += 1

# ---------------- pairwise straight-corridor score ----------------
def corridor(i, j, tol=3.5):
    a, b = P[i], P[j]
    seglen = np.hypot(*(b - a))
    L = max(2, int(seglen))
    ts = np.linspace(0, 1, L + 1)
    xs = np.clip((a[0] + (b[0] - a[0]) * ts).round().astype(int), 0, W - 1)
    ys = np.clip((a[1] + (b[1] - a[1]) * ts).round().astype(int), 0, H - 1)
    d = toink[ys, xs]
    return (d <= tol).mean(), d.max()

def blocked(i, j, corr=7):
    a, b = P[i], P[j]
    seglen = np.hypot(*(b - a))
    u = (b - a) / seglen
    for k in range(len(P)):
        if k in (i, j): continue
        w = P[k] - a
        t = w @ u
        if t < 12 or t > seglen - 12: continue
        if abs(-w[0] * u[1] + w[1] * u[0]) < corr: return k
    return None

accepted, review = [], []
for (i, j), v in votes.items():
    fr, worst = corridor(i, j)
    bl = blocked(i, j)
    seglen = np.hypot(*(P[j] - P[i]))
    if bl is not None:
        review.append((i, j, v, round(fr, 3), round(worst, 1), 'blocked by %d' % bl))
    elif v >= 2 and fr > 0.9:
        accepted.append((i, j))
    elif v == 1 and fr > 0.97 and worst < 8:
        accepted.append((i, j))
    else:
        review.append((i, j, v, round(fr, 3), round(worst, 1), ''))

adj = collections.defaultdict(int)
for i, j in accepted: adj[i] += 1; adj[j] += 1
print('accepted', len(accepted), 'review', len(review))
print('degree histogram', dict(collections.Counter([adj[i] for i in range(len(pts))])))
for r_ in review: print('REVIEW', r_)

# ---------------- residual-ink audit ----------------
explained = Image.new('L', (W, H), 0)
dr = ImageDraw.Draw(explained)
for i, j in accepted:
    dr.line([P[i][0], P[i][1], P[j][0], P[j][1]], fill=255, width=13)
for k, (x, y, r) in enumerate(pts):
    rr = r + 4
    dr.ellipse([x - rr, y - rr, x + rr, y + rr], fill=255)
exp = np.array(explained) > 0
resid = mask & ~exp
lab, n = ndimage.label(resid)
sizes = ndimage.sum(resid, lab, range(1, n + 1))
big = [(int(s), tuple(map(int, ndimage.center_of_mass(resid, lab, i + 1)))) for i, s in enumerate(sizes) if s > 120]
big.sort(reverse=True)
print('residual components > 120 px:', len(big))
for s, (cy, cx) in big[:40]: print('  RESID', s, 'at x=%d y=%d' % (cx, cy))

json.dump({'pts': [(float(x), float(y), float(r)) for x, y, r in pts],
           'accepted': [list(map(int, e)) for e in accepted],
           'review': [[int(i), int(j), int(v), f, w, msg] for i, j, v, f, w, msg in review]},
          open(f'{PANEL}_seg.json', 'w'))

rgb = Image.open('p13-8.png').convert('RGB')
dr = ImageDraw.Draw(rgb)
for i, j in accepted:
    dr.line([P[i][0], P[i][1], P[j][0], P[j][1]], fill=(0, 160, 0), width=3)
for i, j, *_ in review:
    dr.line([P[i][0], P[i][1], P[j][0], P[j][1]], fill=(255, 140, 0), width=2)
for k, (x, y, r) in enumerate(pts):
    deg = adj[k]
    col = (0, 120, 255) if deg == 2 else (255, 0, 0) if deg < 2 else (255, 0, 255)
    dr.ellipse([x - 9, y - 9, x + 9, y + 9], outline=col, width=3)
for s, (cy, cx) in big:
    dr.rectangle([cx - 40, cy - 40, cx + 40, cy + 40], outline=(200, 0, 200), width=5)
rgb.save(f'{PANEL}_audit.png')
print('wrote', f'{PANEL}_audit.png')
