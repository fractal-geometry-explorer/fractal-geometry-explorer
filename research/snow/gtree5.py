exec(open('gtree3.py').read().split("best = []")[0])
from collections import Counter
root = {(0, 0), (7, 0)}
res = []
for codes in itertools.product(range(4), repeat=7):
    segs = []
    for (p, q), c in zip(links, codes): segs += place_links(links, p, q, c)
    L = [seglat(p, q) for p, q in segs]
    if max(e for _, e in L) > 0.05: continue
    S2 = set(s for s, _ in L)
    deg = Counter(v for e in S2 for v in e)
    clipped = set(e for e in S2 if not any(deg[v] == 1 and v not in root for v in e))
    res.append((len(inkset ^ clipped), len(inkset - clipped), len(clipped - inkset), len(S2), codes))
res.sort(); print(res[:6])
print('inked', len(inkset))
