exec(open('gtree3.py').read().split("best = []")[0])
from collections import Counter, defaultdict
root = {(0, 0), (7, 0)}
def strip_first_order(S2):
    adj = defaultdict(set)
    for a, b in S2: adj[a].add(b); adj[b].add(a)
    removed = set()
    for v in list(adj):
        if len(adj[v]) == 1 and v not in root:
            prev, cur = None, v
            while True:
                nb = [x for x in adj[cur] if x != prev]
                if len(adj[cur]) > 2 or cur in root or (prev is not None and len(adj[cur]) != 2): break
                if not nb: break
                nxt = nb[0]; removed.add(tuple(sorted((cur, nxt)))); prev, cur = cur, nxt
    return set(S2) - removed
res = []
for codes in itertools.product(range(4), repeat=7):
    segs = []
    for (p, q), c in zip(links, codes): segs += place_links(links, p, q, c)
    L = [seglat(p, q) for p, q in segs]
    if max(e for _, e in L) > 0.05: continue
    S2 = set(s for s, _ in L)
    res.append((len(inkset ^ strip_first_order(S2)), len(S2), codes))
res.sort(); print(res[:6])
