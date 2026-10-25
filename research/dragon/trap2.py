exec(open('trap.py').read().split('ims = []')[0])
import numpy as np
from scipy.spatial import ConvexHull
for flags in [(True, False, False), (False, True, True)]:
    for n in (12, 16, 20):
        s = gen_sweep(apex(30), n, *flags)
        P = np.array([s[0][0]] + [x[1] for x in s])
        Q = np.stack([P.real, P.imag], 1)
        h = ConvexHull(Q)
        V = Q[h.vertices]
        # keep corners with turn > 5 deg
        keep = []
        for i in range(len(V)):
            a, b, c = V[i - 1], V[i], V[(i + 1) % len(V)]
            u, v = b - a, c - b
            t = math.degrees(math.atan2(u[0] * v[1] - u[1] * v[0], u @ v))
            if abs(t) > 4: keep.append((round(b[0], 3), round(b[1], 3), round(180 - abs(t))))
        print(flags, n, 'hull', round(h.volume, 4), keep)
    # raster area of union of S-squares? estimate via point density: grid occupancy at stage 20
    s = gen_sweep(apex(30), 20, *flags)
    P = np.array([x[1] for x in s])
    G = 400
    occ = np.zeros((G * 2, G * 2), bool)
    ix = np.clip((P.real * G).astype(int), 0, 2 * G - 1); iy = np.clip((P.imag * G).astype(int), 0, 2 * G - 1)
    occ[iy, ix] = True
    print('occupied area', occ.sum() / G / G)
    from PIL import Image
    Image.fromarray((~occ[::-1] * 255).astype(np.uint8)).save(FG + 'trap_occ_%d.png' % flags[0])
