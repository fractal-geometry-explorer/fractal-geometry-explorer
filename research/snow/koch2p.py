import numpy as np, math, itertools
r3 = math.sqrt(3)
hexa = [0j, complex(0.5, -r3 / 6), 1 + 0j, complex(1, r3 / 3), complex(0.5, r3 / 2), complex(0, r3 / 3)]   # CCW tips
def step(P, first):
    out = []
    m = len(P)
    for k in range(m):
        a, b = P[k], P[(k + 1) % m]
        s = first if k % 2 == 0 else -first
        mid = (a + b) / 2 + (b - a) * 1j * s / (2 * r3)
        out += [a, mid]
    return out
def koch_std(n):
    tri = [0j, 1 + 0j, complex(0.5, r3 / 2)]  # CCW
    P = tri
    for _ in range(n):
        Q = []
        for k in range(len(P)):
            a, b = P[k], P[(k + 1) % len(P)]; d = (b - a) / 3
            Q += [a, a + d, a + d + d * complex(0.5, -r3 / 2), a + 2 * d]   # outward = right of CCW travel
        P = Q
    return P
K = lambda P: set((round(z.real, 6), round(z.imag, 6)) for z in P)
for f1 in (1, -1):
    for f2 in (1, -1):
        P = step(step(hexa, f1), f2)
        print(f1, f2, len(P), 'equals Koch stage 2:', K(P) == K(koch_std(2)), ' stage1 hexagram==Koch1:', K(step(hexa, f1)) == K(koch_std(1)))
def step2(P, pat):
    out = []; m = len(P)
    for k in range(m):
        a, b = P[k], P[(k + 1) % m]
        s = {'u+': 1, 'u-': -1, 'a+': 1 if k % 2 == 0 else -1, 'a-': -1 if k % 2 == 0 else 1}[pat]
        out += [a, (a + b) / 2 + (b - a) * 1j * s / (2 * r3)]
    return out
pats = ['u+', 'u-', 'a+', 'a-']
for p1 in pats:
    if K(step2(hexa, p1)) != K(koch_std(1)): continue
    for p2 in pats:
        for p3 in pats:
            if K(step2(step2(step2(hexa, p1), p2), p3)) == K(koch_std(2)): print('match', p1, p2, p3)
