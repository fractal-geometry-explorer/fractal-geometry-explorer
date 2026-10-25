import pickle, numpy as np, cmath, math, itertools
exec(open('p67fit2.py').read().split('def fit(V):')[0].replace("exec(open('p67fit.py').read().split('results = []')[0])", "exec(open('trap.py').read().split('ims = []')[0])"))
Z, chains = pickle.load(open('chains.pkl', 'rb'))
def vec(c, e):
    a, b, L = Z[c]; return (b - a) if e == 1 else (a - b)
pats = []
for ch in chains[:4]:
    V = [vec(c, e) for c, e in ch]
    pats.append(np.array([V[k + 1] / V[k] for k in range(len(V) - 1)]))
def matches(V, pat):
    R = V[1:] / V[:-1]; m = len(pat); hits = 0
    for P in (pat, np.conj(pat), 1 / pat[::-1], np.conj(1 / pat[::-1])):
        for s in range(len(R) - m + 1):
            w = R[s:s + m]
            if np.all(np.abs(np.log(np.abs(w) / np.abs(P))) < 0.12) and np.all(np.abs(np.angle(w / P)) < math.radians(8)): return True
    return False
res = []
cands = []
for phi in (29.3, 30, 60, 60.7):
    for codes in itertools.product(range(4), repeat=2):
        cands.append((('koch', phi, codes), lambda n, phi=phi, codes=codes: koch_curve(apex(phi), codes, n)))
    for flags in itertools.product((False, True), repeat=3):
        cands.append((('sweep', phi, flags), lambda n, phi=phi, flags=flags: (lambda s: np.array([s[0][0]] + [x[1] for x in s]))(gen_sweep(apex(phi), n, *flags))))
for name, f in cands:
    for n in (9, 11):
        V = f(n)
        ok = [matches(V, p) for p in pats]
        if ok[0]: res.append((sum(ok), name, n))
res.sort(key=lambda r: -r[0])
print(len(res), 'candidates match the longest chain'); print(res[:15])
