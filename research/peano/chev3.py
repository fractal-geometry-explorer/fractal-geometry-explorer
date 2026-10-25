exec(open('chev.py').read().split('for c in comps[:40]:')[0])
import numpy as np, math, cmath
from scipy.spatial import cKDTree
import sys; sys.path.insert(0, '.')
from koch2 import apex, curve
tipsP = np.array([c['A'] for c in comps] + [c['B'] for c in comps])
tipsZ = tipsP[:, 0] - 1j * tipsP[:, 1]          # complex, y up
treeP = cKDTree(np.stack([tipsZ.real, tipsZ.imag], 1))
big = comps[0]
a0 = big['A'][0] - 1j * big['A'][1]; b0 = big['B'][0] - 1j * big['B'][1]
best = []
for phi in (30,):
    for n in range(5, 12):
        V = np.array(curve(apex(phi), [1, 3], n))
        segL = np.abs(np.diff(V))
        Lmax = segL.max()
        for i in range(len(V) - 1):
            if segL[i] < 0.3 * Lmax: continue
            for (p, q) in ((V[i], V[i + 1]), (V[i + 1], V[i])):
                for (pa, pb) in ((a0, b0), (b0, a0)):
                    # similarity z -> s*z + t mapping p->pa, q->pb (orientation-preserving)
                    s = (pb - pa) / (q - p); t = pa - s * p
                    W = s * V + t
                    # also allow mirror: z -> s*conj(z) + t
                    d, _ = treeP.query(np.stack([W.real, W.imag], 1), distance_upper_bound=10)
                    hits = np.isfinite(d).sum()
                    best.append((hits, n, i, 'pres', abs(s)))
                    s2 = (pb - pa) / (np.conj(q) - np.conj(p)); t2 = pa - s2 * np.conj(p)
                    W2 = s2 * np.conj(V) + t2
                    d2, _ = treeP.query(np.stack([W2.real, W2.imag], 1), distance_upper_bound=10)
                    best.append((np.isfinite(d2).sum(), n, i, 'mirr', abs(s2)))
best.sort(key=lambda x: -x[0])
print('tips', len(tipsZ), 'best matches', best[:8])
