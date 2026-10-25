import numpy as np, math, itertools
from scipy.spatial import ConvexHull
exec(open('chainfit.py').read().split('Z, chains =')[0])
cr = lambda u, v: u[0] * v[1] - u[1] * v[0]
def corners(P, thr=6):
    h = ConvexHull(P); V = P[h.vertices]; keep = []
    for i in range(len(V)):
        a, b, c = V[i - 1], V[i], V[(i + 1) % len(V)]
        t = math.degrees(math.atan2(cr(b - a, c - b), np.dot(b - a, c - b)))
        if abs(t) > thr: keep.append((round(b[0], 2), round(b[1], 2), round(180 - abs(t))))
    return keep, h.volume
for phi in (30, 60):
    for codes in itertools.product(range(4), repeat=2):
        V = koch_curve(apex(phi), codes, 16); P = np.stack([V.real, V.imag], 1)
        k, area = corners(P)
        print(phi, codes, 'hull area %.3f' % area, 'corners', k)
