"""Bottom panel, clean approach: ruler-straight segments, so pairwise chord tests
with grid-aware sampling. Border/lattice blotch dots removed first."""
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
import json, collections

im = np.array(Image.open('p13-8.png').convert('L')).astype(float)
mn = ndimage.minimum_filter(im, size=5)
ink = im < 128
raw = ink.copy(); raw[:2700, :] = False
rawdist = ndimage.distance_transform_edt(raw)
gf = json.load(open('grid_fit.json'))
(vp, vx0, _), (hp, hy0, _) = gf['v'], gf['h']
H, W = raw.shape
vxs = [vx0 + k * vp for k in range(27)]
hys = [hy0 + k * hp for k in range(21)]
x_lo, x_hi, y_lo, y_hi = min(vxs), max(vxs), min(hys), max(hys)

near_v = np.zeros(W, bool); near_h = np.zeros(H, bool)
for x in vxs: near_v[max(0,int(x)-8):int(x)+9] = True
for y in hys: near_h[max(0,int(y)-8):int(y)+9] = True
wild = np.zeros_like(raw)
wild[:, near_v] = True
wild[near_h, :] = True
# borders wider
for x in (x_lo, x_hi): wild[:, max(0,int(x)-16):int(x)+17] = True
for y in (y_lo, y_hi): wild[max(0,int(y)-16):int(y)+17, :] = True

d = json.load(open('bot_seg.json'))
pts0 = [tuple(p) for p in d['pts']]

# stroke mask: ink minus grid corridors, minus elongated remnants of wavy
# lattice lines, minus specks
mask_nogrid = raw & ~wild
lab, n = ndimage.label(mask_nogrid)
objs = ndimage.find_objects(lab)
kill = []
for li, sl in enumerate(objs, start=1):
    h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
    area = (lab[sl] == li).sum()
    if area < 60: kill.append(li); continue
    if w >= 4 * h:     # horizontal sliver: near a horizontal lattice line?
        ym = (sl[0].start + sl[0].stop) / 2
        k = round((ym - hy0) / hp)
        if abs(ym - (hy0 + k * hp)) < 14: kill.append(li)
    elif h >= 4 * w:   # vertical sliver
        xm = (sl[1].start + sl[1].stop) / 2
        k = round((xm - vx0) / vp)
        if abs(xm - (vx0 + k * vp)) < 14: kill.append(li)
mask_nogrid &= ~np.isin(lab, kill)
to_stroke = ndimage.distance_transform_edt(~mask_nogrid)
pts = []
for x, y, r in pts0:
    if x < x_lo + 14 or x > x_hi - 14 or y < y_lo + 14 or y > y_hi - 14: continue
    # blotch test: any stroke ink (non-wild) within 26 px?
    y0, y1 = max(0,int(y)-26), int(y)+27
    x0, x1 = max(0,int(x)-26), int(x)+27
    if not mask_nogrid[y0:y1, x0:x1].any(): continue
    pts.append((x, y, r))
print('dots kept', len(pts), 'of', len(pts0))
P = np.array([p[:2] for p in pts])

def chord(i, j):
    """fraction of non-grid samples within 2.5 px of stroke ink"""
    a, b = P[i], P[j]
    L = np.hypot(*(b - a))
    n = max(12, int(L / 3))
    ts = np.linspace(10 / L, 1 - 10 / L, n)
    xs = np.clip((a[0] + (b[0]-a[0]) * ts).round().astype(int), 0, W-1)
    ys = np.clip((a[1] + (b[1]-a[1]) * ts).round().astype(int), 0, H-1)
    w = wild[ys, xs]
    dd = to_stroke[ys, xs]
    thick = np.array([rawdist[max(0,y-4):y+5, max(0,x-4):x+5].max() >= 3.4
                      for x, y in zip(xs, ys)])
    cov = (dd <= 2.5) | (w & thick)      # on stroke ink, or inside a grid
    miss = ~cov                          # corridor but thicker than the line
    worst = dd[~w].max() if (~w).any() else 0.0
    return cov.mean(), worst if miss.any() else 0.0

def rides_grid(i, j):
    """chord nearly parallel and adjacent to a lattice line (its dark halo fools
    the min-filter test)"""
    a, b = P[i], P[j]
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = np.hypot(dx, dy)
    on_line = False
    if abs(dx) < 0.1 * L:   # near-vertical
        on_line = all(abs((a[0] + dx * t) - (vx0 + round(((a[0] + dx * t) - vx0) / vp) * vp)) <= 16
                      for t in (0.25, 0.5, 0.75))
    elif abs(dy) < 0.1 * L:  # near-horizontal
        on_line = all(abs((a[1] + dy * t) - (hy0 + round(((a[1] + dy * t) - hy0) / hp) * hp)) <= 16
                      for t in (0.25, 0.5, 0.75))
    if not on_line: return False
    # a tracing stroke drawn along a lattice line is about twice as thick as the
    # line: accept the chord when the ink along it is thick
    n = max(12, int(L / 4))
    ts = np.linspace(10 / L, 1 - 10 / L, n)
    xs = np.clip((a[0] + dx * ts).round().astype(int), 0, W - 1)
    ys = np.clip((a[1] + dy * ts).round().astype(int), 0, H - 1)
    th = np.array([rawdist[max(0,y-4):y+5, max(0,x-4):x+5].max() for x, y in zip(xs, ys)])
    return np.median(th) < 3.3

cands = []
for i in range(len(P)):
    for j in range(i + 1, len(P)):
        L = np.hypot(*(P[j] - P[i]))
        if L < 20 or L > 1300: continue
        if rides_grid(i, j): continue
        c = chord(i, j)
        if c is None: continue
        fr, worst = c
        if fr >= 0.92 and worst < 14:
            cands.append((i, j, L))
print('candidates', len(cands))

# blocked resolution: if a third dot lies within 4 px of the chord interior, prefer the split
def chord_dist(i, j, k):
    a, b, p = P[i], P[j], P[k]
    L = np.hypot(*(b - a)); u = (b - a) / L
    w = p - a; t = w @ u
    if t < 15 or t > L - 15: return None
    return abs(-w[0]*u[1] + w[1]*u[0])

cset = set((i, j) for i, j, _ in cands)
drop = set()
for i, j, L in cands:
    for k in range(len(P)):
        if k in (i, j): continue
        cd = chord_dist(i, j, k)
        if cd is not None and cd < 5.0:
            drop.add((i, j)); break
edges = [(i, j) for i, j, _ in cands if (i, j) not in drop]
adj = collections.defaultdict(int)
for i, j in edges: adj[i] += 1; adj[j] += 1
print('edges after split-pruning', len(edges),
      'deg', dict(collections.Counter([adj[i] for i in range(len(P))])))
json.dump({'pts': [list(p) for p in pts], 'accepted': [list(e) for e in edges]},
          open('bot_final.json', 'w'))

# visual render
img = Image.new('RGB', (2600, 2100), (236, 235, 230))
dr = ImageDraw.Draw(img)
ox, oy = 880, 2720
for x in vxs: dr.line([x-ox, y_lo-oy, x-ox, y_hi-oy], fill=(190,188,180), width=3)
for y in hys: dr.line([x_lo-ox, y-oy, x_hi-ox, y-oy], fill=(190,188,180), width=3)
for i, j in edges:
    dr.line([P[i][0]-ox, P[i][1]-oy, P[j][0]-ox, P[j][1]-oy], fill=(30,28,26), width=5)
for x, y, r in pts:
    rr = 11 if r >= 9 else 7
    dr.ellipse([x-ox-rr, y-oy-rr, x-ox+rr, y-oy+rr], fill=(30,28,26))
img.resize((866, 700)).save('render_bot2.png')
