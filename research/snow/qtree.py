exec(open('ytree.py').read().split("res = []")[0])
u = (1 + 2j) / 5; v = (2 - 1j) / 5
a = (2 + 1j) / 5; b = (1 - 2j) / 5
F_links = [(0j, u), (u, 2 * u), (2 * u, 2 * u + v), (u, u + v), (u + v, 1 + 0j)]
H_links = [(0j, a), (a, 2 * a), (a, a + b), (a + b, 1 + 0j), (a + b, b)]
def stage_l(L, codes, n):
    segs = [(0j, 1 + 0j)]
    for _ in range(n):
        segs = [place(p, q, x, y, cc) for (x, y) in segs for cc, (p, q) in zip(codes, L)]
    return segs
for name, L in (('F', F_links), ('H', H_links)):
    res = []
    for codes in itertools.product(range(4), repeat=5):
        s = stats(stage_l(L, codes, 4))
        res.append((s[2], -s[1], codes))
    res.sort()
    print(name, 'no overlap & no cycles:', [r for r in res if r[0] == 0 and -r[1] == 625][:12], len([r for r in res if r[0] == 0 and -r[1] == 625]))
    print(name, 'no overlap, fewest cycles:', [r for r in res if -r[1] == 625][:6])
