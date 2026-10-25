exec(open('skin.py').read().split('Bi = pts')[0].replace('range(16)', 'range(20)'))
exec('g = ' + open('skin.py').read().split('g = ', 1)[1].split('res = []')[0])
from scipy.spatial import cKDTree
Bi = pts[key(1j)]
e0, e1 = (-3 + 1j) / 5, (1 + 3j) / 5
res = []
for (p, q) in ((e0, e1), (e1, e0)):
    for mir in (0, 1):
        U = (Bi - p) / (q - p)
        if mir: U = np.conj(U)
        tU = cKDTree(np.stack([U.real, U.imag], 1))
        for codes in itertools.product((0, 1), repeat=3) if False else [(0,0,0),(1,0,1)]:
            V = koch(codes, 11)
            tV = cKDTree(np.stack([V.real, V.imag], 1))
            d1 = tU.query(np.stack([V.real, V.imag], 1))[0].max()
            d2 = tV.query(np.stack([U.real, U.imag], 1)[::5])[0].max()
            res.append((round(max(d1, d2), 4), codes, mir, p == e0))
res.sort(key=lambda r: r[0])
for r in res[:6]: print(r)
