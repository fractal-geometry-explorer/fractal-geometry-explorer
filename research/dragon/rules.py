import itertools
from fractions import Fraction as Fr
# exact arithmetic with Gaussian rationals: represent points as (x, y) Fractions
def build(rules, n, start=(Fr(0), Fr(0)), end=(Fr(1), Fr(0))):
    P = [start, end]
    for k in range(1, n + 1):
        a, b = rules[k - 1]
        Q = [P[0]]
        for i in range(len(P) - 1):
            (x0, y0), (x1, y1) = P[i], P[i + 1]
            dx, dy = x1 - x0, y1 - y0
            left = ((a + b * i) % 2) == 0
            # apex of a right isosceles generator: midpoint + (perpendicular)/2
            if left: cx, cy = x0 + (dx - dy) / 2, y0 + (dy + dx) / 2
            else: cx, cy = x0 + (dx + dy) / 2, y0 + (dy - dx) / 2
            Q += [(cx, cy), (x1, y1)]
        P = Q
    return P
def ok(P):
    return len(set(P)) == len(P) and all(0 <= x <= 1 and 0 <= y <= 1 for x, y in P)
opts = [(0, 0), (1, 0), (0, 1), (1, 1)]   # (first position: 0 left, 1 right ; b: 0 same side, 1 alternate)
good = []
for combo in itertools.product(opts, repeat=6):
    P = build(combo, 6)
    if ok(P): good.append(combo)
print('rule sequences giving self-avoiding stage 6 inside the unit square:', len(good))
for g in good[:20]:
    P2 = build(g, 2); print(g, 'stage 2:', [(float(x), float(y)) for x, y in P2])
