import numpy as np, scipy.ndimage as nd, math
from PIL import Image
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
a = np.array(Image.open(FG + 'd6-083.png').convert('L')).astype(float)
H, W = a.shape
# the plate: lower right region of page 67
y0, x0 = int(H * 0.39), int(W * 0.44)
sub = a[y0:, x0:]
dark = sub < 120
dark[:int(0.03 * H), :] = False
lab, n = nd.label(dark, structure=np.ones((3, 3)))
sizes = nd.sum(dark, lab, range(1, n + 1))
comps = []
for k in np.argsort(sizes)[::-1]:
    if sizes[k] < 80: break
    ys, xs = np.nonzero(lab == k + 1)
    P = np.stack([xs + x0, ys + y0], 1).astype(float)
    idx = [np.argmax(P @ np.array([math.cos(t), math.sin(t)])) for t in np.linspace(0, 2 * math.pi, 72, endpoint=False)]
    Hh = P[np.unique(idx)]
    best = (0, None, None)
    for i in range(len(Hh)):
        for j in range(i + 1, len(Hh)):
            dd = np.hypot(*(Hh[i] - Hh[j]))
            if dd > best[0]: best = (dd, Hh[i], Hh[j])
    L, A, B = best
    u = (B - A) / L; nrm = np.array([-u[1], u[0]]); off = (P - A) @ nrm
    C = P[np.argmax(np.abs(off))]
    comps.append(dict(size=int(sizes[k]), A=A, B=B, C=C, L=L, bend=float(abs((C - A) @ nrm) / L), along=float(((C - A) @ u) / L)))
print(len(comps), 'components')
for c in comps[:25]: print(f"area {c['size']:6d} L {c['L']:7.1f} tips ({c['A'][0]:.0f},{c['A'][1]:.0f})-({c['B'][0]:.0f},{c['B'][1]:.0f}) bend {c['bend']:.3f} along {c['along']:.3f}")
import pickle; pickle.dump(comps, open('p67comps.pkl', 'wb'))
