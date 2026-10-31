"""Pass: cover residual ink by adding edges (and corner-inferred vertices)."""
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
import json, collections, sys

PANEL = sys.argv[1]
im = np.array(Image.open('p13-8.png').convert('L'))
ink = im < 128
if PANEL == 'top':
    mask = ink.copy(); mask[2500:, :] = False
else:
    raw = ink.copy(); raw[:2700, :] = False
    dist = ndimage.distance_transform_edt(raw)
    mask = ndimage.binary_propagation(dist >= 2.2, mask=raw)

d = json.load(open(f'{PANEL}_seg.json'))
pts = [tuple(p) for p in d['pts']]
accepted = [tuple(e) for e in d['accepted']]
H, W = mask.shape
toink = ndimage.distance_transform_edt(~mask)

def corridor_ok(a, b, tol=4.0, fr=0.9):
    seglen = max(2, int(np.hypot(b[0] - a[0], b[1] - a[1])))
    ts = np.linspace(0, 1, seglen + 1)
    xs = np.clip((a[0] + (b[0] - a[0]) * ts).round().astype(int), 0, W - 1)
    ys = np.clip((a[1] + (b[1] - a[1]) * ts).round().astype(int), 0, H - 1)
    dd = toink[ys, xs]
    return (dd <= tol).mean() >= fr and dd.max() < 9

def render_explained():
    img = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(img)
    for i, j in accepted:
        dr.line([pts[i][0], pts[i][1], pts[j][0], pts[j][1]], fill=255, width=15)
    for x, y, r in pts:
        rr = r + 4
        dr.ellipse([x - rr, y - rr, x + rr, y + rr], fill=255)
    return np.array(img) > 0

for rounds in range(4):
    resid = mask & ~render_explained()
    lab, n = ndimage.label(resid)
    sizes = ndimage.sum(resid, lab, range(1, n + 1))
    todo = [i + 1 for i, s in enumerate(sizes) if s > 120]
    if not todo:
        print('round', rounds, 'no residuals left'); break
    added = 0
    for li in todo:
        ys, xs = np.where(lab == li)
        # farthest pair by PCA extremes
        c = np.array([xs.mean(), ys.mean()])
        V = np.stack([xs - c[0], ys - c[1]])
        u = np.linalg.svd(V.astype(float), full_matrices=False)[0][:, 0]
        t = V[0] * u[0] + V[1] * u[1]
        e1 = np.array([xs[t.argmin()], ys[t.argmin()]], float)
        e2 = np.array([xs[t.argmax()], ys[t.argmax()]], float)
        anchors = []
        for e in (e1, e2):
            dd = [(k, (p[0] - e[0]) ** 2 + (p[1] - e[1]) ** 2) for k, p in enumerate(pts)]
            k, dmin = min(dd, key=lambda q: q[1])
            anchors.append(k if dmin < 28 ** 2 else None)
        a, b = anchors
        if a is not None and b is not None and a != b and (min(a,b), max(a,b)) not in [tuple(sorted(e)) for e in accepted]:
            if corridor_ok(pts[a], pts[b]):
                accepted.append((a, b)); added += 1; continue
        # try corner vertex: new point at the component's bend (farthest pixel from chord e1-e2)
        chord = e2 - e1; L = np.hypot(*chord)
        if L > 4:
            un = chord / L
            perp = np.abs(-(xs - e1[0]) * un[1] + (ys - e1[1]) * un[0])
            pk = perp.argmax()
            if perp[pk] > 6:   # bent stroke: a corner without a printed dot
                corner = (float(xs[pk]), float(ys[pk]), 3.0)
                ci = len(pts); pts.append(corner)
                ok = 0
                for e in (e1, e2):
                    dd = [(k, (p[0] - e[0]) ** 2 + (p[1] - e[1]) ** 2) for k, p in enumerate(pts[:-1])]
                    k, dmin = min(dd, key=lambda q: q[1])
                    if dmin < 28 ** 2 and corridor_ok(pts[k], corner):
                        accepted.append((k, ci)); ok += 1
                if ok: added += 1
                else: pts.pop()
    print('round', rounds, 'residuals', len(todo), 'added', added)
    if not added: break

resid = mask & ~render_explained()
lab, n = ndimage.label(resid)
sizes = ndimage.sum(resid, lab, range(1, n + 1))
left = [(int(s), tuple(map(int, ndimage.center_of_mass(resid, lab, i + 1)))) for i, s in enumerate(sizes) if s > 120]
left.sort(reverse=True)
print('STILL UNEXPLAINED:', left)

json.dump({'pts': [list(p) for p in pts], 'accepted': [list(map(int, e)) for e in accepted]},
          open(f'{PANEL}_seg2.json', 'w'))
adj = collections.defaultdict(int)
for i, j in accepted: adj[i] += 1; adj[j] += 1
print('dots', len(pts), 'edges', len(accepted), 'degree histogram',
      dict(collections.Counter([adj[i] for i in range(len(pts))])))
