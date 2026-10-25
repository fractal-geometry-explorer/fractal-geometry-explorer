exec(open('chev5.py').read().split("im = Image.open")[0])
V7 = np.array(curve(apex(30), [1, 3], n)); s = (pb - pa) / (q - p); t = pa - s * p
res = {}
for nn in (7, 8, 9, 10, 11):
    V = np.array(curve(apex(30), [1, 3], nn)); W = s * V + t
    M = (W[:-1] + W[1:]) / 2; tr = cKDTree(np.stack([M.real, M.imag], 1))
    for k, c in enumerate(comps):
        if k in res: continue
        a = c['A'][0] - 1j * c['A'][1]; b = c['B'][0] - 1j * c['B'][1]
        m = (a + b) / 2; dd, j = tr.query([m.real, m.imag])
        if dd < 0.1 * c['L']:
            p0, q0 = W[j], W[j + 1]
            if min(abs(p0 - a) + abs(q0 - b), abs(p0 - b) + abs(q0 - a)) < 0.15 * c['L']: res[k] = nn
from collections import Counter
print('matched by stage', Counter(res.values()), 'unmatched', len(comps) - len(res))
print('unmatched sizes', sorted([comps[k]['size'] for k in range(len(comps)) if k not in res], reverse=True)[:30])
print('stage of each L class', sorted({(round(comps[k]['L'] / 20) * 20, v) for k, v in res.items()}))
