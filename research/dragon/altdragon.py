import numpy as np
from scipy.spatial import ConvexHull
def alt_dragon(xs):
    P = np.array([0, 1], complex)
    for x in xs:
        a, b = P[:-1], P[1:]
        j = np.arange(len(a))
        right = (j % 2 == 0) == (x == 1)
        s = np.where(right, 1 - 1j, 1 + 1j) / 2
        c = a + (b - a) * s
        Q = np.empty(2 * len(a) + 1, complex); Q[0::2] = P; Q[1::2] = c; P = Q
    return P
for name, xs in [('dragon', [1] * 16), ('alt10', [1, 0] * 8), ('alt01', [0, 1] * 8)]:
    P = alt_dragon(xs); Q = np.stack([P.real, P.imag], 1); h = ConvexHull(Q)
    # self-overlap: count repeated edges
    e = set(); dup = 0
    for a, b in zip(P[:-1], P[1:]):
        k = (round(min(a.real, b.real), 6), round(min(a.imag, b.imag), 6), round(max(a.real, b.real), 6), round(max(a.imag, b.imag), 6))
        dup += k in e; e.add(k)
    print(name, 'hull area', round(h.volume, 4), 'hull pts', np.round(Q[h.vertices][:8], 3).tolist(), 'dup edges', dup)
