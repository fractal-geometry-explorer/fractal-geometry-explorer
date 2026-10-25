import numpy as np, itertools, math
from PIL import Image, ImageDraw
FG = '/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/fgn/'
c = complex(0.5, math.sqrt(3) / 6); t = complex(0.5, math.sqrt(3) / 2)
links = [(0j, c), (c, 1 + 0j), (c, t)]
def place(p, q, a, b, code):
    if code & 1: p, q = np.conj(p), np.conj(q)
    if code & 2: p, q = 1 - p, 1 - q
    return (a + (b - a) * p, a + (b - a) * q)
def stage(codes, n):
    segs = [(0j, 1 + 0j)]
    for _ in range(n):
        segs = [place(p, q, a, b, cc) for (a, b) in segs for cc, (p, q) in zip(codes, links)]
    return segs
def stats(segs):
    key = lambda z: (round(z.real * 1e6), round(z.imag * 1e6))
    E = set(tuple(sorted((key(p), key(q)))) for p, q in segs); V = set(v for e in E for v in e)
    par = {v: v for v in V}
    def f(x):
        while par[x] != x: par[x] = par[par[x]]; x = par[x]
        return x
    for a, b in E: par[f(a)] = f(b)
    return len(segs), len(E), len(E) - len(V) + len(set(f(v) for v in V))
res = []
for c1 in (1, 3):
    for c2 in (0, 2):
        for c3 in range(4):
            s = stats(stage((c1, c2, c3), 6))
            res.append((s, (c1, c2, c3)))
for r in res: print(r)
