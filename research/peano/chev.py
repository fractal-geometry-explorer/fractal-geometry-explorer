import numpy as np, scipy.ndimage as nd, math
from PIL import Image
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
a = np.array(Image.open(FG + 'p64_600.png').convert('L')).astype(float)
dark = a < 120
dark[:620, :] = False            # drop the caption text above the plate
dark[:, :700] &= np.arange(a.shape[0])[:, None] > 1150   # drop the caption box at left
lab, n = nd.label(dark, structure=np.ones((3, 3)))
sizes = nd.sum(dark, lab, range(1, n + 1))
comps = []
for k in np.argsort(sizes)[::-1]:
    if sizes[k] < 150: break
    ys, xs = np.nonzero(lab == k + 1)
    P = np.stack([xs, ys], 1).astype(float)
    # tips: farthest pair (approx via extreme in many directions)
    best = (0, None, None)
    hull = P[np.unique(np.concatenate([np.argmax(P @ np.array([math.cos(t), math.sin(t)])) for t in np.linspace(0, 2*math.pi, 90)]))] if False else None
    idx = []
    for t in np.linspace(0, math.pi * 2, 72, endpoint=False):
        d = P @ np.array([math.cos(t), math.sin(t)]); idx.append(np.argmax(d))
    H = P[np.unique(idx)]
    for i in range(len(H)):
        for j in range(i + 1, len(H)):
            dd = np.hypot(*(H[i] - H[j]))
            if dd > best[0]: best = (dd, H[i], H[j])
    L, A, B = best
    u = (B - A) / L; nrm = np.array([-u[1], u[0]])
    off = (P - A) @ nrm
    side = 1 if off.max() > -off.min() else -1
    C = P[np.argmax(off * side)]                   # outer corner: farthest from the chord
    comps.append(dict(size=int(sizes[k]), A=A, B=B, C=C, L=L, h=abs((C - A) @ nrm)))
for c in comps[:40]:
    A, B, C = c['A'], c['B'], c['C']
    a1 = np.hypot(*(C - A)); a2 = np.hypot(*(B - C))
    v1 = A - C; v2 = B - C; ang = math.degrees(math.acos(np.dot(v1, v2) / (a1 * a2)))
    print(f"area {c['size']:6d} tips ({A[0]:.0f},{A[1]:.0f})-({B[0]:.0f},{B[1]:.0f}) corner ({C[0]:.0f},{C[1]:.0f}) arms {a1:6.1f} {a2:6.1f} ratio {min(a1,a2)/max(a1,a2):.3f} angle {ang:6.1f} thick/L {c['size']/c['L']**2:.4f}")
print(len(comps), 'components')

# ---- chain analysis: which tips coincide?
import itertools
tips = []
for i, c in enumerate(comps):
    tips.append((i, 0, c['A'])); tips.append((i, 1, c['B']))
links = []
for (i, ei, p), (j, ej, q) in itertools.combinations(tips, 2):
    if i != j and np.hypot(*(p - q)) < 0.06 * min(comps[i]['L'], comps[j]['L']) + 6: links.append((i, j))
deg = {}
for i, j in links: deg[i] = deg.get(i, 0) + 1; deg[j] = deg.get(j, 0) + 1
print('links', len(links), 'degree histogram', {d: sum(1 for v in deg.values() if v == d) for d in set(deg.values())}, 'isolated', len(comps) - len(deg))
# chord direction and corner side for big+medium
for c in comps[:26]:
    A, B, C = c['A'], c['B'], c['C']
    # orient so that the short arm comes first
    if np.hypot(*(C - A)) > np.hypot(*(C - B)): A, B = B, A
    d = B - A; ang = math.degrees(math.atan2(-d[1], d[0]))
    side = np.sign(d[0] * (C - A)[1] - d[1] * (C - A)[0])
    print(f"L {c['L']:6.1f} chord dir (short→long) {ang:7.1f}  corner side {'+' if side > 0 else '-'}  start ({A[0]:.0f},{A[1]:.0f})")
