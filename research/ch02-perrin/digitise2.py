"""Pass 2: better edge test using distance-to-ink; chain into tracings."""
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
import json, collections

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

def link(mask, pts, maxlen=700, tol=3.0, fr=0.96, worst_px=12, corridor=6):
    toink = ndimage.distance_transform_edt(~mask)   # distance to nearest ink
    P = np.array([(x, y) for x, y, _ in pts])
    edges = []
    for i in range(len(P)):
        for j in range(i + 1, len(P)):
            a, b = P[i], P[j]
            seglen = np.hypot(*(b - a))
            if seglen > maxlen or seglen < 8: continue
            L = max(2, int(seglen))
            ts = np.linspace(0, 1, L + 1)
            xs = (a[0] + (b[0] - a[0]) * ts).round().astype(int)
            ys = (a[1] + (b[1] - a[1]) * ts).round().astype(int)
            d = toink[np.clip(ys, 0, mask.shape[0] - 1), np.clip(xs, 0, mask.shape[1] - 1)]
            frac = (d <= tol).mean()
            if frac < fr or d.max() > worst_px: continue
            # blocked by a collinear third dot?
            u = (b - a) / seglen
            blocked = False
            for k in range(len(P)):
                if k == i or k == j: continue
                w = P[k] - a
                t = w @ u
                if t < 10 or t > seglen - 10: continue
                if abs(-w[0] * u[1] + w[1] * u[0]) < corridor:
                    blocked = True; break
            if not blocked:
                edges.append((i, j, seglen, frac, d.max()))
    return edges

def chains_of(pts, edges):
    adj = collections.defaultdict(list)
    for i, j, *_ in edges:
        adj[i].append(j); adj[j].append(i)
    deg = {i: len(adj[i]) for i in range(len(pts))}
    seen = set(); chains = []
    for s in range(len(pts)):
        if s in seen or deg.get(s, 0) != 1: continue
        ch = [s]; seen.add(s); cur = s; prev = -1
        while True:
            nxt = [v for v in adj[cur] if v != prev]
            if not nxt: break
            prev, cur = cur, nxt[0]
            if cur in seen: break
            ch.append(cur); seen.add(cur)
        chains.append(ch)
    isolated = [i for i in range(len(pts)) if deg.get(i, 0) == 0]
    return chains, isolated, deg

top = ink.copy(); top[2500:, :] = False
pts = detect(top, 4.4)
edges = link(top, pts)
deg = collections.Counter()
adj = collections.defaultdict(int)
for i, j, *_ in edges: adj[i] += 1; adj[j] += 1
print('dots', len(pts), 'edges', len(edges))
print('degree histogram', dict(collections.Counter([adj[i] for i in range(len(pts))])))
chains, isolated, degd = chains_of(pts, edges)
print('chains:', sorted(len(c) for c in chains), 'isolated:', len(isolated))

np.save('top_pts2.npy', np.array(pts))
json.dump([(i, j) for i, j, *_ in edges], open('top_edges2.json', 'w'))

# visualize: edges green, degree!=2 dots colored
rgb = Image.open('p13-8.png').convert('RGB')
dr = ImageDraw.Draw(rgb)
for i, j, *_ in edges:
    dr.line([pts[i][0], pts[i][1], pts[j][0], pts[j][1]], fill=(0, 160, 0), width=3)
for k, (x, y, r) in enumerate(pts):
    d = adj[k]
    col = (0, 120, 255) if d == 2 else (255, 0, 0) if d < 2 else (255, 0, 255)
    dr.ellipse([x - 9, y - 9, x + 9, y + 9], outline=col, width=4)
rgb.crop((900, 200, 3400, 2350)).resize((1250, 1075)).save('top_link_overlay.png')
