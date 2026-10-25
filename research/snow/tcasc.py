import numpy as np, itertools, math
def child_maps(links, codes):
    out = []
    for (p, q), c in zip(links, codes):
        a, b = (q, p) if c & 2 else (p, q)
        out.append((b - a, a, c & 1))
    return out
def comp(f, g):
    A1, B1, m1 = f; A2, B2, m2 = g
    if m1: A2, B2 = np.conj(A2), np.conj(B2)
    return (A1 * A2, A1 * B2 + B1, m1 ^ m2)
def cascade(links, codes, n):
    G = child_maps(links, codes); maps = [(1 + 0j, 0j, 0)]
    for _ in range(n): maps = [comp(f, g) for f in maps for g in G]
    return [(f[1], f[0] + f[1]) for f in maps]     # segment f(0) -> f(1)
def stats(segs):
    key = lambda z: (round(z.real * 1e6), round(z.imag * 1e6))
    E = set(tuple(sorted((key(p), key(q)))) for p, q in segs); V = set(v for e in E for v in e)
    par = {v: v for v in V}
    def f(x):
        while par[x] != x: par[x] = par[par[x]]; x = par[x]
        return x
    for a, b in E: par[f(a)] = f(b)
    comps = len(set(f(v) for v in V))
    return len(segs), len(E), comps, len(E) - len(V) + comps
