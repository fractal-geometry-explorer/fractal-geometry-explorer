exec(open('p69fit.py').read())
disc = np.load('disc_mask.npy')
gens = [D13] * 3
curves = {r: rounded(gens, r) for r in ('toward', 'away')}
res = []
for k in range(8):
    for mir in (0, 1):
        T = mapper(math.radians(-1 + 60 * k), mir)
        for rule, C in curves.items():
            R = render(C, koch_outline(5), 1, T)
            res.append((((R == cls) & disc).sum() / disc.sum(), k * 60, mir, rule))
res.sort(reverse=True); print(res[:6])
