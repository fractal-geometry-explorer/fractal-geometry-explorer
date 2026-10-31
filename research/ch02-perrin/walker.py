"""Pass 3: ridge-following walker. From each dot, leave along each ink direction
and follow the stroke, keeping heading nearly straight (so crossings are passed
through), until another dot is reached."""
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
import json, collections, math, sys

PANEL = sys.argv[1] if len(sys.argv) > 1 else 'top'

im = np.array(Image.open('p13-8.png').convert('L'))
ink = im < 128

def detect(mask, min_r, merge_d=14):
    dist = ndimage.distance_transform_edt(mask)
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

if PANEL == 'top':
    mask = ink.copy(); mask[2500:, :] = False
    pts = detect(mask, 4.4)
else:
    mask = ink.copy(); mask[:2700, :] = False
    pts = detect(mask, 4.4)

toink = ndimage.distance_transform_edt(~mask)
H, W = mask.shape
P = np.array([(x, y) for x, y, _ in pts])
R = np.array([r for _, _, r in pts])

def leave_dirs(k):
    """ink directions leaving dot k, by sampling a ring just outside the dot"""
    x, y, r = pts[k]
    rr = r + 3.5
    angs = np.linspace(0, 2 * np.pi, 240, endpoint=False)
    on = []
    for a in angs:
        sx, sy = x + rr * np.cos(a), y + rr * np.sin(a)
        if 0 <= int(sy) < H and 0 <= int(sx) < W and toink[int(sy), int(sx)] <= 0.8:
            on.append(a)
    if not on: return []
    # cluster circular angles
    on = sorted(on)
    clusters = [[on[0]]]
    for a in on[1:]:
        if a - clusters[-1][-1] < 0.12: clusters[-1].append(a)
        else: clusters.append([a])
    if len(clusters) > 1 and (on[0] + 2 * np.pi - clusters[-1][-1]) < 0.12:
        clusters[0] = clusters.pop() + [a + 2 * np.pi for a in clusters[0]]
    return [np.mean(c) % (2 * np.pi) for c in clusters]

def walk(k, h0):
    x, y, r = pts[k]
    step = 2.0
    h = h0
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
            score = d + 0.6 * abs(dh)
            if best is None or score < best[0]: best = (score, hh, nx, ny, d)
        if best is None:
            return None
        if best[4] > 2.2:
            # thin or broken ink: push straight ahead a little, hoping to rejoin
            gap += 1
            if gap > 5 or best[4] > 7:
                return None
            px, py = px + step * np.cos(h), py + step * np.sin(h)
            continue
        gap = 0
        _, h, px, py, _ = best
        # arrived at another dot?
        dd = (P[:, 0] - px) ** 2 + (P[:, 1] - py) ** 2
        dd[k] = 1e18
        j = int(np.argmin(dd))
        if dd[j] <= (R[j] + 1.5) ** 2:
            return j, n
    return None

edges = collections.Counter()
fails = []
for k in range(len(pts)):
    for h0 in leave_dirs(k):
        res = walk(k, h0)
        if res is None:
            fails.append((k, h0))
        else:
            j, n = res
            edges[(min(k, j), max(k, j))] += 1

both = [e for e, c in edges.items() if c >= 2]
one = [e for e, c in edges.items() if c == 1]
union = both + one
adj = collections.defaultdict(int)
for i, j in union: adj[i] += 1; adj[j] += 1
print('dots', len(pts), 'edges both-dir', len(both), 'one-dir', len(one), 'fails', len(fails))
print('degree histogram (union)', dict(collections.Counter([adj[i] for i in range(len(pts))])))

def chains_of(n, edgelist):
    a = collections.defaultdict(list)
    for i, j in edgelist: a[i].append(j); a[j].append(i)
    seen, chains = set(), []
    for s in range(n):
        if s in seen or len(a[s]) != 1: continue
        ch = [s]; seen.add(s); cur, prev = s, -1
        while True:
            nxt = [v for v in a[cur] if v != prev]
            if not nxt: break
            prev, cur = cur, nxt[0]
            if cur in seen: break
            ch.append(cur); seen.add(cur)
        chains.append(ch)
    # loops / leftovers
    left = [i for i in range(n) if i not in seen and a[i]]
    return chains, left

chains, left = chains_of(len(pts), union)
print('chains:', sorted(len(c) for c in chains), 'in loops/leftover:', len(left))

json.dump({'pts': [(float(x), float(y), float(r)) for x, y, r in pts],
           'both': [list(map(int, e)) for e in both],
           'one': [list(map(int, e)) for e in one]}, open(f'{PANEL}_walk.json', 'w'))

rgb = Image.open('p13-8.png').convert('RGB')
dr = ImageDraw.Draw(rgb)
for i, j in both:
    dr.line([pts[i][0], pts[i][1], pts[j][0], pts[j][1]], fill=(0, 160, 0), width=3)
for i, j in one:
    dr.line([pts[i][0], pts[i][1], pts[j][0], pts[j][1]], fill=(255, 140, 0), width=3)
for k, (x, y, r) in enumerate(pts):
    d = adj[k]
    col = (0, 120, 255) if d == 2 else (255, 0, 0) if d < 2 else (255, 0, 255)
    dr.ellipse([x - 9, y - 9, x + 9, y + 9], outline=col, width=4)
box = (900, 200, 3400, 2350) if PANEL == 'top' else (900, 2740, 3400, 4700)
rgb.crop(box).resize((1250, int(1250 * (box[3]-box[1]) / (box[2]-box[0])))).save(f'{PANEL}_walk_overlay.png')
