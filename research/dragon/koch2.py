import itertools
exec(open('koch.py').read().split("target4 =")[0])
target4 = [(0,0),(.25,0),(.25,.25),(.25,.5),(0,.5),(0,.75),(.25,.75),(.5,.75),(.5,.5),(.5,.75),(.75,.75),(1,.75),(1,.5),(.75,.5),(.75,.25),(.75,0),(1,0)]
T4 = [complex(x, y) for x, y in target4]
T = {4: T4, 3: T4[::2], 2: T4[::4], 1: T4[::8]}
codesets = list(itertools.product(itertools.product((0, 1), (0, 1)), repeat=2))
opts = [(s, c) for s in (1, -1) for c in codesets]
sols = []
def dfs(prefix):
    k = len(prefix)
    if k == 4: sols.append(list(prefix)); return
    for o in opts:
        rule = lambda j, pr=prefix + [o]: pr[j - 1]
        pts, _ = build(rule, k + 1)
        if all(abs(p - t) < 1e-9 for p, t in zip(pts, T[k + 1])): dfs(prefix + [o])
dfs([])
print('solutions', len(sols))
for s in sols[:12]: print(s)
