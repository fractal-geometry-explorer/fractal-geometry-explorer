exec(open('skin.py').read().split('Bi = pts')[0].replace('range(16)', 'range(22)').replace('200000', '400000'))
from scipy.spatial import cKDTree
Bi = pts[key(1j)]
for z in N:
    if key(z) == key(1j): continue
    Bz = pts[key(z)]
    t = cKDTree(np.stack([Bz.real, Bz.imag], 1))
    d, _ = t.query(np.stack([Bi.real, Bi.imag], 1))
    close = Bi[d < 0.004]
    if len(close): print(key(z), len(close), np.round(close.mean(), 4), np.round(close[:3], 4))
