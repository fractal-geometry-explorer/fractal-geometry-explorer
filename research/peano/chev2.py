exec(open('chev.py').read().split('for c in comps[:40]:')[0])
import numpy as np
res = []
for c in comps[:26]:
    A, B, C = c['A'], c['B'], c['C']
    if np.hypot(*(C - A)) > np.hypot(*(C - B)): A, B = B, A        # short arm first
    k = [i for i, cc in enumerate(comps) if cc is c][0]
    ys, xs = np.nonzero(lab == np.argsort(sizes)[::-1][k] + 1)
    P = np.stack([xs, ys], 1).astype(float)
    L = np.hypot(*(B - A)); u = (B - A) / L; nrm = np.array([-u[1], u[0]])
    if (C - A) @ nrm < 0: nrm = -nrm
    X = (P - A) @ u / L; Y = (P - A) @ nrm / L
    bins = np.linspace(0, 1, 41); outer = []; inner = []
    for i in range(40):
        m = (X >= bins[i]) & (X < bins[i + 1])
        if m.sum(): outer.append((bins[i] + 0.0125, Y[m].max())); inner.append((bins[i] + 0.0125, Y[m].min()))
    outer = np.array(outer); inner = np.array(inner)
    ci = np.argmax(outer[:, 1]); di = np.argmax(inner[:, 1])
    res.append((outer[ci], inner[di]))
res = np.array(res)
print('corner C (x, y) mean', res[:, 0].mean(0).round(3), 'std', res[:, 0].std(0).round(3))
print('inner D (x, y) mean', res[:, 1].mean(0).round(3), 'std', res[:, 1].std(0).round(3))
