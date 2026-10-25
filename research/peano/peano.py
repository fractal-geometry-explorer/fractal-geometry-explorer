import numpy as np
from matplotlib.path import Path
G = [(0,0),(1,0),(1,1),(2,1),(2,0),(1,0),(1,-1),(2,-1),(2,0),(3,0)]   # Peano generator on [0,3], y to the left of travel
def island(n):
    P = [(0,0),(1,0),(1,1),(0,1)]
    P = [(x * 3**n, y * 3**n) for x, y in P]
    for _ in range(n):
        Q = []
        m = len(P)
        for i in range(m):
            ax, ay = P[i]; bx, by = P[(i+1) % m]
            dx, dy = (bx-ax)//3, (by-ay)//3
            for gx, gy in G[:-1]:
                Q.append((ax + dx*gx - dy*gy, ay + dy*gx + dx*gy))
        P = Q
    return P
def winding_cells(n):
    P = island(n); N = 3**n
    path = Path(np.array(P, float))
    lo = -N//2 - 1; hi = N + N//2 + 1
    xs, ys = np.meshgrid(np.arange(lo, hi), np.arange(lo, hi))
    C = np.stack([xs.ravel() + 0.5, ys.ravel() + 0.5], 1)
    # nonzero winding via matplotlib contains_points uses even-odd? use radius trick: compute winding number directly
    V = np.array(P + [P[0]], float)
    wn = np.zeros(len(C))
    for k in range(len(V) - 1):
        (x0, y0), (x1, y1) = V[k], V[k+1]
        up = (y0 <= C[:,1]) & (y1 > C[:,1]); dn = (y0 > C[:,1]) & (y1 <= C[:,1])
        cross = (x1 - x0) * (C[:,1] - y0) - (C[:,0] - x0) * (y1 - y0)
        wn += np.where(up & (cross > 0), 1, 0) - np.where(dn & (cross < 0), 1, 0)
    return xs.ravel(), ys.ravel(), wn, N
for n in (1, 2, 3):
    X, Y, wn, N = winding_cells(n)
    land = wn != 0
    print('stage', n, 'cells', land.sum(), 'expected', 9**n, 'winding values', sorted(set(wn.astype(int))))
    cx = (X + 0.5) / N; cy = (Y + 0.5) / N
    diamond = np.abs(cx - 0.5) + np.abs(cy - 0.5) < 1
    par = (X + Y) % 2
    for p0 in (0, 1):
        rule = diamond & (par == p0)
        print('   parity', p0, 'rule matches', (rule == land).all(), 'mismatches', (rule != land).sum())
