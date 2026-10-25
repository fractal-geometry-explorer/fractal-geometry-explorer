import numpy as np
from scipy.spatial import cKDTree
k = np.arange(1, 19)
dig = ((np.arange(2 ** 18)[:, None] >> (k - 1)) & 1)
def tile(b): return (dig * (b ** (-k.astype(float)))).sum(1)
T1 = tile(-1 + 1j); T2 = tile(1 + 1j)
print('base 1+i: 0.111... =', (1 / ((1 + 1j) - 1)))
print('extent', T2.real.min(), T2.real.max(), T2.imag.min(), T2.imag.max())
# Gaussian integers within T2 (distance to nearest sample point)
tt = cKDTree(np.stack([T2.real, T2.imag], 1))
for g in [0, -1j, 1, -1, 1j, -1 - 1j, 1 - 1j, -1 + 1j]:
    print('dist from', g, 'to T(1+i):', round(tt.query([g.real, g.imag])[0], 4) if isinstance(g, complex) else round(tt.query([g, 0])[0], 4))
# same shape as the twindragon?
t1 = cKDTree(np.stack([T1.real, T1.imag], 1))
best = []
for mir in (0, 1):
    for r in range(8):
        X = (np.conj(T2) if mir else T2); X = (X - X.mean()) * np.exp(1j * np.pi / 4 * r) + T1.mean()
        d = t1.query(np.stack([X.real, X.imag], 1)[::13])[0].max()
        best.append((round(d, 4), mir, r * 45))
print(sorted(best)[:3])
# finite expansions in base 1+i, digits {0,1}
def expand(z, b=1 + 1j, maxlen=40):
    a, bb = int(round(z.real)), int(round(z.imag)); out = []
    for _ in range(maxlen):
        if a == 0 and bb == 0: return ''.join(map(str, out[::-1])) or '0'
        d = (a + bb) % 2; out.append(d)
        w = complex(a - d, bb) / b; a, bb = int(round(w.real)), int(round(w.imag))
    return None
for g in [1, 1j, -1, -1j, 1 + 1j, 2, 2j, 1 - 1j, 3, -2 + 2j]:
    print(g, expand(complex(g)))
