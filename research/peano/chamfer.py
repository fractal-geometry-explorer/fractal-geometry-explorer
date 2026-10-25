from peano import island
import numpy as np
def chamfer(P, c):
    m = len(P); out = []
    for i in range(m):
        a = np.array(P[i-1], float); v = np.array(P[i], float); b = np.array(P[(i+1) % m], float)
        d1 = v - a; d2 = b - v
        if d1[0]*d2[1] - d1[1]*d2[0] == 0: out.append(tuple(v)); continue   # straight on
        out.append(tuple(v - d1 * c)); out.append(tuple(v + d2 * c))
    return out
def area(P):
    s = 0
    for i in range(len(P)):
        x0, y0 = P[i]; x1, y1 = P[(i+1) % len(P)]; s += x0*y1 - x1*y0
    return s / 2
def crossings(P):
    m = len(P); cell = 1.0; grid = {}
    segs = [(P[i], P[(i+1) % m]) for i in range(m)]
    for i, (a, b) in enumerate(segs):
        for gx in range(int(np.floor(min(a[0], b[0]))), int(np.floor(max(a[0], b[0]))) + 1):
            for gy in range(int(np.floor(min(a[1], b[1]))), int(np.floor(max(a[1], b[1]))) + 1):
                grid.setdefault((gx, gy), []).append(i)
    def cr(o, a, b): return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
    bad = set()
    for lst in grid.values():
        for ii in range(len(lst)):
            for jj in range(ii+1, len(lst)):
                i, j = lst[ii], lst[jj]
                if abs(i - j) <= 1 or {i, j} == {0, m-1}: continue
                (a, b), (c, d) = segs[i], segs[j]
                d1, d2, d3, d4 = cr(a, b, c), cr(a, b, d), cr(c, d, a), cr(c, d, b)
                if ((d1 > 1e-12 and d2 < -1e-12) or (d1 < -1e-12 and d2 > 1e-12)) and ((d3 > 1e-12 and d4 < -1e-12) or (d3 < -1e-12 and d4 > 1e-12)): bad.add((i, j))
                elif min(abs(d1), abs(d2), abs(d3), abs(d4)) < 1e-12:
                    # touching
                    def on(p, q, r): return abs(cr(p, q, r)) < 1e-12 and min(p[0], q[0]) - 1e-12 <= r[0] <= max(p[0], q[0]) + 1e-12 and min(p[1], q[1]) - 1e-12 <= r[1] <= max(p[1], q[1]) + 1e-12
                    if on(a, b, c) or on(a, b, d) or on(c, d, a) or on(c, d, b): bad.add((i, j))
    return len(bad)
for n in (1, 2, 3, 4):
    P = island(n); N = 3**n
    for c in (0.25, 0.3):
        Q = chamfer(P, c)
        print('stage', n, 'chamfer', c, 'vertices', len(Q), 'area/N^2', round(area(Q) / N**2, 6), 'crossings/touches', crossings(Q) if n <= 3 else 'skip')
