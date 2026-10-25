import numpy as np, itertools, math
from scipy.spatial import cKDTree
b = -1 + 1j; bi = 1 / b
# graph IFS for boundary pieces B_z = T ∩ (T+z), T = bi*T ∪ bi*(T+1)
N = [1, -1, 1j, -1j, 1 + 1j, -1 - 1j]
def key(z): return (round(z.real), round(z.imag))
rules = {}
for z in N:
    rules[key(z)] = []
    for a in (0, 1):
        for bb in (0, 1):
            w = b * z + bb - a
            if key(w) in [key(n) for n in N]:
                rules[key(z)].append((a, w))   # B_z ⊇ bi*(B_w + a)
print({k: [(a, key(w)) for a, w in v] for k, v in rules.items()})
# iterate point sets
pts = {key(z): np.array([0j]) for z in N}
for it in range(16):
    new = {}
    for z in N:
        L = [bi * (pts[key(w)] + a) for a, w in rules[key(z)]]
        P = np.concatenate(L)
        if len(P) > 200000: P = P[np.random.default_rng(0).choice(len(P), 200000, replace=False)]
        new[key(z)] = P
    pts = new
Bi = pts[key(1j)]
print(len(Bi))
# farthest pair
from scipy.spatial import ConvexHull
H = Bi[ConvexHull(np.stack([Bi.real, Bi.imag], 1)).vertices]
D = np.abs(H[:, None] - H[None, :]); i, j = np.unravel_index(D.argmax(), D.shape)
e0, e1 = H[i], H[j]; print('farthest', e0, e1, abs(e1 - e0))
np.save('Bi.npy', Bi)
g = np.array([0, 0.25 - 0.25j, 0.75 + 0.25j, 1])
def koch(codes, n):
    out = [0j]
    def rec(a, c, m, rev, d):
        if d == 0: out.append(a if rev else c); return
        G = np.conj(g) if m else g
        P = a + (c - a) * G; kids = []
        for k in range(3):
            cc = codes[k]; cm = m ^ (cc & 1); cr = 1 if cc >= 2 else 0
            kids.append((P[k + 1], P[k], cm, 1) if cr else (P[k], P[k + 1], cm, 0))
        for (x, y, cm, cr) in (kids if not rev else kids[::-1]): rec(x, y, cm, rev ^ cr, d - 1)
    rec(0j, 1 + 0j, 0, 0, n)
    return np.array(out)
res = []
for (p, q) in ((e0, e1), (e1, e0)):
    for mir in (0, 1):
        U = (Bi - p) / (q - p)
        if mir: U = np.conj(U)
        tU = cKDTree(np.stack([U.real, U.imag], 1))
        for codes in itertools.product(range(4), repeat=3):
            V = koch(codes, 7)
            tV = cKDTree(np.stack([V.real, V.imag], 1))
            d1 = tU.query(np.stack([V.real, V.imag], 1))[0].max()
            d2 = tV.query(np.stack([U.real, U.imag], 1)[::20])[0].max()
            res.append((max(d1, d2), codes, mir, p == e0))
res.sort(key=lambda r: r[0])
for r in res[:8]: print(r)
