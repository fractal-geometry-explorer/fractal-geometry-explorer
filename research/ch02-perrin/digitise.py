"""Digitise Plate 13 (Perrin's Brownian tracings): detect vertex dots, link them
along inked segments, and chain them into tracings.

Panels (600 dpi, p13-8.png): top y in [228, 2321], bottom (grid) y in [2764, 4681].
The grid panel needs the grid removed first: grid lines are long thin straight
runs; the tracing ink is thicker. We separate by erosion.
"""
import numpy as np
from PIL import Image
from scipy import ndimage
import json, sys

im = np.array(Image.open('p13-8.png').convert('L')).astype(np.float64)
ink = im < 128

def dots_and_lines(mask, min_dist):
    """Distance transform; dots = local maxima with interior radius >= min_dist."""
    dist = ndimage.distance_transform_edt(mask)
    # local maxima
    mx = ndimage.maximum_filter(dist, size=9)
    peaks = (dist >= mx - 1e-9) & (dist >= min_dist)
    lab, n = ndimage.label(peaks)
    cents = ndimage.center_of_mass(peaks, lab, range(1, n + 1))
    rad = ndimage.maximum(dist, lab, range(1, n + 1))
    return dist, [(c[1], c[0], r) for c, r in zip(cents, rad)]  # (x, y, radius)

def merge_close(pts, d):
    out = []
    for x, y, r in sorted(pts, key=lambda p: -p[2]):
        if all((x - a) ** 2 + (y - b) ** 2 > d * d for a, b, _ in out):
            out.append((x, y, r))
    return out

def covered(dist, a, b, maxgap, others, corridor):
    """Fraction of samples along a->b within maxgap of ink; and whether another
    dot sits on the open segment."""
    ax, ay = a; bx, by = b
    L = max(1, int(np.hypot(bx - ax, by - ay)))
    ts = np.linspace(0, 1, L + 1)
    xs = ax + (bx - ax) * ts; ys = ay + (by - ay) * ts
    d = dist[np.clip(ys.round().astype(int), 0, dist.shape[0] - 1),
             np.clip(xs.round().astype(int), 0, dist.shape[1] - 1)]
    frac = (d > 0.5).mean()
    worst = 0.0
    # longest run of uncovered samples (in px)
    run = 0
    for v in d > 0.5:
        if v: run = 0
        else:
            run += 1; worst = max(worst, run)
    # another dot on the segment?
    blocked = False
    seglen = np.hypot(bx - ax, by - ay)
    ux, uy = (bx - ax) / seglen, (by - ay) / seglen
    for ox, oy, orr in others:
        t = ((ox - ax) * ux + (oy - ay) * uy)
        if t < corridor or t > seglen - corridor: continue
        perp = abs(-(ox - ax) * uy + (oy - ay) * ux)
        if perp < corridor:
            blocked = True; break
    return frac, worst, blocked

def build(mask, min_dot_r, name):
    dist, pts = dots_and_lines(mask, min_dot_r)
    pts = merge_close(pts, 14)
    print(name, 'dots:', len(pts))
    # candidate edges: all pairs within 700 px
    edges = []
    for i in range(len(pts)):
        for j in range(i + 1, len(pts)):
            ax, ay, _ = pts[i]; bx, by, _ = pts[j]
            if (ax - bx) ** 2 + (ay - by) ** 2 > 700 ** 2: continue
            others = [p for k, p in enumerate(pts) if k != i and k != j]
            frac, worst, blocked = covered(dist, (ax, ay), (bx, by), 3, others, 9)
            if frac > 0.985 and worst <= 6 and not blocked:
                edges.append((i, j, np.hypot(ax - bx, ay - by)))
    deg = np.zeros(len(pts), int)
    for i, j, _ in edges: deg[i] += 1; deg[j] += 1
    import collections
    print(name, 'edges:', len(edges), 'degree histogram:', dict(collections.Counter(deg.tolist())))
    return dist, pts, edges, deg

# ---- top panel ----
top = ink.copy(); top[2500:, :] = False
dist_t, pts_t, edges_t, deg_t = build(top, 5.0, 'top')

np.save('top_pts.npy', np.array([(x, y, r) for x, y, r in pts_t]))
json.dump(edges_t and [(i, j) for i, j, _ in edges_t], open('top_edges.json', 'w'))
