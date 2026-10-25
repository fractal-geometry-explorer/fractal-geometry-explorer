exec(open('gtree.py').read().split("im = Image.open")[0])
from collections import defaultdict
def tree_stage(codes, n):
    segs = [(0j, 1 + 0j)]
    for _ in range(n):
        new = []
        for (p, q) in segs:
            for c, (a, b) in zip(codes, links):
                new += place_links([(a, b)], p, q, c)
        segs = new
    return segs
def stats(segs):
    key = lambda z: (round(z.real * 1e6), round(z.imag * 1e6))
    E = set(tuple(sorted((key(p), key(q)))) for p, q in segs)
    V = set(v for e in E for v in e)
    # components
    par = {v: v for v in V}
    def f(x):
        while par[x] != x: par[x] = par[par[x]]; x = par[x]
        return x
    for a, b in E: par[f(a)] = f(b)
    comps = len(set(f(v) for v in V))
    return len(segs), len(E), len(V), len(E) - len(V) + comps
for codes in [(3, 1, 3, 1, 3, 3, 1), (1, 3, 1, 3, 1, 1, 3)]:
    for n in (1, 2, 3, 4):
        print(codes, n, 'links, distinct, vertices, cycles:', stats(tree_stage(codes, n)))
