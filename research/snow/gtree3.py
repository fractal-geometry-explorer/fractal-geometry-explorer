exec(open('gtree2.py').read().replace("print(len(inked), sorted(inked))", ""))
def tolat(z):
    X = 648 + z.real * 474; Y = 470 - z.imag * 474
    j = (470 - Y) / (h * math.sqrt(3) / 2); i = (X - 648) / h - j / 2
    return (round(i), round(j)), abs(i - round(i)) + abs(j - round(j))
def seglat(p, q):
    (a, ea), (b, eb) = tolat(p), tolat(q)
    return tuple(sorted([a, b])), ea + eb
inkset = set(tuple(sorted(e)) for e in inked)
best = []
for codes in itertools.product(range(4), repeat=7):
    segs = []
    for (p, q), c in zip(links, codes): segs += place_links(links, p, q, c)
    L = [seglat(p, q) for p, q in segs]
    if max(e for _, e in L) > 0.05: continue
    S2 = set(s for s, _ in L)
    best.append((len(inkset - S2), len(S2 - inkset), codes))
best.sort(); print(len(best), best[:6])
