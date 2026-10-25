import numpy as np, math
from collections import defaultdict, Counter
def flowsnake(n):
    s = 'A'
    for _ in range(n): s = ''.join({'A': 'A-B--B+A++AA+B-', 'B': '+A-BB--B-A++A+B'}.get(c, c) for c in s)
    # lattice coords (i, j) with e1 = (1,0), e2 = (1/2, √3/2); directions d0..d5
    D = [(1, 0), (0, 1), (-1, 1), (-1, 0), (0, -1), (1, -1)]
    x = y = h = 0; pts = [(0, 0)]
    for c in s:
        if c == '+': h = (h + 1) % 6
        elif c == '-': h = (h - 1) % 6
        else: x += D[h][0]; y += D[h][1]; pts.append((x, y))
    return pts
D = [(1, 0), (0, 1), (-1, 1), (-1, 0), (0, -1), (1, -1)]
for n in (2, 3, 4):
    P = flowsnake(n); V = set(P)
    assert len(V) == len(P), 'not self-avoiding'
    curve = set(tuple(sorted((P[k], P[k + 1]))) for k in range(len(P) - 1))
    # side of each curve edge's two triangles: triangle (a, b, c) where c = third vertex; left if cross > 0
    side = {}   # triangle (sorted vertices) -> 'L' or 'R'
    def tri(a, b, c): return tuple(sorted((a, b, c)))
    def cross(a, b, c):
        ax, ay = a[0] + a[1] / 2, a[1] * math.sqrt(3) / 2; bx, by = b[0] + b[1] / 2, b[1] * math.sqrt(3) / 2; cx, cy = c[0] + c[1] / 2, c[1] * math.sqrt(3) / 2
        return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
    conflict = 0
    for k in range(len(P) - 1):
        a, b = P[k], P[k + 1]; dx, dy = b[0] - a[0], b[1] - a[1]; h = D.index((dx, dy))
        for c in [(a[0] + D[(h + 1) % 6][0], a[1] + D[(h + 1) % 6][1]), (a[0] + D[(h - 1) % 6][0], a[1] + D[(h - 1) % 6][1])]:
            t = tri(a, b, c); s = 'L' if cross(a, b, c) > 0 else 'R'
            if t in side and side[t] != s: conflict += 1
            side[t] = s
    # unused edges between visited vertices
    unused = set()
    for v in V:
        for dx, dy in D[:3]:
            w = (v[0] + dx, v[1] + dy)
            if w in V and tuple(sorted((v, w))) not in curve: unused.add(tuple(sorted((v, w))))
    cls = Counter(); bad = 0; edge_side = {}
    for a, b in unused:
        sides = []
        dx, dy = b[0] - a[0], b[1] - a[1]; h = D.index((dx, dy))
        for c in [(a[0] + D[(h + 1) % 6][0], a[1] + D[(h + 1) % 6][1]), (a[0] + D[(h - 1) % 6][0], a[1] + D[(h - 1) % 6][1])]:
            t = tri(a, b, c)
            if t in side: sides.append(side[t])
        s = set(sides)
        if len(s) == 1: edge_side[(a, b)] = s.pop(); cls[edge_side[(a, b)]] += 1
        else: bad += 1; cls['?' + ''.join(sorted(s))] += 1
    def cyc(E):
        Vs = set(v for e in E for v in e); par = {v: v for v in Vs}
        def f(x):
            while par[x] != x: par[x] = par[par[x]]; x = par[x]
            return x
        for a, b in E: par[f(a)] = f(b)
        comps = len(set(f(v) for v in Vs)); return len(E), len(Vs), comps, len(E) - len(Vs) + comps
    L = [e for e, s in edge_side.items() if s == 'L']; R = [e for e, s in edge_side.items() if s == 'R']
    print(n, 'curve', len(curve), 'unused', len(unused), dict(cls), 'conflict', conflict, 'L (E,V,comp,cycles)', cyc(L), 'R', cyc(R))
