import numpy as np, itertools, math, random
r3 = math.sqrt(3)
def pol(L, a): return L * complex(math.cos(math.radians(a)), math.sin(math.radians(a)))
steps = [pol(1/3, 60), pol(1/3, 60), pol(1/3, 0), pol(1/3, -60), pol(1/r3, 210), pol(1/3, 0), pol(1/3, 0)]
S = [0j]
for s in steps: S.append(S[-1] + s)
S = np.array(S)
F = (1 - np.conj(S))[::-1]
O = (1, 3, 3, 3, 2, 1, 3)
OF_mirror = tuple(c ^ 3 for c in O[::-1])       # decoration carried along by the mirror image
def curve(seq, codesS, codesF):
    out = [0j]
    def rec(a, b, m, rev, d):
        if d == len(seq): out.append(a if rev else b); return
        G, cods = (S, codesS) if seq[d] == 'S' else (F, codesF)
        g = np.conj(G) if m else G
        P = a + (b - a) * g; kids = []
        for k in range(len(G) - 1):
            cc = cods[k]; cm = m ^ (cc & 1); cr = 1 if cc >= 2 else 0
            kids.append((P[k + 1], P[k], cm, 1) if cr else (P[k], P[k + 1], cm, 0))
        for (x, y, cm, cr) in (kids if not rev else kids[::-1]): rec(x, y, cm, rev ^ cr, d + 1)
    rec(0j, 1 + 0j, 0, 0, 0)
    return np.array(out)
def check(P):
    q = [(round(z.real * 1e7), round(z.imag * 1e7)) for z in P]
    from collections import Counter
    vc = Counter(q); dupv = sum(1 for c in vc.values() if c > 1)
    # proper crossings among segments (brute force on a grid hash)
    segs = list(zip(P[:-1], P[1:]))
    cross = 0
    L = np.abs(P[1:] - P[:-1]).max()
    from collections import defaultdict
    grid = defaultdict(list); h = L
    for i, (a, b) in enumerate(segs):
        for gx in range(int(math.floor(min(a.real, b.real) / h)), int(math.floor(max(a.real, b.real) / h)) + 1):
            for gy in range(int(math.floor(min(a.imag, b.imag) / h)), int(math.floor(max(a.imag, b.imag) / h)) + 1):
                grid[(gx, gy)].append(i)
    def cr(o, a, b): return (a - o).real * (b - o).imag - (a - o).imag * (b - o).real
    seen = set()
    for cell in grid.values():
        for ii in range(len(cell)):
            for jj in range(ii + 1, len(cell)):
                i, j = cell[ii], cell[jj]
                if abs(i - j) <= 1 or (i, j) in seen: continue
                seen.add((i, j))
                a, b = segs[i]; c, d = segs[j]
                d1, d2, d3, d4 = cr(a, b, c), cr(a, b, d), cr(c, d, a), cr(c, d, b)
                if d1 * d2 < -1e-12 and d3 * d4 < -1e-12: cross += 1
    return dupv, cross
random.seed(1)
for name, cF in (('F codes = O', O), ('F codes = mirrored decoration', OF_mirror)):
    for seq in ['SSSS', 'FFFF', 'SFSF', 'FSFS', 'SSFF', ''.join(random.choice('SF') for _ in range(4)), 'SFFS']:
        P = curve(seq, O, cF)
        print(name, seq, 'repeated vertices, crossings:', check(P))
