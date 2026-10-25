exec(open('gtree3.py').read().split("best = []")[0])
from collections import Counter
root = {(0, 0), (7, 0)}
def clip(S2, k):
    S2 = set(S2)
    for _ in range(k):
        deg = Counter(v for e in S2 for v in e)
        S2 = set(e for e in S2 if not any(deg[v] == 1 and v not in root for v in e))
    return S2
for k in (1, 2, 3):
    res = []
    for codes in itertools.product(range(4), repeat=7):
        segs = []
        for (p, q), c in zip(links, codes): segs += place_links(links, p, q, c)
        L = [seglat(p, q) for p, q in segs]
        if max(e for _, e in L) > 0.05: continue
        S2 = set(s for s, _ in L); C2 = clip(S2, k)
        res.append((len(inkset ^ C2), len(S2), codes))
    res.sort(); print(k, res[:4])
