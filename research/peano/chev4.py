exec(open('chev3.py').read().split('best = []')[0])
CH = [(c['A'][0] - 1j * c['A'][1], c['B'][0] - 1j * c['B'][1], c['L']) for c in comps]
def score(W):
    # segments of the mapped teragon, indexed by midpoint
    M = (W[:-1] + W[1:]) / 2
    tr = cKDTree(np.stack([M.real, M.imag], 1))
    ok = 0
    for a, b, L in CH:
        m = (a + b) / 2
        d, j = tr.query([m.real, m.imag])
        if d < 0.08 * L:
            p, q = W[j], W[j + 1]
            if min(abs(p - a) + abs(q - b), abs(p - b) + abs(q - a)) < 0.12 * L: ok += 1
    return ok
best = []
for phi in (30,):
    for n in range(4, 12):
        V = np.array(curve(apex(phi), [1, 3], n))
        segL = np.abs(np.diff(V)); Lmax = segL.max()
        for i in range(len(V) - 1):
            if segL[i] < 0.5 * Lmax: continue
            for (p, q) in ((V[i], V[i + 1]), (V[i + 1], V[i])):
                for (pa, pb) in ((a0, b0), (b0, a0)):
                    s = (pb - pa) / (q - p); t = pa - s * p
                    best.append((score(s * V + t), n, i, 'pres', (p, q, pa, pb)))
                    s2 = (pb - pa) / (np.conj(q) - np.conj(p)); t2 = pa - s2 * np.conj(p)
                    best.append((score(s2 * np.conj(V) + t2), n, i, 'mirr', (p, q, pa, pb)))
best.sort(key=lambda x: -x[0])
print('chevrons', len(CH))
for b in best[:6]: print(b[:4])
import pickle; pickle.dump(best[:6], open('/tmp/claude-0/-home-claude/e985efa0-cfaa-56f9-bff2-b4d1c77b38cc/scratchpad/code/peano/best.pkl', 'wb'))
