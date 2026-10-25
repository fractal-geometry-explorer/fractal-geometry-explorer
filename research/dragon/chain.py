import pickle, numpy as np, cmath, math
comps = [c for c in pickle.load(open('p67comps.pkl', 'rb')) if c['size'] > 300]
Z = [(complex(c['A'][0], -c['A'][1]), complex(c['B'][0], -c['B'][1]), c['L']) for c in comps]
n = len(Z)
# link tips that coincide
ends = []
for i, (a, b, L) in enumerate(Z): ends += [(i, 0, a), (i, 1, b)]
links = {}
for x in range(len(ends)):
    for y in range(x + 1, len(ends)):
        i, ei, p = ends[x]; j, ej, q = ends[y]
        if i != j and abs(p - q) < 0.08 * min(Z[i][2], Z[j][2]) + 8:
            links.setdefault((i, ei), []).append((j, ej)); links.setdefault((j, ej), []).append((i, ei))
deg = {}
for k, v in links.items(): deg[k] = len(v)
print('tips', 2 * n, 'linked tips', len(links), 'multi-linked', sum(1 for v in links.values() if len(v) > 1))
# walk chains
seen = set(); chains = []
for i in range(n):
    if i in seen: continue
    # go to one end
    cur, end = i, 0
    for _ in range(n):
        nb = links.get((cur, end), [])
        if len(nb) != 1 or nb[0][0] in seen and False: break
        j, ej = nb[0]
        if j == i: break
        cur, end = j, 1 - ej
        if cur == i: break
    # now walk forward from cur, leaving through the other end
    chain = []; c, e = cur, end
    while True:
        chain.append((c, 1 - e)); seen.add(c)   # traversed from tip e to tip 1-e
        nb = links.get((c, 1 - e), [])
        if len(nb) != 1: break
        j, ej = nb[0]
        if j in seen: break
        c, e = j, ej
    chains.append(chain)
chains.sort(key=len, reverse=True)
print('chain lengths', [len(c) for c in chains[:12]])
def vec(c, out_end):
    a, b, L = Z[c]; return (b - a) if out_end == 1 else (a - b)
best = chains[0]
V = [vec(c, e) for c, e in best]
print('longest chain: lengths', [round(abs(v)) for v in V])
print('turn ratios (|v2/v1|, angle):', [(round(abs(V[k + 1] / V[k]), 3), round(math.degrees(cmath.phase(V[k + 1] / V[k])), 1)) for k in range(len(V) - 1)])
pickle.dump((Z, chains), open('chains.pkl', 'wb'))
