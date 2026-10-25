import pickle, numpy as np, math, cmath, itertools
from scipy.spatial import cKDTree
exec(open('trap.py').read().split('ims = []')[0])
comps = pickle.load(open('p67comps.pkl', 'rb'))
CH = [(c['A'][0] - 1j * c['A'][1], c['B'][0] - 1j * c['B'][1], c['L']) for c in comps if c['size'] > 300]
big = comps[0]; a0 = big['A'][0] - 1j * big['A'][1]; b0 = big['B'][0] - 1j * big['B'][1]
def score(W):
    M = (W[:-1] + W[1:]) / 2; tr = cKDTree(np.stack([M.real, M.imag], 1)); ok = 0
    for a, b, L in CH:
        m = (a + b) / 2; d, j = tr.query([m.real, m.imag])
        if d < 0.08 * L:
            p, q = W[j], W[j + 1]
            if min(abs(p - a) + abs(q - b), abs(p - b) + abs(q - a)) < 0.12 * L: ok += 1
    return ok
results = []
for flags in [(True, False, False), (False, True, True)]:
    for phi in (25, 28, 30, 32, 35, 40):
        for n in (6, 7, 8, 9, 10):
            segs = gen_sweep(apex(phi), n, *flags)
            V = np.array([segs[0][0]] + [s[1] for s in segs])
            segL = np.abs(np.diff(V)); Lmax = segL.max()
            best = (0,)
            for i in np.nonzero(segL > 0.6 * Lmax)[0]:
                for (p, q) in ((V[i], V[i + 1]), (V[i + 1], V[i])):
                    for mir in (False, True):
                        VV = np.conj(V) if mir else V; pp = np.conj(p) if mir else p; qq = np.conj(q) if mir else q
                        s = (b0 - a0) / (qq - pp); t = a0 - s * pp
                        sc = score(s * VV + t)
                        if sc > best[0]: best = (sc, i, mir, p, q)
            results.append((best[0], flags, phi, n, best[1:]))
            print(flags, phi, n, 'matched', best[0], 'of', len(CH), flush=True)
results.sort(key=lambda r: -r[0])
pickle.dump(results[:5], open('p67best.pkl', 'wb'))
print('BEST', [(r[0], r[1], r[2], r[3]) for r in results[:5]])
