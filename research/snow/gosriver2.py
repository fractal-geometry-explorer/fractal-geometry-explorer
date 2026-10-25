exec(open('gosriver.py').read().split("for n in (2, 3, 4):")[0])
def tri_side(t, curve, P):
    pass
for n in (2, 3, 4, 5):
    P = flowsnake(n); V = set(P); idx = {p: k for k, p in enumerate(P)}
    curve = set(tuple(sorted((P[k], P[k + 1]))) for k in range(len(P) - 1))
    # all lattice triangles with 3 visited vertices: up (v, v+e1, v+e2) and down (v, v+e1, v+e1-e2... ) use (v, v+(1,0), v+(0,1)) and (v, v+(1,0), v+(1,-1))
    tris = []
    for (x, y) in V:
        for t in (((x, y), (x + 1, y), (x, y + 1)), ((x, y), (x + 1, y), (x + 1, y - 1))):
            if all(p in V for p in t): tris.append(tuple(sorted(t)))
    E = lambda a, b: tuple(sorted((a, b)))
    ncurve = Counter(sum(E(t[i], t[j]) in curve for i, j in ((0, 1), (1, 2), (0, 2))) for t in tris)
    # dual edges across unused shared edges
    byedge = defaultdict(list)
    for t in tris:
        for i, j in ((0, 1), (1, 2), (0, 2)): byedge[E(t[i], t[j])].append(t)
    dual = [(ts[0], ts[1]) for e, ts in byedge.items() if len(ts) == 2 and e not in curve]
    Vs = set(t for d in dual for t in d) | set(tris); par = {v: v for v in Vs}
    def f(x):
        while par[x] != x: par[x] = par[par[x]]; x = par[x]
        return x
    for a, b in dual: par[f(a)] = f(b)
    comps = len(set(f(v) for v in Vs))
    print(n, 'triangles', len(tris), 'curve edges per triangle', dict(ncurve), 'dual edges', len(dual), 'components', comps, 'cycles', len(dual) - len(Vs) + comps)
