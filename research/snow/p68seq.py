exec(open('p68fit2.py').read().split("MXg = ")[0])
import itertools
cands = {'D13^4': [D13] * 4}
for seq in itertools.product('SF', repeat=4):
    cands['G:' + ''.join(seq)] = [G13 if c == 'S' else mirror(G13) for c in seq]
res = []
for name, gens in cands.items():
    best = max((corr(render(gens, x0 + dx, 892 + dy, sc * k)), dx, dy, k) for dx in (-3,) for dy in (0,) for k in (1.005,))
    res.append((round(best[0], 4), name))
res.sort(reverse=True); print(res[:8])
