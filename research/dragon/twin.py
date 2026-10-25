import numpy as np
from scipy.spatial import cKDTree
exec(open('altdragon.py').read().split('for name')[0])
D1 = alt_dragon([1] * 18)
TD = np.concatenate([D1, 1 - D1])   # dragon on 1->0 with generator right = rotate 180 about 1/2
# beta tile points
b = -1 + 1j
k = np.arange(1, 19)
digits = ((np.arange(2 ** 18)[:, None] >> (k - 1)) & 1)
T = (digits * (b ** (-k.astype(float)))).sum(1)
cT, cD = T.mean(), TD.mean()
print('centroids', cT, cD)
tT = cKDTree(np.stack([T.real, T.imag], 1))
for mir in (0, 1):
    for r in range(8):
        R = np.exp(1j * np.pi / 4 * r)
        X = TD - cD
        if mir: X = np.conj(X)
        X = X * R + cT
        d = tT.query(np.stack([X.real, X.imag], 1)[::7])[0].max()
        if d < 0.1: print(mir, r, d)
