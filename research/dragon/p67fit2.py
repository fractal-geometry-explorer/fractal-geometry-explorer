import pickle, numpy as np, math, cmath, itertools
from scipy.spatial import cKDTree
exec(open('p67fit.py').read().split('results = []')[0])
def koch_curve(A, codes, n):
    out = [0j]
    def rec(a, b, m, rev, d):
        if d == 0: out.append(a if rev else b); return
        AA = A.conjugate() if m else A
        c = a + (b - a) * AA
        P = [a, c, b]; kids = []
        for k in range(2):
            cc = codes[k]; cm = m ^ (cc & 1); cr = 1 if cc >= 2 else 0
            kids.append((P[k + 1], P[k], cm, 1) if cr else (P[k], P[k + 1], cm, 0))
        for (x, y, cm, cr) in (kids if not rev else kids[::-1]): rec(x, y, cm, rev ^ cr, d - 1)
    rec(0j, 1 + 0j, 0, 0, n)
    return np.array(out)
def fit(V):
    segL = np.abs(np.diff(V)); Lmax = segL.max(); best = (0,)
    for i in np.nonzero(segL > 0.5 * Lmax)[0]:
        for (p, q) in ((V[i], V[i + 1]), (V[i + 1], V[i])):
            for mir in (False, True):
                VV = np.conj(V) if mir else V; pp = np.conj(p) if mir else p; qq = np.conj(q) if mir else q
                s = (b0 - a0) / (qq - pp); t = a0 - s * pp
                sc = score(s * VV + t)
                if sc > best[0]: best = (sc, i, mir, p, q)
    return best
res = []
for codes in itertools.product(range(4), repeat=2):
    for phi in (30, 60):
        for n in (6, 7, 8, 9):
            V = koch_curve(apex(phi), codes, n)
            b = fit(V); res.append((b[0], codes, phi, n))
res.sort(key=lambda r: -r[0])
print(res[:10])
