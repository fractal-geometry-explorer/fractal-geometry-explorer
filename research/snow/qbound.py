import numpy as np
from collections import Counter
u = (1 + 2j) / 5; v = (2 - 1j) / 5
Q = [0, u, 2 * u, 2 * u + v, u + v, 1 + 0j]
codes = (2, 0, 0, 2, 0)
key = lambda z: (round(z.real * 1e6), round(z.imag * 1e6))
edges = []
for k in range(5):
    p, q = Q[k], Q[k + 1]; m = codes[k] & 1; rev = codes[k] >> 1
    if rev: p, q = q, p
    s = -1 if m else 1
    d = (q - p) * 1j * s
    sq = [p, q, q + d, p + d]
    for a, b in zip(sq, sq[1:] + sq[:1]): edges.append((a, b))
cnt = Counter(tuple(sorted((key(a), key(b)))) for a, b in edges)
outer = [(a, b) for a, b in edges if cnt[tuple(sorted((key(a), key(b))))] == 1]
print(len(edges), 'outer', len(outer))
for a, b in outer: print(np.round(a, 3), '->', np.round(b, 3))
